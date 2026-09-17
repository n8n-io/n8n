/**
 * `browser_act` — the fast loop.
 *
 * One call from the reasoning model performs a run of mechanical steps:
 * snapshot, ask a System One model for the next action, execute it, repeat.
 * Every step the loop cannot take itself ends the call and hands back a reason
 * plus the current page, so control returns to the reasoning model exactly
 * where its judgement is needed.
 *
 * Two hard limits shape it, both checked BEFORE an action starts so the loop
 * never has to unwind:
 *
 * - The host's tool transport rejects a call after 60s (`LocalGateway`), and a
 *   single browser action can take ~15s (load-state wait plus actionability
 *   grace). The loop therefore stops while it still has room for one action.
 * - Domain access is approved per host and approval suspends the run. The loop
 *   refuses to start an action on a host that is not already approved, which
 *   keeps it suspension-free: the reasoning model makes that single call and
 *   the existing confirmation flow handles it unchanged.
 */

import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import { decide, DEFAULT_CONFIDENCE_THRESHOLD, type Decision } from '../typesafe/decide';
import { buildRequest } from '../typesafe/questions';
import {
	MAX_CHOICE_OPTIONS,
	parseSnapshot,
	selectChoosableElements,
} from '../typesafe/snapshot-elements';
import type { SystemOneFn, TaskBrief } from '../typesafe/types';
import type { ConnectionState, ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createConnectedTool, extractDomain, pageIdField, withSnapshotEnvelope } from './helpers';

/**
 * Wall-clock ceiling for the whole call, under the transport's 60s so the
 * response still arrives. Kept as a constant rather than an input: a caller
 * cannot know the transport limit.
 */
const TOTAL_BUDGET_MS = 45_000;
/** Worst case for one action: ~10.5s load settle plus ~5s actionability grace. */
const PER_ACTION_RESERVE_MS = 15_000;
const MAX_STEPS = 12;

export function createActTools(connection: BrowserConnection): ToolDefinition[] {
	return [browserAct(connection)];
}

const browserActSchema = z
	.object({
		goal: z.string().describe('What the browser session is ultimately for'),
		step: z
			.string()
			.describe('The single step to make progress on now, e.g. "open the OAuth client form"'),
		knownValues: z
			.record(z.string(), z.string())
			.optional()
			.describe('Values already supplied by the user, so a typing step can be recognised'),
		maxSteps: z.number().int().optional().describe(`Cap on actions (default ${MAX_STEPS})`),
		confidenceThreshold: z
			.number()
			.optional()
			.describe(`Minimum confidence to act (default ${DEFAULT_CONFIDENCE_THRESHOLD})`),
		pageId: pageIdField,
	})
	.describe('Perform a run of mechanical browser actions towards one step');

const performedActionSchema = z.object({
	action: z.string(),
	ref: z.string().optional(),
	value: z.string().optional(),
	keys: z.string().optional(),
	confidence: z.number(),
});

const browserActOutputSchema = withSnapshotEnvelope({
	performed: z.array(performedActionSchema),
	stopReason: z.string(),
	stopDetail: z.string(),
	suggestion: z.object({ action: z.string(), ref: z.string().optional() }).optional(),
	url: z.string(),
	title: z.string(),
});

type PerformedAction = z.infer<typeof performedActionSchema>;

function browserAct(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_act',
		'Perform a run of mechanical browser actions towards a single step, without a model turn for each one. ' +
			'Give it the overall goal and the step to make progress on. It clicks, selects, hovers, presses keys, ' +
			'reloads and goes back on its own, and stops as soon as anything needs judgement — text to type, a URL ' +
			'to choose, a sign-in wall, an error, an unapproved domain, or low confidence. It returns what it did, ' +
			'why it stopped, and the current page snapshot. Prefer it over a sequence of individual browser_click ' +
			'calls when following documented setup steps. Requires a snapshot-capable page and a configured fast model.',
		browserActSchema,
		async (state, input, pageId, context) => {
			const systemOne = context.systemOne;
			if (!systemOne) {
				return formatCallToolResult({
					performed: [],
					stopReason: 'unavailable',
					stopDetail:
						'No fast model is configured on this instance, so browser_act cannot run. Use the individual browser tools instead.',
					...(await pageFacts(state, pageId)),
				});
			}

			return formatCallToolResult(
				await runLoop({
					state,
					pageId,
					input,
					systemOne,
					isHostAllowed: context.isHostAllowed,
				}),
			);
		},
		browserActOutputSchema,
		// The loop takes its own snapshot every step; a further enrichment pass
		// would re-read the page for nothing.
		{ skipEnrichment: true },
	);
}

async function pageFacts(
	state: ConnectionState,
	pageId: string,
): Promise<{ url: string; title: string; snapshot: string }> {
	const result = await state.adapter.snapshot(pageId, undefined, true);
	const page = state.pages.get(pageId);
	return {
		url: state.adapter.getPageUrl(pageId) ?? page?.url ?? '',
		title: page?.title ?? '',
		snapshot: result.tree,
	};
}

interface LoopInput {
	goal: string;
	step: string;
	knownValues?: Record<string, string>;
	maxSteps?: number;
	confidenceThreshold?: number;
}

