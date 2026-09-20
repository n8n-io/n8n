import {
	NullDecisionService,
	type DecisionService,
} from '../workflow-compiler/decision/decision-service';
import { resolveChoice, type DecisionThresholds } from '../workflow-compiler/decision/policy';
import { NONE_OF_THESE } from '../workflow-compiler/decision/schemas';
import { isQuestionOnly, isSmallTalk, scoreCues, vetoedRoutes } from './features';
import {
	INTENT_ROUTES,
	ROUTE_CRITERIA,
	type IntentRoute,
	type RouteDecision,
	type RouterState,
} from './schemas';

export const INTENT_ROUTER_SCHEMA_VERSION = 'intent-router-v2';

export interface RouteIntentInput {
	message: string;
	state: RouterState;
	decisions?: DecisionService;
	thresholds?: Partial<DecisionThresholds>;
	abortSignal?: AbortSignal;
}

function orchestrator(
	reason: string,
	source: RouteDecision['source'],
	confidence = 1,
	read?: RouteDecision['read'],
): RouteDecision {
	return { route: 'orchestrator', confidence, source, reason, ...(read ? { read } : {}) };
}

/**
 * Chooses the route for a chat turn without a language model in the loop:
 *
 * 1. A compiler session waiting for a reply always gets the reply (`answer`).
 * 2. Small talk and pure questions go to the orchestrator without a read.
 * 3. Otherwise one structured read scores the bounded routes; deterministic
 *    cues are the prior and vetoes drop routes that cannot apply. Anything
 *    below the act threshold falls back to the orchestrator, so the LLM only
 *    runs when the fast path is not confident it can serve the turn.
 */
export async function routeIntent(input: RouteIntentInput): Promise<RouteDecision> {
	const { message, state } = input;
	if (state.pendingSession) {
		return {
			route: 'answer',
			confidence: 1,
			source: 'pending_session',
			reason: `a ${state.pendingSession.kind} compiler session is waiting for ${state.pendingSession.fields.join(', ')}`,
		};
	}
	if (isSmallTalk(message)) return orchestrator('small talk', 'rule');
	if (isQuestionOnly(message)) return orchestrator('question without a build request', 'rule');

	const vetoes = vetoedRoutes(state);
	const allowed = INTENT_ROUTES.filter(
		(route): route is Exclude<IntentRoute, 'answer'> => route !== 'answer' && !(route in vetoes),
	);
	const cues = scoreCues(message);
	const prior: Record<string, number> = {};
	const criteria: Record<string, string | null> = {};
	for (const route of allowed) {
		prior[route] = cues.scores[route] ?? 0;
		criteria[route] = ROUTE_CRITERIA[route];
	}
	// The orchestrator is the safe default, so it always keeps prior mass: one
	// strong cue (weight 3) clears the act threshold alone, weaker or conflicting
	// cues do not.
	prior.orchestrator = Math.max(prior.orchestrator ?? 0, 0.75);

	const decisions = input.decisions ?? new NullDecisionService();
	const outcome = await decisions.decide({
		name: 'intent-router.route',
		schemaVersion: INTENT_ROUTER_SCHEMA_VERSION,
		state: {
			message,
			boundWorkflow: Boolean(state.boundWorkflowId),
			boundAgent: Boolean(state.boundAgentRef),
		},
		questions: {
			route: {
				type: 'choice',
				instructions:
					'Which path should serve this chat message? Choose the compiler paths only when the message asks to build, change, debug or test the artifact; choose orchestrator for everything else.',
				criteria,
			},
		},
		abortSignal: input.abortSignal,
	});
	const answer = outcome.ok ? outcome.answers.route : undefined;
	const read: RouteDecision['read'] = {
		latencyMs: outcome.latencyMs,
		backend: decisions.kind,
		...(answer?.type === 'choice' ? { probabilities: answer.probabilities } : {}),
	};
	const resolution = resolveChoice({ allowed, answer, prior, thresholds: input.thresholds });
	if (resolution.status !== 'chosen')
		return orchestrator(
			resolution.reason === 'unavailable'
				? 'no decision backend and cues were not decisive'
				: `read below the act threshold (${resolution.confidence.toFixed(2)}${resolution.best ? `, best ${resolution.best}` : ''})`,
			'fallback',
			resolution.confidence,
			read,
		);
	const source = resolution.source === 'prior' ? 'prior' : 'decision';
	if (resolution.value === 'orchestrator' || resolution.value === NONE_OF_THESE)
		return orchestrator('the read chose the orchestrator', source, resolution.confidence, read);
	return {
		route: resolution.value as IntentRoute,
		confidence: resolution.confidence,
		source,
		reason:
			source === 'prior'
				? `cues ${cues.matched.join(', ')} were decisive without a read`
				: 'structured read above the act threshold',
		read,
	};
}
