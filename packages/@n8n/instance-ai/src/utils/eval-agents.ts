/**
 * Shared agent factory for eval LLM calls.
 *
 * Centralizes model config, API key resolution, and text extraction
 * for the 3 eval call sites (hint generation, mock responses, pin data).
 */

import { Agent, type GenerateResult } from '@n8n/agents';

// ---------------------------------------------------------------------------
// Model constants
// ---------------------------------------------------------------------------

export const SONNET_MODEL = 'anthropic/claude-sonnet-4-6';
export const HAIKU_MODEL = 'anthropic/claude-haiku-4-5-20251001';

// ---------------------------------------------------------------------------
// API key resolution
// ---------------------------------------------------------------------------

function getApiKey(): string {
	const key = process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
	if (!key) throw new Error('Missing ANTHROPIC_API_KEY or N8N_AI_ANTHROPIC_KEY');
	return key;
}

// ---------------------------------------------------------------------------
// Agent factory
// ---------------------------------------------------------------------------

const CACHE_PROVIDER_OPTS = {
	providerOptions: {
		anthropic: { cacheControl: { type: 'ephemeral' as const } },
	},
};

export function createEvalAgent(
	name: string,
	options: {
		model?: string;
		instructions: string;
		cache?: boolean;
	},
): Agent {
	const agent = new Agent(name).model({
		id: options.model ?? SONNET_MODEL,
		apiKey: getApiKey(),
	});

	if (options.cache) {
		agent.instructions(options.instructions, CACHE_PROVIDER_OPTS);
	} else {
		agent.instructions(options.instructions);
	}

	return agent;
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

export function extractText(result: GenerateResult): string {
	return result.messages
		.filter((m) => 'role' in m && m.role === 'assistant')
		.flatMap((m) => ('content' in m ? m.content : []))
		.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
		.map((c) => c.text)
		.join('');
}
