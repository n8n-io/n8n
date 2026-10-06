// ---------------------------------------------------------------------------
// Route resolution and scoring for the routing eval.
//
// A route watcher asks the judge before each orchestrator tool call runs (see
// judge.ts). The first `stop` verdict ends the run and decides the route. When
// the turn ends first, the judge picks the route from the full trace. No tool
// names appear here, so a new or renamed tool needs no grader change.
//
// A case with a stage direction lets the user proxy answer one accepted
// question. The run then goes on, and the route after the answer decides the
// trial (see ../discovery/cli.ts).
// ---------------------------------------------------------------------------

import type { InstanceAiEvent } from '@n8n/api-types';

import type { AcceptToken, RoutingCase } from './cases';
import type { JudgeInput, JudgeVerdict, Route, Steer, TraceStep } from './judge';
import {
	ORCHESTRATOR_AGENT_ID,
	type DiscoveryStreamStatus,
	type PendingToolCall,
} from '../discovery/types';

export interface RouteResolution {
	route: Route;
	/** Unset only when the judge failed. */
	steer?: Steer;
	/** Where the route was decided: the tool call that the run stopped before, or the end of the turn. */
	evidence: string;
	judgeReason?: string;
	/** Set when a judge call in the trial failed. */
	judgeError?: string;
	/** The question that the user proxy answered before this route. */
	question?: RouteResolution;
}

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
			steps.push({ kind: 'answer', result: event.payload.result });
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
 * One watcher for each trial. Before the user answers, a stop that `canReply`
 * accepts lets the run go on, so the user proxy can answer the question.
 */
export function createRouteWatcher(
	judge: (input: JudgeInput) => Promise<JudgeVerdict>,
	canReply?: (question: RouteResolution) => boolean,
): RouteWatcher {
	let stopped: RouteResolution | undefined;
	let question: RouteResolution | undefined;
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
				if (!steps.some((step) => step.kind === 'answer') && canReply?.(resolution)) {
					question ??= resolution;
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
			// The question counts only when the user's answer reached the run.
			const withQuestion = (resolution: RouteResolution): RouteResolution =>
				withError(
					question && steps.some((step) => step.kind === 'answer')
						? { ...resolution, question }
						: resolution,
				);
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

/** Short label for output: the route, with the steer for `clarify`, after the answered question. */
export function routeLabel(resolution: RouteResolution): string {
	const label =
		resolution.route === 'clarify' ? `clarify:${resolution.steer ?? 'none'}` : resolution.route;
	return resolution.question ? `${routeLabel(resolution.question)}>${label}` : label;
}

function acceptTokenMatches(token: AcceptToken, { route, steer }: RouteResolution): boolean {
	switch (token) {
		case 'clarify':
			return route === 'clarify';
		case 'clarify:agent':
			return route === 'clarify' && (steer === 'agent' || steer === 'both');
		case 'clarify:open':
			return route === 'clarify' && steer !== undefined && steer !== 'workflow';
		default:
			return route === token;
	}
}

/** The user proxy answers a question that the case accepts. */
export function canReplyTo(routingCase: RoutingCase, question: RouteResolution): boolean {
	return question.route === 'clarify' && trialPasses(routingCase, question);
}

export function trialPasses(routingCase: RoutingCase, resolution: RouteResolution): boolean {
	// After an answer, only the route that the user's facts point to passes. A second question fails.
	if (resolution.question) return routingCase.after.some((route) => route === resolution.route);
	return routingCase.accepts.some((token) => acceptTokenMatches(token, resolution));
}

/** A case passes when at least 2 of 3 trials pass; other trial counts keep the ratio. */
export function casePasses(passedTrials: number, totalTrials: number): boolean {
	return totalTrials > 0 && passedTrials * 3 >= totalTrials * 2;
}
