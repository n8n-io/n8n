// ---------------------------------------------------------------------------
// Route resolution and scoring for the routing eval.
//
// The grader reads the orchestrator's calls up to and including the first
// committing call. With `--stop-on-route` the runner already ends there, so a
// run with and a run without the flag grade the same way. Tool call status is
// ignored: an errored `build-workflow` still shows the chosen route.
// ---------------------------------------------------------------------------

import type { InstanceAiEvent } from '@n8n/api-types';

import type { AcceptToken, RoutingBucket, RoutingCase } from './cases';
import type { JudgeInput, JudgeVerdict, Steer } from './judge';
import {
	actionOf,
	isCommittingCall,
	isCommittingDataTablesAction,
	isMutatingWorkflowsAction,
	ORCHESTRATOR_AGENT_ID,
} from './route-rules';
import { askUserInputSchema } from '../../src/tools/shared/ask-user.tool';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../../src/tools/tool-ids';
import type { DiscoveryStreamStatus } from '../discovery/types';

export type Route =
	| 'agent'
	| 'workflow'
	| 'one-off'
	| 'debug'
	| 'multi'
	| 'clarify'
	| 'answer'
	| 'decline'
	| 'none';

export interface RoutingToolCall {
	toolName: string;
	args: Record<string, unknown>;
}

export interface RoutingTrial {
	/** Orchestrator calls in call order, up to and including the first committing call. */
	toolCalls: RoutingToolCall[];
	/** Orchestrator text after its last call, else its last non-empty text segment. */
	finalText: string;
	streamStatus: DiscoveryStreamStatus;
}

export interface RouteResolution {
	route: Route;
	/** Set for `clarify`, and for judged text replies. */
	steer?: Steer;
	/** The call or reply that decided the route. */
	evidence: string;
	judgeReason?: string;
	judgeError?: string;
}

type PendingResolution =
	| { kind: 'resolved'; resolution: RouteResolution }
	| { kind: 'judge'; rule: 'ask-user' | 'text'; input: JudgeInput };

export function readRoutingTrial(run: {
	instanceEvents: readonly InstanceAiEvent[];
	streamStatus: DiscoveryStreamStatus;
}): RoutingTrial {
	const toolCalls: RoutingToolCall[] = [];
	const segments: string[] = [];
	let current = '';
	for (const event of run.instanceEvents) {
		if (event.agentId !== ORCHESTRATOR_AGENT_ID) continue;
		if (event.type === 'text-delta') {
			current += event.payload.text;
			continue;
		}
		if (event.type !== 'tool-call') continue;
		const { toolName, args } = event.payload;
		toolCalls.push({ toolName, args });
		if (current.trim()) segments.push(current);
		current = '';
		if (isCommittingCall(toolName, args)) break;
	}
	return {
		toolCalls,
		finalText: (current.trim() || segments.at(-1) || '').trim(),
		streamStatus: run.streamStatus,
	};
}

function describeCall(call: RoutingToolCall): string {
	const action = actionOf(call.args);
	return action ? `${call.toolName} ${action}` : call.toolName;
}

function isOneOffAction(call: RoutingToolCall): boolean {
	const action = actionOf(call.args);
	switch (call.toolName) {
		case DOMAIN_TOOL_IDS.NODES:
			return action === 'execute';
		case DOMAIN_TOOL_IDS.EXECUTIONS:
			return action === 'run' || action === 'run-step' || action === 'stop';
		case DOMAIN_TOOL_IDS.DATA_TABLES:
			return isCommittingDataTablesAction(action);
		case DOMAIN_TOOL_IDS.WORKFLOWS:
			return isMutatingWorkflowsAction(action);
		default:
			return false;
	}
}

const DEBUG_EXECUTIONS_ACTIONS: ReadonlySet<string> = new Set([
	'debug',
	'get',
	'list',
	'get-node-output',
	'get-resolved-node-parameters',
]);

/** Loading the `debugging-executions` skill alone is not a debug route. */
function isDebugSignal(call: RoutingToolCall): boolean {
	const action = actionOf(call.args);
	return (
		call.toolName === DOMAIN_TOOL_IDS.EXECUTIONS &&
		action !== undefined &&
		DEBUG_EXECUTIONS_ACTIONS.has(action)
	);
}

