import type {
	DesktopAssistantTaskCard,
	DesktopAssistantTaskIcon,
	DesktopAssistantTasksResponse,
	DesktopAssistantTriggerSummary,
} from '@n8n/api-types';
import type { ExecutionSummary, INode } from 'n8n-workflow';
import type cronParserTypes from 'cron-parser';

import { DESKTOP_ASSISTANT_TAG } from './constants';

/**
 * Input shape — a minimal projection of the workflow + last execution that
 * the classifier needs. The service layer is responsible for assembling
 * this from `WorkflowRepository`, `ExecutionService`, and the user's
 * accessible credential set.
 */
export interface ClassifierInput {
	workflowId: string;
	name: string;
	active: boolean;
	nodes: INode[];
	tags: Array<{ name: string }>;
	settings?: { timezone?: string };
	lastExecution?: { id: string; status: ExecutionSummary['status']; startedAt: string };
	/** Optional emoji icon stored on a workflow promoted by the desktop assistant. */
	emojiIcon?: string;
	/** Ids of credentials the requesting user can access. Used to flag actionNeeded. */
	accessibleCredentialIds: ReadonlySet<string>;
}

/** Node-type prefixes that count as "runs locally" via computer-use. */
const LOCAL_NODE_TYPE_PREFIXES = ['n8n-nodes-base.computerUse', 'n8n-nodes-base.localFileTrigger'];

const SCHEDULE_TRIGGER_TYPE = 'n8n-nodes-base.scheduleTrigger';
const MANUAL_TRIGGER_TYPE = 'n8n-nodes-base.manualTrigger';
const WEBHOOK_TRIGGER_TYPE = 'n8n-nodes-base.webhook';

const TRIGGER_TYPE_SUFFIXES = ['Trigger', 'trigger'];

/**
 * Loose poll-trigger heuristic. Real polling triggers in `n8n-nodes-base`
 * all end in "Trigger" and are not the schedule/webhook/manual trigger
 * (e.g. `gmailTrigger`, `googleSheetsTrigger`). Used by the classifier
 * to detect "On new X" trigger semantics for description text.
 */
function isPollOrWebhookTrigger(node: INode | undefined): boolean {
	if (!node) return false;
	if (node.type === SCHEDULE_TRIGGER_TYPE || node.type === MANUAL_TRIGGER_TYPE) return false;
	if (node.type === WEBHOOK_TRIGGER_TYPE) return true;
	return TRIGGER_TYPE_SUFFIXES.some((suffix) => node.type.endsWith(suffix));
}

function findFirstTrigger(nodes: INode[]): INode | undefined {
	return nodes.find((node) => {
		if (node.disabled) return false;
		return (
			node.type === SCHEDULE_TRIGGER_TYPE ||
			node.type === MANUAL_TRIGGER_TYPE ||
			node.type === WEBHOOK_TRIGGER_TYPE ||
			TRIGGER_TYPE_SUFFIXES.some((suffix) => node.type.endsWith(suffix))
		);
	});
}

function hasDesktopAssistantTag(tags: Array<{ name: string }>): boolean {
	return tags.some((t) => t.name === DESKTOP_ASSISTANT_TAG);
}

function runsLocally(nodes: INode[]): boolean {
	return nodes.some((node) =>
		LOCAL_NODE_TYPE_PREFIXES.some((prefix) => node.type.startsWith(prefix)),
	);
}

/**
 * Strip the trailing " Trigger" word (case-insensitive) and lowercase the
 * rest, so a node displayName of `"Gmail Trigger"` produces the label
 * `"On new gmail message"`.
 *
 * Exported for unit testing.
 */
export function deriveSourceLabel(displayName: string): string {
	const stripped = displayName.replace(/\s+trigger\s*$/i, '').trim();
	const lower = stripped.toLowerCase();
	return `On new ${lower} message`;
}

/**
 * Translate the first entry of a Schedule Trigger node's `rule.interval`
 * array into a 5-field cron expression. Supports the structured forms n8n's
 * Schedule Trigger UI produces (`field: 'days' | 'weeks' | 'months' | 'hours' | 'cronExpression'`,
 * plus default 'days' when `field` is omitted) and rejects sub-minute
 * granularities (`seconds`/`minutes`) since they're not expressible in
 * 5-field cron and the BFF preview only needs minute-resolution.
 *
 * Returns null when the entry is missing, malformed, or sub-minute.
 */
