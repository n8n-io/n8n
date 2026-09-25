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
import { createLogger } from '../logger';
import { decide, type Decision } from '../typesafe/decide';
import { buildRequest } from '../typesafe/questions';
import {
	CLEAR_TARGET_SCRIPT,
	DOM_SNAPSHOT_SCRIPT,
	markTargetScript,
	parseDomSnapshot,
	TARGET_SELECTOR,
	toSnapshotElements,
} from '../typesafe/dom-snapshot';
import {
	actionCandidates,
	MAX_CANDIDATES,
	parseSnapshot,
	type SnapshotElement,
} from '../typesafe/snapshot-elements';
import type { FieldTextFn, RecentAction, SystemOneFn, TaskBrief } from '../typesafe/types';
import type { CallToolResult, ConnectionState, ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createConnectedTool, extractDomain, pageIdField, withSnapshotEnvelope } from './helpers';

/**
 * Wall-clock ceiling for the whole call, under the transport's 60s so the
 * response still arrives. Kept as a constant rather than an input: a caller
 * cannot know the transport limit.
 */
const TOTAL_BUDGET_MS = 45_000;
/**
 * How long one interaction may keep retrying.
 *
 * The driver's own default is 30s, longer than the whole per-call budget
 * allows: an element under an overlay spent 30s retrying and ended the run.
 * The loop re-reads the page every step, so a control that is not ready now is
 * better reported immediately than waited on.
 */
const INTERACTION_TIMEOUT_MS = 3_000;
/** Worst case for one action: the interaction plus the load settle after it. */
const PER_ACTION_RESERVE_MS = 15_000;
const MAX_STEPS = 12;
const log = createLogger('act');

/** Consecutive actions that leave the page identical before the loop gives up. */
const MAX_UNCHANGED = 3;
/**
 * Times the same action on the same element may repeat before the loop gives
 * up. The unchanged-page check misses an oscillation — clicking a combobox
 * opens its list, clicking the option closes it, so the page differs every
 * time while nothing advances.
 */
const MAX_REPEATS = 2;
/** Past actions shown to the model. */
const HISTORY_WINDOW = 8;

export function createActTools(connection: BrowserConnection): ToolDefinition[] {
	return [browserAct(connection)];
}

const browserActSchema = z
	.object({
		goal: z
			.string()
			.describe(
				'The whole remaining goal in plain language. Not a list of steps, and never an element ref.',
			),
		knownValues: z
			.record(z.string(), z.string())
			.optional()
			.describe('Values already supplied by the user, so a typing step can be recognised'),
		maxSteps: z.number().int().optional().describe(`Cap on actions (default ${MAX_STEPS})`),
		pageId: pageIdField,
	})
	.describe('Pursue a goal with a run of mechanical browser actions');

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
		'Pursue a goal with a run of browser actions, without a model turn for each one. It clicks, types, ' +
			'selects, hovers, presses keys, reloads and goes back on its own until the goal is reached or it ' +
			'needs you. ' +
			'Pass the WHOLE remaining goal in plain language, as the user would state it — for example ' +
			'"submit the form to find one-way flights from Zurich to London on 20 September 2026 for one adult ' +
			'in economy". Do NOT pass a list of steps, and do NOT pass element refs such as "e1067": refs belong ' +
			'to the snapshot that produced them and mean nothing here, so naming one sends it to the wrong ' +
			'element. It finds its own targets and decides its own order. ' +
			'It stops for a URL it cannot choose, a sign-in wall, an error, an unapproved domain, a page too ' +
			'dense to read, or no progress. It returns what it did, why it stopped, and the current snapshot. ' +
			'Prefer it over a sequence of individual browser_click and browser_type calls.',
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

			const outcome = await runLoop({
				state,
				pageId,
				input,
				systemOne,
				isHostAllowed: context.isHostAllowed,
				requestHostApproval: context.requestHostApproval,
				generateFieldText: context.generateFieldText,
			});
			// An approval request is returned as-is: the wrapper recognises it,
			// suspends the run, and calls this tool again with the decision.
			return outcome.kind === 'approval' ? outcome.result : formatCallToolResult(outcome.summary);
		},
		browserActOutputSchema,
		// The loop takes its own snapshot every step; a further enrichment pass
		// would re-read the page for nothing.
		{ skipEnrichment: true },
	);
}

interface PageFacts {
	url: string;
	title: string;
	/** Accessibility tree, returned to the caller and used for select options. */
	snapshot: string;
	elements: SnapshotElement[];
	omitted: number;
	/** True when candidates came from the DOM probe rather than the aria tree. */
	fromDom: boolean;
}