/** Applies the route rules in order. The last two return a judge request. */
function resolveTrial(routingCase: RoutingCase, trial: RoutingTrial): PendingResolution {
	const calls = trial.toolCalls;
	const resolved = (route: Route, evidence: string): PendingResolution => ({
		kind: 'resolved',
		resolution: { route, evidence },
	});

	if (
		calls.some(
			(call) =>
				call.toolName === ORCHESTRATION_TOOL_IDS.BUILD_AGENT && call.args.operation !== 'exploring',
		)
	) {
		return resolved('agent', 'build-agent');
	}

	const buildWorkflow = calls.find((call) => call.toolName === DOMAIN_TOOL_IDS.BUILD_WORKFLOW);
	if (buildWorkflow) {
		return buildWorkflow.args.executionIntent === 'one-off'
			? resolved('one-off', 'build-workflow executionIntent=one-off')
			: resolved('workflow', 'build-workflow');
	}

	if (calls.some((call) => call.toolName === ORCHESTRATION_TOOL_IDS.CREATE_TASKS)) {
		return resolved('multi', 'create-tasks');
	}

	const oneOff = calls.find(isOneOffAction);
	if (oneOff) return resolved('one-off', describeCall(oneOff));

	const debug = calls.find(isDebugSignal);
	if (debug) return resolved('debug', describeCall(debug));

	const askUser = calls.find((call) => call.toolName === DOMAIN_TOOL_IDS.ASK_USER);
	if (askUser) {
		const card = askUserInputSchema.safeParse(askUser.args);
		return {
			kind: 'judge',
			rule: 'ask-user',
			input: {
				mode: 'ask-user',
				userMessage: routingCase.userMessage,
				askUserIntro: card.data?.introMessage,
				askUserQuestions: (card.data?.questions ?? []).map(({ question, options }) => ({
					question,
					options: options ?? [],
				})),
				finalText: trial.finalText,
			},
		};
	}

	// The text of a run that did not finish (for example a timeout) is mid-work narration, not a reply.
	if (trial.streamStatus !== 'completed' || trial.finalText === '') {
		return resolved('none', `no committing call and no finished reply (${trial.streamStatus})`);
	}

	return {
		kind: 'judge',
		rule: 'text',
		input: {
			mode: 'text',
			userMessage: routingCase.userMessage,
			askUserQuestions: [],
			finalText: trial.finalText,
		},
	};
}

/** Resolves the trial's route, and asks the judge when calls cannot decide it. */
export async function resolveRoute(
	routingCase: RoutingCase,
	trial: RoutingTrial,
	judge: (input: JudgeInput) => Promise<JudgeVerdict>,
): Promise<RouteResolution> {
	const pending = resolveTrial(routingCase, trial);
	if (pending.kind === 'resolved') return pending.resolution;
	const evidence = pending.rule === 'ask-user' ? 'ask-user' : 'final text';
	try {
		const verdict = await judge(pending.input);
		return {
			// An ask-user card is a question by construction; the judge only gives its steer.
			route: pending.rule === 'ask-user' ? 'clarify' : verdict.kind,
			steer: verdict.steer,
			evidence,
			judgeReason: verdict.reason,
		};
	} catch (error) {
		return {
			route: 'none',
			evidence: `${evidence}, judge failed`,
			judgeError: error instanceof Error ? error.message : String(error),
		};
	}
}

/** Short label for output: the route, with the steer for `clarify`. */
export function routeLabel(resolution: RouteResolution): string {
	return resolution.route === 'clarify'
		? `clarify:${resolution.steer ?? 'none'}`
		: resolution.route;
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

/**
 * A question that points toward the bucket's artifact: `clarify:agent` or
 * `clarify:both` in the agent bucket, `clarify:workflow` or `clarify:both` in
 * the workflow bucket. Other buckets have no direction.
 */
function isSameDirectionClarify(bucket: RoutingBucket, { route, steer }: RouteResolution): boolean {
	if (route !== 'clarify') return false;
	if (bucket === 'agent') return steer === 'agent' || steer === 'both';
	if (bucket === 'workflow') return steer === 'workflow' || steer === 'both';
	return false;
}

// ponytail: one score. Add the accept-tokens-only "strict" score when a report needs it (ASS-1599).
export function trialPasses(routingCase: RoutingCase, resolution: RouteResolution): boolean {
	return (
		routingCase.accepts.some((token) => acceptTokenMatches(token, resolution)) ||
		isSameDirectionClarify(routingCase.bucket, resolution)
	);
}

/** A case passes when at least 2 of 3 trials pass; other trial counts keep the ratio. */
export function casePasses(passedTrials: number, totalTrials: number): boolean {
	return totalTrials > 0 && passedTrials * 3 >= totalTrials * 2;
}
