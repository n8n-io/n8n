// ---------------------------------------------------------------------------
// Route resolution and scoring for the routing eval.
//
// A route watcher asks the judge before each orchestrator tool call runs (see
// judge.ts). The first `stop` verdict ends the run and decides the route. When
// the turn ends first, the judge picks the route from the full trace. Only
// the read-only actions below skip the check, so a new or renamed tool still
// gets a check and needs no grader change.
//
// A case with a stage direction lets the user proxy answer up to
// MAX_ANSWERS accepted questions. The run then goes on, and the route after
// the last answer decides the trial (see ../discovery/cli.ts).
// ---------------------------------------------------------------------------

import type { InstanceAiEvent } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { AcceptToken, RoutingCase } from './cases';
import type { JudgeInput, JudgeVerdict, Route, Steer, TraceStep } from './judge';
import {
	ORCHESTRATOR_AGENT_ID,
	type DiscoveryStreamStatus,
	type PendingToolCall,
} from '../discovery/types';
import { ASK_USER_TOOL_ID, DOMAIN_TOOL_IDS } from '../../src/tools/tool-ids';

/**
 * A check before a read almost never stops the run, and the next check sees
 * the read, so the run skips it. A tool or action not listed here gets a check.
 */
const READ_ONLY_ACTIONS: Readonly<Record<string, ReadonlySet<unknown>>> = {
	// `load_skill` has no action.
	load_skill: new Set([undefined]),
	[DOMAIN_TOOL_IDS.NODES]: new Set([
		'list',
		'search',
		'describe',
		'type-definition',
		'suggested',
		'explore-resources',
	]),
	[DOMAIN_TOOL_IDS.CREDENTIALS]: new Set(['list', 'get', 'search-types']),
	[DOMAIN_TOOL_IDS.N8N_DOCS]: new Set(['lookup', 'search', 'read']),
	[DOMAIN_TOOL_IDS.RESEARCH]: new Set(['web-search', 'fetch-url']),
};

const isReadOnly = ({ toolName, args }: PendingToolCall): boolean =>
	READ_ONLY_ACTIONS[toolName]?.has(args.action) ?? false;

export interface RouteResolution {
	route: Route;
	/** Unset only when the judge failed. */
	steer?: Steer;
	/** Where the route was decided: the tool call that the run stopped before, or the end of the turn. */
	evidence: string;
	judgeReason?: string;
	/** Set when a judge call in the trial failed. */
	judgeError?: string;
	/** The questions that the user proxy answered before this route, in order. */
	questions?: RouteResolution[];
}

/** The user proxy answers at most this many questions in a trial. */
export const MAX_ANSWERS = 2;

/** `resolution` after `earlier`, a question that the user answered in an earlier turn. */
export function afterQuestion(
	resolution: RouteResolution,
	{ questions = [], ...earlier }: RouteResolution,
): RouteResolution {
	// The summary counts only top-level judge errors, so the errors of earlier turns move up.
	const judgeError = resolution.judgeError ?? earlier.judgeError;
	return {
		...resolution,
		...(judgeError && { judgeError }),
		questions: [...questions, earlier, ...(resolution.questions ?? [])],
	};
}

/** The number of questions that the user answered before the route. */
export const answeredQuestions = (resolution: RouteResolution): number =>
	resolution.questions?.length ?? 0;

const countAnswers = (steps: TraceStep[]) => steps.filter((step) => step.kind === 'answer').length;

/**
 * The orchestrator's text and calls in order, with the user's answer after a
 * question card. A pending call that has no event yet goes last, after the
 * text that the run published before it.
 */
export function traceSteps(
	events: readonly InstanceAiEvent[],
	pending?: PendingToolCall,
): TraceStep[] {
	const steps: TraceStep[] = [];
	let text = '';
	let pendingSeen = false;
	const questionCalls = new Set<string>();
	for (const event of events) {
		if (event.agentId !== ORCHESTRATOR_AGENT_ID) continue;
		if (event.type === 'text-delta') {
			text += event.payload.text;
			continue;
		}
		if (event.type === 'confirmation-request' && event.payload.inputType === 'questions') {
			questionCalls.add(event.payload.toolCallId);
			continue;
		}
		if (event.type === 'tool-result' && questionCalls.has(event.payload.toolCallId)) {
			// A skipped or dismissed card returns `{ answered: false }`: no facts reached the run.
			const { result } = event.payload;
			if (isRecord(result) && result.answered === true) steps.push({ kind: 'answer', result });
			continue;
		}
		if (event.type !== 'tool-call') continue;
		if (text.trim()) steps.push({ kind: 'text', text: text.trim() });
		text = '';
		const { toolCallId, toolName, args } = event.payload;
		steps.push({ kind: 'call', toolName, args });
		if (toolCallId === pending?.toolCallId) pendingSeen = true;
	}
	if (text.trim()) steps.push({ kind: 'text', text: text.trim() });
	if (pending && !pendingSeen) {
		steps.push({ kind: 'call', toolName: pending.toolName, args: pending.args });
	}
	return steps;
}

