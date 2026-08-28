const AGENTS_MODULE_NAME = 'agents';

export function isAgentFeatureEnabled(): boolean {
	const enabledModules = new Set(
		(process.env.N8N_ENABLED_MODULES ?? '')
			.split(',')
			.map((moduleName) => moduleName.trim())
			.filter((moduleName) => moduleName.length > 0),
	);

	return enabledModules.has(AGENTS_MODULE_NAME);
}