/** Why the loop ended, and what the reasoning model should do about it. */
interface Stop {
	reason: string;
	detail: string;
	suggestion?: { action: string; ref?: string };
}

async function runLoop({
	state,
	pageId,
	input,
	systemOne,
	isHostAllowed,
}: {
	state: ConnectionState;
	pageId: string;
	input: LoopInput;
	systemOne: SystemOneFn;
	isHostAllowed?: (host: string) => boolean;
}): Promise<Record<string, unknown>> {
	const startedAt = Date.now();
	const maxSteps = input.maxSteps ?? MAX_STEPS;
	const performed: PerformedAction[] = [];
	const recentActions: string[] = [];

	let facts = await pageFacts(state, pageId);
	let stop: Stop = {
		reason: 'step_budget',
		detail: `Reached the ${maxSteps}-action cap for one call.`,
	};

	for (let step = 0; step < maxSteps; step++) {
		const host = extractDomain(facts.url);

		// Refusing here is what keeps the loop suspension-free.
		if (isHostAllowed && host !== 'browser' && !isHostAllowed(host)) {
			stop = {
				reason: 'host_not_approved',
				detail: `${host} is not approved for this session yet. Call the individual browser tool so the user can approve it.`,
			};
			break;
		}

		if (Date.now() - startedAt > TOTAL_BUDGET_MS - PER_ACTION_RESERVE_MS) {
			stop = {
				reason: 'time_budget',
				detail: `Stopped with ${performed.length} action(s) to stay inside the call timeout. Call browser_act again to continue.`,
			};
			break;
		}

		const brief: TaskBrief = {
			goal: input.goal,
			step: input.step,
			...(input.knownValues ? { knownValues: input.knownValues } : {}),
			...(recentActions.length > 0 ? { recentActions: recentActions.slice(-5) } : {}),
			url: facts.url,
			title: facts.title,
			snapshot: facts.snapshot,
		};

		const { elements, tooMany } = selectChoosableElements(parseSnapshot(facts.snapshot));
		if (tooMany) {
			// The API rejects a Choice with more than MAX_CHOICE_OPTIONS options, and
			// truncating the list would hide the real target behind a confident wrong
			// answer. Dense pages are the reasoning model's job.
			stop = {
				reason: 'too_many_elements',
				detail: `This page has ${elements.length} actionable elements, past the ${MAX_CHOICE_OPTIONS} the fast model can choose between. Use the individual browser tools here.`,
			};
			break;
		}

		const { state: requestState, questions } = buildRequest(brief, elements);
		const { answers } = await systemOne({ state: requestState, questions });
		const decision = decide(answers, input.confidenceThreshold);

		if (decision.kind === 'handback') {
			stop = {
				reason: decision.reason,
				detail: decision.detail,
				...(decision.suggestion ? { suggestion: decision.suggestion } : {}),
			};
			break;
		}

		await execute(state, pageId, decision);
		performed.push({
			action: decision.action,
			...(decision.ref ? { ref: decision.ref } : {}),
			...(decision.value ? { value: decision.value } : {}),
			...(decision.keys ? { keys: decision.keys } : {}),
			confidence: decision.confidence,
		});
		recentActions.push(
			`${decision.action}${decision.ref ? ` on ${decision.ref}` : ''}${decision.value ? ` = ${decision.value}` : ''}`,
		);

		const before = extractDomain(facts.url);
		facts = await pageFacts(state, pageId);
		const after = extractDomain(facts.url);

		// A click can navigate. Approval is per host, so a new host ends the run
		// even though the navigation already happened — the same exposure a
		// single browser_click has today, just surfaced instead of continued on.
		if (after !== before && isHostAllowed && after !== 'browser' && !isHostAllowed(after)) {
			stop = {
				reason: 'host_changed',
				detail: `The last action moved to ${after}, which is not approved for this session.`,
			};
			break;
		}
	}

	return {
		performed,
		stopReason: stop.reason,
		stopDetail: stop.detail,
		...(stop.suggestion ? { suggestion: stop.suggestion } : {}),
		...facts,
	};
}

async function execute(
	state: ConnectionState,
	pageId: string,
	decision: Decision & { kind: 'execute' },
): Promise<void> {
	const target = decision.ref ? { ref: decision.ref } : undefined;

	await state.adapter.waitForCompletion(pageId, async () => {
		switch (decision.action) {
			case 'browser_click':
				if (!target) throw new Error('browser_click needs an element');
				return await state.adapter.click(pageId, target);
			case 'browser_select':
				if (!target || !decision.value)
					throw new Error('browser_select needs an element and a value');
				await state.adapter.select(pageId, target, [decision.value]);
				return;
			case 'browser_hover':
				if (!target) throw new Error('browser_hover needs an element');
				return await state.adapter.hover(pageId, target);
			case 'browser_press':
				if (!decision.keys) throw new Error('browser_press needs a key');
				return await state.adapter.press(pageId, decision.keys);
			case 'browser_back':
				await state.adapter.back(pageId);
				return;
			case 'browser_reload':
				await state.adapter.reload(pageId);
				return;
			default:
				throw new Error(`browser_act cannot perform ${decision.action}`);
		}
	});
}
