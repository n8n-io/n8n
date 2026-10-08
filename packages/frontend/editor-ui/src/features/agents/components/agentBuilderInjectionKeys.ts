import type { InjectionKey } from 'vue';

/**
 * Provided by `AgentBuilderView`: resolves once every pending local edit has been
 * saved. A feature that changes the agent on the server reads the saved config, so
 * it must wait for this first or the edit would be lost or conflict.
 */
export type AgentConfigFlush = () => Promise<void>;

export const AGENT_CONFIG_FLUSH_KEY: InjectionKey<AgentConfigFlush> = Symbol('agentConfigFlush');