/**
 * Reads the page twice on purpose.
 *
 * The DOM probe decides which elements can actually be acted on — it is the
 * only source with geometry and clipping, so it is the only one that can tell
 * a below-the-fold control from a month hidden inside a carousel. The
 * accessibility tree is still returned, because the caller gets it back when
 * the loop stops and `browser_select` reads its option labels from it.
 *
 * If the probe cannot run (a CSP that blocks evaluation, a document mid-
 * navigation), candidates fall back to the aria tree so the loop degrades
 * instead of failing.
 */
async function pageFacts(state: ConnectionState, pageId: string): Promise<PageFacts> {
	const treeStartedAt = Date.now();
	const tree = await state.adapter.snapshot(pageId, undefined, true);
	const treeMs = Date.now() - treeStartedAt;
	const page = state.pages.get(pageId);
	const fallbackUrl = state.adapter.getPageUrl(pageId) ?? page?.url ?? '';

	const probeStartedAt = Date.now();
	let probe: unknown;
	try {
		probe = await state.adapter.evaluate(pageId, DOM_SNAPSHOT_SCRIPT);
	} catch (error) {
		log.debug('dom probe failed, falling back to the accessibility tree', {
			error: error instanceof Error ? error.message : String(error),
		});
		probe = null;
	}
	const probeMs = Date.now() - probeStartedAt;
	const dom = parseDomSnapshot(probe);
	log.debug('snapshot read', {
		ariaTreeMs: treeMs,
		domProbeMs: probeMs,
		treeChars: tree.tree.length,
		source: dom ? 'dom' : 'aria',
	});
	if (dom) {
		log.debug('candidates from dom probe', {
			offered: dom.elements.length,
			omitted: dom.omitted,
		});
		return {
			url: dom.url || fallbackUrl,
			title: dom.title || page?.title || '',
			snapshot: tree.tree,
			elements: toSnapshotElements(dom),
			omitted: dom.omitted,
			fromDom: true,
		};
	}

	const { elements, omitted } = actionCandidates(parseSnapshot(tree.tree));
	log.debug('candidates from aria tree', { offered: elements.length, omitted });
	return {
		url: fallbackUrl,
		title: page?.title ?? '',
		snapshot: tree.tree,
		elements,
		omitted,
		fromDom: false,
	};
}

interface LoopInput {
	goal: string;
	knownValues?: Record<string, string>;
	maxSteps?: number;
}

/**
 * Either a finished run to report, or a confirmation to hand upward. The two
 * are different kinds of result: one is the tool's own output, the other is a
 * protocol message the caller acts on.
 */
