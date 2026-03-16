interface TracingConfig {
	exporter?: unknown;
}

interface AgentsConfig {
	tracing?: TracingConfig;
}

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
