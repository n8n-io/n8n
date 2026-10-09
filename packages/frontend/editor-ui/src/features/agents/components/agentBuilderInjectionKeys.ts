import type { InjectionKey } from 'vue';

/**
 * Provided by `AgentBuilderView`. Runs a write that changes the agent's saved config on the
 * server, such as applying an eval suggestion. The builder saves its pending edits first and
 * locks editing while the write runs. It always reloads the config afterwards, even if the
 * write threw: the server may have saved before a later step failed, and the editor must not
 * keep the old config hash.
 */
export type AgentConfigWrite = <T>(write: () => Promise<T>) => Promise<T>;

export const AGENT_CONFIG_WRITE_KEY: InjectionKey<AgentConfigWrite> = Symbol('agentConfigWrite');
