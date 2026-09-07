import type { FetchFn } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { createEvalAgent, extractText } from '@n8n/instance-ai';
import { jsonParse } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Shared plumbing for the eval mocks (MCP, web search): steered LLM-to-JSON
// generation with retry, and fetch-input helpers.
// ---------------------------------------------------------------------------

const GENERATOR_TIMEOUT_MS = 120_000;
const MAX_GENERATOR_ATTEMPTS = 2;

function fenceStrip(raw: string): string {
	return raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
}

/**
 * Generate JSON with the eval agent and validate its shape, retrying once on
 * unusable output. Returns undefined when both attempts fail — callers supply
 * their own degraded fallback.
 */
export async function generateJson<T>(
	agentName: string,
	instructions: string,
	userPrompt: string,
	validate: (parsed: unknown) => T | undefined,
	logger: Logger,
): Promise<T | undefined> {
	for (let attempt = 1; attempt <= MAX_GENERATOR_ATTEMPTS; attempt++) {
		try {
			const agent = createEvalAgent(agentName, { instructions });
			const result = await agent.generate(userPrompt, {
				providerOptions: { anthropic: { maxTokens: 4096 } },
				abortSignal: AbortSignal.timeout(GENERATOR_TIMEOUT_MS),
			});
			const parsed = jsonParse<unknown>(fenceStrip(extractText(result)), {
				fallbackValue: undefined,
			});
			const validated = validate(parsed);
			if (validated !== undefined) return validated;
			logger.warn(`[EvalMock] ${agentName} attempt ${attempt} returned an unusable shape`);
		} catch (error) {
			logger.warn(
				`[EvalMock] ${agentName} attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	return undefined;
}

export function resolveUrl(input: Parameters<FetchFn>[0]): string {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.toString();
	return input.url;
}