export function toCronExpression(entry: Record<string, unknown> | undefined): string | null {
	if (!entry) return null;
	const field = typeof entry.field === 'string' ? entry.field : 'days';

	if (field === 'cronExpression') {
		const expr = entry.expression;
		return typeof expr === 'string' && expr.trim().length > 0 ? expr.trim() : null;
	}

	// Sub-minute granularities are not expressible in 5-field cron.
	if (field === 'seconds' || field === 'minutes') return null;

	const minute = typeof entry.triggerAtMinute === 'number' ? entry.triggerAtMinute : 0;
	const hour = typeof entry.triggerAtHour === 'number' ? entry.triggerAtHour : 0;

	if (field === 'hours') {
		const step = typeof entry.hoursInterval === 'number' ? entry.hoursInterval : 1;
		return `${minute} */${step} * * *`;
	}
	if (field === 'days') {
		const step = typeof entry.daysInterval === 'number' ? entry.daysInterval : 1;
		return `${minute} ${hour} */${step} * *`;
	}
	if (field === 'weeks') {
		const weekdays = Array.isArray(entry.triggerAtDayOfWeek)
			? (entry.triggerAtDayOfWeek as unknown[]).filter((d) => typeof d === 'number').join(',')
			: '*';
		return `${minute} ${hour} * * ${weekdays || '*'}`;
	}
	if (field === 'months') {
		const step = typeof entry.monthsInterval === 'number' ? entry.monthsInterval : 1;
		const dayOfMonth =
			typeof entry.triggerAtDayOfMonth === 'number' ? entry.triggerAtDayOfMonth : 1;
		return `${minute} ${hour} ${dayOfMonth} */${step} *`;
	}
	return null;
}

/**
 * Compute the next run time for a schedule trigger node. Supports n8n's
 * structured rule forms (`field: 'days' | 'weeks' | 'months' | 'hours' | 'cronExpression'`)
 * via {@link toCronExpression}. Sub-minute granularities and malformed
 * inputs return null (the classifier treats null as "ambiguous, fall
 * through to no preview").
 *
 * Exported for unit testing.
 */
export function deriveNextRunAt(
	node: INode,
	options: { timezone?: string; now?: Date } = {},
): string | null {
	const rule = node.parameters?.rule;
	if (
		!rule ||
		typeof rule !== 'object' ||
		!('interval' in rule) ||
		!Array.isArray((rule as { interval: unknown[] }).interval)
	) {
		return null;
	}
	const entries = (rule as { interval: Array<Record<string, unknown>> }).interval;
	const expression = toCronExpression(entries[0]);
	if (!expression) return null;

	// Lazy-load: cron-parser is only needed for desktop-assistant tasks
	// classification; avoid pulling it into the boot path for every cli build.
	let cronParser: typeof cronParserTypes;
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		cronParser = require('cron-parser') as typeof cronParserTypes;
	} catch {
		return null;
	}
	try {
		const it = cronParser.parseExpression(expression, {
			currentDate: options.now ?? new Date(),
			tz: options.timezone,
		});
		return it.next().toDate().toISOString();
	} catch {
		return null;
	}
}

function deriveIcon(emojiIcon: string | undefined, nodes: INode[]): DesktopAssistantTaskIcon {
	if (emojiIcon && emojiIcon.length > 0) {
		return { type: 'emoji', value: emojiIcon };
	}
	const firstNonTrigger = nodes.find((node) => {
		if (node.disabled) return false;
		if (node.type === MANUAL_TRIGGER_TYPE) return false;
		if (node.type === SCHEDULE_TRIGGER_TYPE) return false;
		if (node.type === WEBHOOK_TRIGGER_TYPE) return false;
		return !TRIGGER_TYPE_SUFFIXES.some((suffix) => node.type.endsWith(suffix));
	});
	const trigger = findFirstTrigger(nodes);
	const nodeType = firstNonTrigger?.type ?? trigger?.type ?? 'n8n-nodes-base.noOp';
	return { type: 'node', nodeType };
}

function deriveTriggerSummary(
	trigger: INode | undefined,
	settings: ClassifierInput['settings'],
): DesktopAssistantTriggerSummary {
	if (!trigger) return { kind: 'other' };
	if (trigger.type === MANUAL_TRIGGER_TYPE) return { kind: 'manual' };
	if (trigger.type === SCHEDULE_TRIGGER_TYPE) {
		return {
			kind: 'schedule',
			nextRunAt: deriveNextRunAt(trigger, { timezone: settings?.timezone }),
		};
	}
	if (isPollOrWebhookTrigger(trigger)) {
		const kind = trigger.type === WEBHOOK_TRIGGER_TYPE ? 'webhook' : 'poll';
		const displayName = humanizeNodeTypeName(trigger.type);
		return { kind, sourceLabel: deriveSourceLabel(displayName) };
	}
	return { kind: 'other' };
}

/**
 * Derive a display-name-shaped label from a node type id when the real
 * displayName is not available to the classifier (the classifier is pure
 * and has no access to the node types service).
 *
 * `n8n-nodes-base.gmailTrigger` → `Gmail Trigger`.
 */
function humanizeNodeTypeName(nodeType: string): string {
	const tail = nodeType.split('.').pop() ?? nodeType;
	// Split camelCase / PascalCase, capitalise each word
	const words = tail.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/\s+/);
	return words
		.filter((w) => w.length > 0)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

