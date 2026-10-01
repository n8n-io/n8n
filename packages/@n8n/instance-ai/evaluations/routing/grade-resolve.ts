// ---------------------------------------------------------------------------
// Route resolution and accept tokens for the routing grader (see the SPEC's
// "Route resolution" and "Accept tokens" sections, with the v2 addendum).
//
// The grader reads calls up to and including the first committing call. With
// `--stop-on-route` the runner already ends there; applying the same window to
// a run without the flag keeps the two gradable in the same way. Tool call
// status is ignored: an errored `build-workflow` still shows the chosen route.
//
// Two scores: "strict" applies only the case's accept tokens. The default (v2)
// score also passes a same-direction clarification in the agent and workflow
// buckets.
// ---------------------------------------------------------------------------

import {
	isCommittingCall,
	isCommittingDataTablesAction,
	isMutatingWorkflowsAction,
} from './route-rules';
import {
	type AcceptToken,
	type AskUserQuestion,
	type Bucket,
	parseAskUserQuestion,
	type Route,
	type RoutingCase,
	type Steer,
	type TrialResult,
	type TrialToolCall,
} from './grade-types';
import type { JudgeInput, JudgeVerdict } from './judge';

export const INTENT_SKILL_ID = 'intent-recognition';

/** The runner writes this status when `--stop-on-route` ended the trial. */
const STOPPED_ON_ROUTE = 'stopped-on-route';

export type ResolutionRule = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface RouteResolution {
	route: Route;
	/** Set for `clarify`, and for judged text replies. */
	steer?: Steer;
	/** SPEC rule that decided the route; absent when nothing could be resolved. */
	rule?: ResolutionRule;
	/** The call or reply that decided the route, for reports. */
	evidence: string;
	judgeReason?: string;
	judgeError?: string;
}

export type PendingResolution =
	| { kind: 'resolved'; resolution: RouteResolution }
	| { kind: 'judge'; rule: 6 | 7; evidence: string; input: JudgeInput };

function actionOf(call: TrialToolCall): string | undefined {
	return typeof call.args.action === 'string' ? call.args.action : undefined;
}

function skillIdOf(call: TrialToolCall): string | undefined {
	const { skillId, name } = call.args;
	if (typeof skillId === 'string') return skillId;
	return typeof name === 'string' ? name : undefined;
}

function describeCall(call: TrialToolCall): string {
	const action = actionOf(call);
	return action ? `${call.toolName} ${action}` : call.toolName;
}

/** Calls up to and including the first committing call, or all calls when none commits. */
export function routeWindow(calls: readonly TrialToolCall[]): TrialToolCall[] {
	const stop = calls.findIndex((call) => isCommittingCall(call.toolName, call.args));
	return stop === -1 ? [...calls] : calls.slice(0, stop + 1);
}

/**
 * The call that ended a `--stop-on-route` trial when no recorded call commits
 * under the current rules (for example `data-tables create`, which committed
 * before v2). The run would have gone on, so the trial must be re-run to grade.
 */
export function staleStopCall(trial: TrialResult): string | undefined {
	if (trial.streamStatus !== STOPPED_ON_ROUTE) return undefined;
	if (trial.toolCalls.some((call) => isCommittingCall(call.toolName, call.args))) return undefined;
	const last = trial.toolCalls.at(-1);
	return last ? describeCall(last) : 'no recorded call';
}

function isOneOffAction(call: TrialToolCall): boolean {
	const action = actionOf(call);
	switch (call.toolName) {
		case 'nodes':
			return action === 'execute';
		case 'executions':
			return action === 'run' || action === 'stop';
		case 'data-tables':
			return isCommittingDataTablesAction(action);
		case 'workflows':
			return isMutatingWorkflowsAction(action);
		default:
			return false;
	}
}

/** Loading the `debugging-executions` skill alone is not a debug route. */
function isDebugSignal(call: TrialToolCall): boolean {
	if (call.toolName !== 'executions') return false;
	const action = actionOf(call);
	return action === 'debug' || action === 'get' || action === 'list';
}

function askUserCard(
	call: TrialToolCall,
	trial: TrialResult,
): { intro?: string; questions: AskUserQuestion[] } {
	const fromArgs = Array.isArray(call.args.questions)
		? call.args.questions
				.map(parseAskUserQuestion)
				.filter((question): question is AskUserQuestion => question !== undefined)
		: [];
	const intro = typeof call.args.introMessage === 'string' ? call.args.introMessage : undefined;
	return { intro, questions: fromArgs.length > 0 ? fromArgs : trial.askUserQuestions };
}

