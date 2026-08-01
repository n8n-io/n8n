import { inject, provide, type InjectionKey, type Ref } from 'vue';

/**
 * Shared state for an agent that has an id but no row yet.
 *
 * The config panel and its capability sections sit several components apart but
 * all need the same two things: whether the agent still needs creating, and the
 * call that creates it. Provided rather than drilled so a new write surface only
 * has to inject, and so surfaces that never see a draft (the full-page route,
 * the node NDV) get the inert default.
 */
export interface AgentDraftContext {
	/** True while the agent id has no row behind it. */
	isPending: Ref<boolean> | { value: boolean };
	/** Creates the agent if it is still pending; a no-op otherwise. */
	ensurePersisted: () => Promise<void>;
}

const AGENT_DRAFT_CONTEXT: InjectionKey<AgentDraftContext> = Symbol('agentDraftContext');

const INERT: AgentDraftContext = {
	isPending: { value: false },
	ensurePersisted: async () => {},
};

export function provideAgentDraftContext(context: AgentDraftContext): void {
	provide(AGENT_DRAFT_CONTEXT, context);
}

/** Defaults to "already persisted" so hosts that never deal with drafts need no wiring. */
export function useAgentDraftContext(): AgentDraftContext {
	return inject(AGENT_DRAFT_CONTEXT, INERT);
}