export interface RouteWatcher {
	/** The runner's `stopBeforeTool` hook: `true` ends the run before the call runs. */
	beforeToolCall: (call: PendingToolCall, events: readonly InstanceAiEvent[]) => Promise<boolean>;
	/** The route of the finished turn. */
	resolve: (turn: {
		instanceEvents: readonly InstanceAiEvent[];
		streamStatus: DiscoveryStreamStatus;
	}) => Promise<RouteResolution>;
}

/**
 * One watcher for each turn. While the user has answers left, a stop before a
 * question card that `canReply` accepts lets the run go on, so the user proxy
 * can answer the question.
 */
export function createRouteWatcher(
	judge: (input: JudgeInput) => Promise<JudgeVerdict>,
	canReply?: (question: RouteResolution) => boolean,
	maxAnswers = MAX_ANSWERS,
): RouteWatcher {
	let stopped: RouteResolution | undefined;
	const questions: RouteResolution[] = [];
	let judgeError: string | undefined;
	// Calls of one step can run in parallel, so the judge takes them one at a time.
	let queue: Promise<unknown> = Promise.resolve();

	const ask = async (input: JudgeInput): Promise<JudgeVerdict | undefined> => {
		try {
			return await judge(input);
		} catch (error) {
			// A failed check before a call lets the run go on; the next check decides.
			judgeError ??= error instanceof Error ? error.message : String(error);
			return undefined;
		}
	};
	const withError = (resolution: RouteResolution): RouteResolution =>
		judgeError ? { ...resolution, judgeError } : resolution;

	return {
		beforeToolCall: async (call, events) => {
			const check = queue.then(async () => {
				if (stopped) return true;
				if (isReadOnly(call)) return false;
				const steps = traceSteps(events, call);
				const verdict = await ask({ steps });
				// A stop without a route lets the run go on.
				if (verdict?.decision !== 'stop' || verdict.route === 'none') return false;
				const resolution: RouteResolution = {
					route: verdict.route,
					steer: verdict.steer,
					evidence: `${call.toolName} call`,
					judgeReason: verdict.reason,
				};
				const answers = countAnswers(steps);
				// Only a question card waits for the user. Any other call would run before the answer.
				if (call.toolName === ASK_USER_TOOL_ID && answers < maxAnswers && canReply?.(resolution)) {
					// The next answer replies to the latest question. A skipped card adds no answer.
					questions[answers] = resolution;
					return false;
				}
				stopped = resolution;
				return true;
			});
			queue = check;
			return await check;
		},

		resolve: async ({ instanceEvents, streamStatus }) => {
			// A check can still run after a timeout, and its verdict counts.
			await queue;
			const steps = traceSteps(instanceEvents);
			// A question counts only when the user's answer reached the run.
			const answered = questions.slice(0, countAnswers(steps));
			const withQuestion = (resolution: RouteResolution): RouteResolution =>
				withError(answered.length > 0 ? { ...resolution, questions: answered } : resolution);
			if (stopped) return withQuestion(stopped);
			const evidence = `end of turn (${streamStatus})`;
			const verdict = await ask({ steps, endStatus: streamStatus });
			if (!verdict) return withQuestion({ route: 'none', evidence: `${evidence}, judge failed` });
			return withQuestion({
				route: verdict.route,
				steer: verdict.steer,
				evidence,
				judgeReason: verdict.reason,
			});
		},
	};
}

/** Short label for output: the route, with the steer for `clarify` and `answer`, after the answered questions. */
export function routeLabel(resolution: RouteResolution): string {
	return [...(resolution.questions ?? []), resolution]
		.map(({ route, steer }) =>
			route === 'clarify' || route === 'answer' ? `${route}:${steer ?? 'none'}` : route,
		)
		.join('>');
}

// `<route>:agent` passes a steer toward an Agent; `<route>:open` passes any steer except workflow only.
function acceptTokenMatches(token: AcceptToken, { route, steer }: RouteResolution): boolean {
	const [tokenRoute, tokenSteer] = token.split(':');
	if (route !== tokenRoute) return false;
	if (tokenSteer === 'agent') return steer === 'agent' || steer === 'both';
	if (tokenSteer === 'open') return steer !== undefined && steer !== 'workflow';
	return true;
}

/** The user proxy answers a question that the case accepts. */
export function canReplyTo(routingCase: RoutingCase, question: RouteResolution): boolean {
	return (
		question.route === 'clarify' &&
		routingCase.accepts.some((token) => acceptTokenMatches(token, question))
	);
}

export function trialPasses(routingCase: RoutingCase, resolution: RouteResolution): boolean {
	// After an answer, only the route that the user's facts point to passes, or a further question that steers to it.
	if (answeredQuestions(resolution) > 0) {
		const { route, steer } = resolution;
		return routingCase.after.some(
			(after) => after === route || (route === 'clarify' && after === steer),
		);
	}
	return routingCase.accepts.some((token) => acceptTokenMatches(token, resolution));
}

/** A case passes when at least 2 of 3 trials pass; other trial counts keep the ratio. */
export function casePasses(passedTrials: number, totalTrials: number): boolean {
	return totalTrials > 0 && passedTrials * 3 >= totalTrials * 2;
}
