/**
 * Typed configuration for @n8n/agents. Add new keys here as concrete
 * optional properties so callers get compile-time checks. Avoids
 * `[key: string]: unknown` which silently accepts typos and unsupported keys.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Placeholder; will gain concrete keys as features are added.
interface AgentsConfig {}

let globalConfig: AgentsConfig = {};

/** Configure global settings for @n8n/agents (engine-level, not user-facing). */
export function configure(config: AgentsConfig): void {
	globalConfig = { ...globalConfig, ...config };
}

/** @internal Get the current global configuration. */
export function getConfig(): AgentsConfig {
	return globalConfig;
}

/** @internal Reset configuration (for testing). */
export function resetConfig(): void {
	globalConfig = {};
}