type LoopOutcome =
	| { kind: 'summary'; summary: Record<string, unknown> }
	| { kind: 'approval'; result: CallToolResult };

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
	requestHostApproval,
	generateFieldText,
}: {
	state: ConnectionState;
	pageId: string;
	input: LoopInput;
	systemOne: SystemOneFn;
	isHostAllowed?: (host: string) => boolean;
	requestHostApproval?: (host: string) => CallToolResult;
	generateFieldText?: FieldTextFn;
}): Promise<LoopOutcome> {
	const startedAt = Date.now();
	const maxSteps = input.maxSteps ?? MAX_STEPS;
	const performed: PerformedAction[] = [];
	const recentActions: RecentAction[] = [];
	let unchanged = 0;

	let facts = await pageFacts(state, pageId);
	let stop: Stop = {
		reason: 'step_budget',
		detail: `Reached the ${maxSteps}-action cap for one call.`,
	};

	for (let step = 0; step < maxSteps; step++) {
		const stepStartedAt = Date.now();
		log.debug('step start', {
			step: step + 1,
			elapsedMs: stepStartedAt - startedAt,
			url: facts.url,
			candidates: facts.elements.length,
		});
		const host = extractDomain(facts.url);

		if (isHostAllowed && host !== 'browser' && !isHostAllowed(host)) {
			if (requestHostApproval) {
				log.debug('requesting host approval', { step: step + 1, host });
				return { kind: 'approval', result: requestHostApproval(host) };
			}
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
			...(input.knownValues ? { knownValues: input.knownValues } : {}),
			...(recentActions.length > 0 ? { recentActions: recentActions.slice(-HISTORY_WINDOW) } : {}),
			url: facts.url,
			title: facts.title,
			snapshot: facts.snapshot,
		};

		const { elements, omitted } = facts;
		if (omitted > 0) {
			stop = {
				reason: 'too_many_elements',
				detail: `This page offers ${elements.length + omitted} candidates, past the ${MAX_CANDIDATES} that fit one request. Use the individual browser tools here.`,
			};
			break;
		}

		const { state: requestState, questions } = buildRequest(brief, elements);
		const askStartedAt = Date.now();
		const { answers, usage } = await systemOne({ state: requestState, questions });
		log.debug('fast model answered', {
			step: step + 1,
			ms: Date.now() - askStartedAt,
			questions: Object.keys(questions).length,
			inputTokens: usage.input_tokens,
		});
		const decision = decide(answers);

		if (decision.kind === 'handback') {
			// The ref is scoped to this loop's own page read, so the caller cannot
			// use it. Its label can be read, which is what names the control the
			// caller has to decide about.
			const suggested = describeElement(
				elements.find((element) => element.ref === decision.suggestion?.ref),
			);
			stop = {
				reason: decision.reason,
				detail: suggested ? `${decision.detail} Target: ${suggested}.` : decision.detail,
				...(decision.suggestion ? { suggestion: decision.suggestion } : {}),
			};
			break;
		}

		// The chosen element, for the text helper and for a label the model can
		// recognise next turn. A ref means nothing once the page is re-read.
		const target = decision.ref
			? elements.find((element) => element.ref === decision.ref)
			: undefined;
		const label = describeElement(target);

		let text: string | undefined;
		if (decision.action === 'browser_type') {
			const textStartedAt = Date.now();
			if (!generateFieldText) {
				stop = {
					reason: 'needs_text',
					detail: `The next step types into ${label ?? decision.ref ?? 'a field'}, and no text helper is configured on this instance.`,
					suggestion: { action: 'browser_type', ...(decision.ref ? { ref: decision.ref } : {}) },
				};
				break;
			}
			const written = await generateFieldText({
				goal: input.goal,
				field: {
					role: target?.role ?? 'textbox',
					name: target?.name ?? '',
					...(target?.value ? { value: target.value } : {}),
					...(target?.context ? { context: target.context } : {}),
				},
				page: { url: facts.url, title: facts.title },
				...(input.knownValues ? { knownValues: input.knownValues } : {}),
				...(recentActions.length > 0
					? { recentActions: recentActions.slice(-HISTORY_WINDOW) }
					: {}),
			});
			if (written === null) {
				// The goal does not determine this value. Handing back beats typing
				// a guess into someone's form.
				stop = {
					reason: 'needs_text',
					detail: `${label ?? decision.ref ?? 'A field'} needs a value the goal does not supply.`,
					suggestion: { action: 'browser_type', ...(decision.ref ? { ref: decision.ref } : {}) },
				};
				break;
			}
			text = written;
			log.debug('field text written', { step: step + 1, ms: Date.now() - textStartedAt });
		}

		// Oscillation guard, checked before acting: the same action on the same
		// element repeating means the loop is stuck even when the page changes.
		const signature = `${decision.action}:${decision.ref ?? decision.keys ?? ''}`;
		const repeats = performed.filter(
			(done) => `${done.action}:${done.ref ?? done.keys ?? ''}` === signature,
		).length;
		if (repeats >= MAX_REPEATS) {
			stop = {
				reason: 'no_progress',
				detail: `${decision.action} on ${label ?? decision.ref ?? 'the same target'} has already run ${repeats} times without reaching the goal.`,
			};
			break;
		}

		log.debug('execute action', {
			step: step + 1,
			action: decision.action,
			ref: decision.ref,
			target: label,
			confidence: Number(decision.confidence.toFixed(2)),
		});
		const executeStartedAt = Date.now();
		try {
			await execute(state, pageId, decision, text, facts.fromDom);
		} catch (error) {
			log.debug('action failed', {
				step: step + 1,
				ms: Date.now() - executeStartedAt,
				error: error instanceof Error ? error.message : String(error),
			});
			// The adapter refuses a ref that no longer resolves, or a control that
			// is disabled or covered. That refusal replaces the confidence gate, so
			// it ends the call with what was done rather than throwing the run away.
			stop = {
				reason: 'action_failed',
				detail: `${decision.action}${decision.ref ? ` on ${decision.ref}` : ''} could not be performed: ${
					error instanceof Error ? error.message : String(error)
				}`,
			};
			break;
		}
		log.debug('action done', { step: step + 1, ms: Date.now() - executeStartedAt });
		performed.push({
			action: decision.action,
			...(decision.ref ? { ref: decision.ref } : {}),
			...((decision.value ?? text) ? { value: decision.value ?? text } : {}),
			...(decision.keys ? { keys: decision.keys } : {}),
			confidence: decision.confidence,
		});

		const before = extractDomain(facts.url);
		const snapshotBefore = facts.snapshot;
		facts = await pageFacts(state, pageId);
		const after = extractDomain(facts.url);
		const changedPage = facts.snapshot !== snapshotBefore || facts.url !== before;
		log.debug('step end', {
			step: step + 1,
			ms: Date.now() - stepStartedAt,
			changedPage,
			url: facts.url,
		});

		// Recorded after the fact so it can carry whether the action took effect,
		// which is what stops the model repeating a step that already worked.
		recentActions.push({
			action: decision.action,
			...(label ? { target: label } : {}),
			...((decision.value ?? text) ? { text: decision.value ?? text } : {}),
			changedPage,
		});

		// Nothing changed. A few of these in a row means the loop is choosing
		// without effect — a disabled control, or a click the page ignores — and
		// would otherwise burn the whole budget on it.
		unchanged = changedPage ? 0 : unchanged + 1;
		if (unchanged >= MAX_UNCHANGED) {
			stop = {
				reason: 'no_progress',
				detail: `The last ${MAX_UNCHANGED} actions left the page unchanged.`,
			};
			break;
		}

		// A click can navigate somewhere the entry gate never saw. The navigation
		// has already happened by now — the same exposure a single browser_click
		// has today — so the question is only whether the loop may carry on here.
		if (after !== before && isHostAllowed && after !== 'browser' && !isHostAllowed(after)) {
			if (requestHostApproval) {
				log.debug('requesting host approval after navigation', {
					step: step + 1,
					from: before,
					to: after,
				});
				return { kind: 'approval', result: requestHostApproval(after) };
			}
			stop = {
				reason: 'host_changed',
				detail: `The last action moved to ${after}, which is not approved for this session.`,
			};
			break;
		}
	}

	log.debug('loop finished', {
		ms: Date.now() - startedAt,
		actions: performed.length,
		stopReason: stop.reason,
	});

	return {
		kind: 'summary',
		summary: {
			performed,
			stopReason: stop.reason,
			stopDetail: stop.detail,
			...(stop.suggestion ? { suggestion: stop.suggestion } : {}),
			url: facts.url,
			title: facts.title,
			snapshot: facts.snapshot,
		},
	};
}

