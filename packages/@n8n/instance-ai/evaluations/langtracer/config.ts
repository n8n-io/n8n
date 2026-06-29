// lang-tracer connection config, read from the environment (secrets never via flags).

export interface LangTracerConfig {
	baseUrl: string;
	apiKey: string;
}

/** Resolve lang-tracer connection details from env; throws naming what's missing. */
export function resolveLangTracerConfig(env: NodeJS.ProcessEnv = process.env): LangTracerConfig {
	const baseUrl = env.LANGTRACER_URL?.trim();
	const apiKey = env.LANGTRACER_API_KEY?.trim();

	const missing: string[] = [];
	if (!baseUrl) missing.push('LANGTRACER_URL');
	if (!apiKey) missing.push('LANGTRACER_API_KEY');
	if (missing.length > 0) {
		throw new Error(
			`--source langtracer needs ${missing.join(' and ')} in the environment (set them in .env.local). ` +
				'LANGTRACER_URL is the lang-tracer base URL; LANGTRACER_API_KEY is an MCP bearer key (lt_…), ' +
				'minted in lang-tracer via the MCP-keys UI or the mint-mcp-key script.',
		);
	}

	return { baseUrl, apiKey };
}
