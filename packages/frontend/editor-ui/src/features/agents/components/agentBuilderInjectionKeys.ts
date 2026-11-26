import type { ComputedRef, InjectionKey } from 'vue';
import type { AgentTestHandoffParams } from '@/features/ai/instanceAi/composables/useInstanceAiAgentTestHandoff';

/**
 * Provided by `AgentBuilderView`. Runs a write that changes the agent's saved config on the
 * server, such as applying an eval suggestion. The builder saves its pending edits first and
 * locks editing while the write runs. It always reloads the config afterwards, even if the
 * write threw: the server may have saved before a later step failed, and the editor must not
 * keep the old config hash.
 */
export type AgentConfigWrite = <T>(write: () => Promise<T>) => Promise<T>;

export const AGENT_CONFIG_WRITE_KEY: InjectionKey<AgentConfigWrite> = Symbol('agentConfigWrite');

/** Scope standalone builder controls to the Agents UI. */
export const AGENT_BUILDER_STANDALONE_KEY: InjectionKey<boolean> = Symbol('agentBuilderStandalone');

export const AGENT_SESSION_ASSISTANT_KEY: InjectionKey<{
	isAvailable: ComputedRef<boolean>;
	handoff: (params: AgentTestHandoffParams) => Promise<boolean>;
}> = Symbol('agentSessionAssistant');
