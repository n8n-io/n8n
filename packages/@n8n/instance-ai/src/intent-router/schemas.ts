import { z } from 'zod';

/**
 * Bounded routes a chat turn can take before any language model runs. Every
 * route except `orchestrator` is served by deterministic code (the compilers);
 * `orchestrator` is the only route that invokes the LLM agent.
 */
export const INTENT_ROUTES = [
	'workflow.create',
	'workflow.edit',
	'workflow.debug',
	'agent.create',
	'agent.edit',
	'agent.verify',
	'answer',
	'orchestrator',
] as const;
export const intentRouteSchema = z.enum(INTENT_ROUTES);
export type IntentRoute = z.infer<typeof intentRouteSchema>;

export const ROUTE_CRITERIA: Record<Exclude<IntentRoute, 'answer'>, string> = {
	'workflow.create':
		'Build a new automation or workflow: a trigger (endpoint, schedule, event) followed by actions in integrations.',
	'workflow.edit':
		'Change an existing workflow the conversation already targets: add, remove or adjust steps, settings or values.',
	'workflow.debug':
		'Diagnose or repair a workflow that fails, errors, or behaves wrongly, usually with an execution to look at.',
	'agent.create':
		'Build a new conversational agent, bot or assistant that chats with people (optionally on Slack, Telegram, Discord or Linear) and uses tools.',
	'agent.edit':
		'Change an agent the conversation already targets: tools, channel, model, memory, rules, schedule or name.',
	'agent.verify':
		'Test or verify an agent the conversation already targets by running its behavior scenarios.',
	orchestrator:
		'Anything else: questions, explanations, one-off operations, data tables, credentials, publishing, multi-artifact planning, or unclear requests.',
};

/** Conversation state the router reads. All deterministic, all cheap. */
export interface RouterState {
	/** A compiler session is waiting for the user's reply. */
	pendingSession?: { kind: 'workflow' | 'agent'; sessionId: string; fields: string[] };
	/** The conversation already targets a saved workflow (opened from the editor or built earlier). */
	boundWorkflowId?: string;
	/** The conversation already targets an agent. */
	boundAgentRef?: string;
	/** Route the previous turn took, when known. */
	previousRoute?: IntentRoute;
	/** The message carries attachments the compilers cannot read. */
	hasAttachments?: boolean;
	/** The user explicitly targets a planned multi-step task graph. */
	hasActivePlan?: boolean;
}

export interface RouteDecision {
	route: IntentRoute;
	confidence: number;
	source: 'pending_session' | 'rule' | 'decision' | 'prior' | 'fallback';
	/** Why the router chose this route, for logs and evaluation. */
	reason: string;
	/** Answers and latency from the structured read, when one ran. */
	read?: { latencyMs: number; backend: string; probabilities?: Record<string, number> };
}