function findMissingCredentialNode(
	input: ClassifierInput,
): { node: INode; serviceName: string } | undefined {
	for (const node of input.nodes) {
		if (node.disabled) continue;
		if (!node.credentials) continue;
		for (const slot of Object.values(node.credentials)) {
			if (!slot) continue;
			// A credential slot is "needs setup" when either:
			//  (a) no id is bound to it (the node was created/imported but no
			//      credential was ever picked), or
			//  (b) the bound id is not accessible to the requesting user (the
			//      credential was deleted, or was unshared from this user).
			// Both block execution and both deserve the same desktop card.
			if (typeof slot.id !== 'string' || slot.id.length === 0) {
				return { node, serviceName: humanizeNodeTypeName(node.type) };
			}
			if (!input.accessibleCredentialIds.has(slot.id)) {
				return { node, serviceName: humanizeNodeTypeName(node.type) };
			}
		}
	}
	return undefined;
}

function deriveDescription(
	bucket: 'actionNeeded' | 'upcoming' | 'readyToRun',
	trigger: INode | undefined,
	summary: DesktopAssistantTriggerSummary,
	missingCredential: { serviceName: string } | undefined,
): string {
	if (bucket === 'actionNeeded') {
		if (missingCredential) {
			// Strip a trailing " Trigger" so we get "Gmail needs credential", not
			// "Gmail Trigger needs credential".
			const service = missingCredential.serviceName.replace(/\s+Trigger\s*$/i, '');
			return `${service} needs credential`;
		}
		return 'Activation required';
	}
	if (bucket === 'upcoming') {
		if (summary.kind !== 'schedule' || summary.nextRunAt === null) {
			return 'Recurring task';
		}
		return `Next run at ${summary.nextRunAt}`;
	}
	// readyToRun
	if (summary.kind === 'poll' || summary.kind === 'webhook') {
		return summary.sourceLabel;
	}
	if (trigger?.type === MANUAL_TRIGGER_TYPE) return '';
	return '';
}

function classifyOne(input: ClassifierInput): {
	bucket: 'actionNeeded' | 'upcoming' | 'readyToRun' | null;
	card: DesktopAssistantTaskCard;
} {
	const trigger = findFirstTrigger(input.nodes);
	const summary = deriveTriggerSummary(trigger, input.settings);
	const tagged = hasDesktopAssistantTag(input.tags);
	const missingCredential = findMissingCredentialNode(input);

	let bucket: 'actionNeeded' | 'upcoming' | 'readyToRun' | null = null;

	const isScheduleOrPoll =
		summary.kind === 'schedule' || summary.kind === 'poll' || summary.kind === 'webhook';

	// Bucketing precedence:
	//  1. Missing credentials block execution regardless of source: a user-built
	//     workflow with an unconfigured Gmail node belongs in actionNeeded just
	//     as much as a desktop-assistant-promoted one.
	//  2. Activation-required is desktop-assistant-only — plenty of user-built
	//     workflows are intentionally inactive (templates, drafts) and shouldn't
	//     be nagged.
	//  3. Active schedule/poll workflows go to upcoming regardless of source.
	//     These have time-based "next run" semantics that are valuable to
	//     surface for the user-built case too. Webhook workflows are kept
	//     tag-gated since they have no time preview and would spam upcoming
	//     with every user-built webhook.
	//  4. Tagged manual-trigger workflows go to readyToRun.
	//  5. Everything else user-built falls through to readyToRun.
	const isTimeBasedRecurring = summary.kind === 'schedule' || summary.kind === 'poll';
	if (missingCredential) {
		bucket = 'actionNeeded';
	} else if (tagged && !input.active && isScheduleOrPoll) {
		bucket = 'actionNeeded';
	} else if (input.active && isTimeBasedRecurring) {
		bucket = 'upcoming';
	} else if (tagged && input.active && summary.kind === 'webhook') {
		bucket = 'upcoming';
	} else if (tagged && trigger?.type === MANUAL_TRIGGER_TYPE) {
		bucket = 'readyToRun';
	} else if (!tagged) {
		// User-built fallback — surfaces in readyToRun
		bucket = 'readyToRun';
	}

	const description =
		bucket === null ? '' : deriveDescription(bucket, trigger, summary, missingCredential);

	const card: DesktopAssistantTaskCard = {
		workflowId: input.workflowId,
		name: input.name,
		description,
		icon: deriveIcon(input.emojiIcon, input.nodes),
		trigger: summary,
		source: tagged ? 'desktop-assistant' : 'user-built',
		active: input.active,
		runsLocally: runsLocally(input.nodes),
	};
	if (input.lastExecution) {
		card.lastExecution = input.lastExecution;
	}

	return { bucket, card };
}

/**
 * Classify all workflows accessible to the requesting user into the three
 * buckets the desktop assistant UI renders. A workflow appears in at most
 * one bucket; precedence is `actionNeeded > upcoming > readyToRun`. Pure;
 * no DI, no I/O — all input data is gathered by the service layer.
 */
export function classifyWorkflowsForDesktopAssistant(
	inputs: ClassifierInput[],
): DesktopAssistantTasksResponse {
	const result: DesktopAssistantTasksResponse = {
		actionNeeded: [],
		upcoming: [],
		readyToRun: [],
	};
	for (const input of inputs) {
		const { bucket, card } = classifyOne(input);
		if (bucket === null) continue;
		result[bucket].push(card);
	}
	return result;
}