/** Applies rules 1 to 7 in order. Rules 6 and 7 return a judge request. */
export function resolveTrial(routingCase: RoutingCase, trial: TrialResult): PendingResolution {
	const window = routeWindow(trial.toolCalls);
	const resolved = (rule: ResolutionRule, route: Route, evidence: string): PendingResolution => ({
		kind: 'resolved',
		resolution: { route, rule, evidence },
	});

	if (
		window.some((call) => call.toolName === 'build-agent' && call.args.operation !== 'exploring')
	) {
		return resolved(1, 'agent', 'build-agent');
	}

	const buildWorkflow = window.find((call) => call.toolName === 'build-workflow');
	if (buildWorkflow) {
		return buildWorkflow.args.executionIntent === 'one-off'
			? resolved(2, 'one-off', 'build-workflow executionIntent=one-off')
			: resolved(2, 'workflow', 'build-workflow');
	}

	if (window.some((call) => call.toolName === 'create-tasks')) {
		return resolved(3, 'multi', 'create-tasks');
	}

	const oneOff = window.find(isOneOffAction);
	if (oneOff) return resolved(4, 'one-off', describeCall(oneOff));

	const debug = window.find(isDebugSignal);
	if (debug) return resolved(5, 'debug', describeCall(debug));

	const askUser = window.find((call) => call.toolName === 'ask-user');
	if (askUser) {
		const card = askUserCard(askUser, trial);
		return {
			kind: 'judge',
			rule: 6,
			evidence: 'ask-user',
			input: {
				mode: 'ask-user',
				userMessage: routingCase.userMessage,
				askUserIntro: card.intro,
				askUserQuestions: card.questions,
				finalText: trial.finalText,
			},
		};
	}

	if (trial.finalText.trim() === '') {
		const status = trial.runError ? `${trial.streamStatus}: ${trial.runError}` : trial.streamStatus;
		return {
			kind: 'resolved',
			resolution: {
				route: 'none',
				evidence: `no committing call and no final text (${status})`,
			},
		};
	}

	return {
		kind: 'judge',
		rule: 7,
		evidence: 'final text',
		input: {
			mode: 'text',
			userMessage: routingCase.userMessage,
			askUserQuestions: [],
			finalText: trial.finalText,
		},
	};
}

export function applyVerdict(
	pending: Extract<PendingResolution, { kind: 'judge' }>,
	verdict: JudgeVerdict,
): RouteResolution {
	// Rule 6 is clarify by construction; the judge only supplies the steer there.
	const route: Route = pending.rule === 6 ? 'clarify' : verdict.kind;
	return {
		route,
		steer: verdict.steer,
		rule: pending.rule,
		evidence: pending.evidence,
		judgeReason: verdict.reason,
	};
}

export function judgeFailure(
	pending: Extract<PendingResolution, { kind: 'judge' }>,
	error: unknown,
): RouteResolution {
	return {
		route: 'none',
		rule: pending.rule,
		evidence: `${pending.evidence}, judge failed`,
		judgeError: error instanceof Error ? error.message : String(error),
	};
}

/** Short label for tables: the route, with the steer for `clarify`. */
export function routeLabel(resolution: RouteResolution): string {
	return resolution.route === 'clarify'
		? `clarify:${resolution.steer ?? 'none'}`
		: resolution.route;
}

export function acceptTokenMatches(token: AcceptToken, resolution: RouteResolution): boolean {
	const { route, steer } = resolution;
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

/** The case's accept tokens only. */
export function strictTrialPasses(routingCase: RoutingCase, resolution: RouteResolution): boolean {
	return routingCase.accepts.some((token) => acceptTokenMatches(token, resolution));
}

/**
 * A clarification that pushes toward the bucket's artifact: `clarify:agent` or
 * `clarify:both` in the agent bucket, `clarify:workflow` or `clarify:both` in
 * the workflow bucket. Other buckets have no direction.
 */
export function isSameDirectionClarify(bucket: Bucket, resolution: RouteResolution): boolean {
	if (resolution.route !== 'clarify') return false;
	const { steer } = resolution;
	if (bucket === 'agent') return steer === 'agent' || steer === 'both';
	if (bucket === 'workflow') return steer === 'workflow' || steer === 'both';
	return false;
}

/** v2 score: the strict score, plus a same-direction clarification. */
export function trialPasses(routingCase: RoutingCase, resolution: RouteResolution): boolean {
	return (
		strictTrialPasses(routingCase, resolution) ||
		isSameDirectionClarify(routingCase.bucket, resolution)
	);
}

/** SPEC: a case passes when at least 2 of 3 trials pass; other trial counts keep the 2/3 ratio. */
export function casePasses(passedTrials: number, totalTrials: number): boolean {
	return totalTrials > 0 && passedTrials * 3 >= totalTrials * 2;
}

export function intentSkillLoaded(trial: TrialResult): boolean {
	if (trial.skillsLoaded.includes(INTENT_SKILL_ID)) return true;
	return trial.toolCalls.some(
		(call) => call.toolName === 'load_skill' && skillIdOf(call) === INTENT_SKILL_ID,
	);
}