/** How an element is named in a message: role, name and where it sits. */
function describeElement(element: SnapshotElement | undefined): string | undefined {
	if (!element) return undefined;
	return [
		element.role,
		element.name && `"${element.name}"`,
		element.context && `in ${element.context}`,
	]
		.filter(Boolean)
		.join(' ');
}

async function execute(
	state: ConnectionState,
	pageId: string,
	decision: Decision & { kind: 'execute' },
	text: string | undefined,
	fromDom: boolean,
): Promise<void> {
	// Page-side ids are not selectors, and the adapter addresses elements by
	// `aria-ref` or CSS. Marking the chosen node bridges the two, which keeps
	// execution on the adapter's real pointer events and actionability guards
	// rather than a second, weaker click path.
	let target: { ref: string } | { selector: string } | undefined;
	if (decision.ref) {
		if (fromDom) {
			const marked = await state.adapter.evaluate(pageId, markTargetScript(decision.ref));
			if (marked !== true) {
				throw new Error(
					'the element is gone, hidden or disabled since it was chosen — take a fresh look',
				);
			}
			target = { selector: TARGET_SELECTOR };
		} else {
			target = { ref: decision.ref };
		}
	}

	try {
		await runAction(state, pageId, decision, text, target);
	} finally {
		// Leaving the attribute behind would make the next action address a stale
		// element, and it is not ours to leave on someone's page.
		if (fromDom && decision.ref) {
			await state.adapter.evaluate(pageId, CLEAR_TARGET_SCRIPT).catch(() => undefined);
		}
	}
}

async function runAction(
	state: ConnectionState,
	pageId: string,
	decision: Decision & { kind: 'execute' },
	text: string | undefined,
	target: { ref: string } | { selector: string } | undefined,
): Promise<void> {
	await state.adapter.waitForCompletion(pageId, async () => {
		switch (decision.action) {
			case 'browser_click':
				if (!target) throw new Error('browser_click needs an element');
				return await state.adapter.click(pageId, target, {
					timeoutMs: INTERACTION_TIMEOUT_MS,
				});
			case 'browser_type':
				if (!target || text === undefined) {
					throw new Error('browser_type needs an element and a value');
				}
				// `paste` replaces the field instead of appending to whatever the
				// page already put there, which is what re-filling a field means.
				return await state.adapter.type(pageId, target, text, { mode: 'paste' });
			case 'browser_select':
				if (!target || !decision.value) {
					throw new Error('browser_select needs an element and a value');
				}
				await state.adapter.select(pageId, target, [decision.value], {
					timeoutMs: INTERACTION_TIMEOUT_MS,
				});
				return;
			case 'browser_hover':
				if (!target) throw new Error('browser_hover needs an element');
				return await state.adapter.hover(pageId, target, {
					timeoutMs: INTERACTION_TIMEOUT_MS,
				});
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
