import { inject, provide, ref, type InjectionKey, type Ref } from 'vue';

import { type EnsurePersisted } from './useAgentEnsurePersisted';
/**
 * Shared state for an agent that has an id but no row yet.
 *
 * The config panel and its capability sections sit several components apart but
 * all need the same two things: whether the agent still needs creating, and the
 * call that creates it. Provided rather than drilled so a new write surface only
 * has to inject, and so surfaces that never see a draft (the full-page route,
 * the node NDV) get the inert default.
 *
 * Consume this only from **descendant** components. A composable that runs
 * inside the providing component itself will get the inert default — Vue's
 * `inject` resolves against the parent chain, never the component's own
 * `provide`.
 */
export interface AgentDraftContext {
	/** True while the agent id has no row behind it. */
	isPending: Ref<boolean>;
	/**
	 * Creates the agent if it is still pending.
	 * Returns which of the three outcomes occurred so callers can decide whether
	 * their snapshot is still safe to write.
	 */
	ensurePersisted: EnsurePersisted;
}

const AGENT_DRAFT_CONTEXT: InjectionKey<AgentDraftContext> = Symbol('agentDraftContext');

const INERT: AgentDraftContext = {
	isPending: ref(false),
	ensurePersisted: async () => 'already-persisted',
};

export function provideAgentDraftContext(context: AgentDraftContext): void {
	provide(AGENT_DRAFT_CONTEXT, context);
}

/** Defaults to "already persisted" so hosts that never deal with drafts need no wiring. */
export function useAgentDraftContext(): AgentDraftContext {
	return inject(AGENT_DRAFT_CONTEXT, INERT);
}
