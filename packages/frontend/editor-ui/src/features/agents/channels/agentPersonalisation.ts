import { resolveAgentPersonalisation, type AgentPersonalisation } from '@n8n/api-types';
import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue';

/**
 * The agent's icon and gradient, with defaults applied. Injected rather than
 * passed down, because only the views that show the agent read it. Use the
 * helpers below so every reader gets the same default; tests may use the key.
 */
export const AGENT_PERSONALISATION_KEY: InjectionKey<ComputedRef<AgentPersonalisation>> =
	Symbol('agentPersonalisation');

/** Takes the raw value; the defaults are applied here, not by the caller. */
export function provideAgentPersonalisation(
	source: () => Partial<AgentPersonalisation> | null | undefined,
): void {
	provide(
		AGENT_PERSONALISATION_KEY,
		computed(() => resolveAgentPersonalisation(source())),
	);
}

/** Falls back to the defaults, so a view still renders without a provider. */
export function injectAgentPersonalisation(): ComputedRef<AgentPersonalisation> {
	return inject(
		AGENT_PERSONALISATION_KEY,
		() => computed(() => resolveAgentPersonalisation(null)),
		true,
	);
}
