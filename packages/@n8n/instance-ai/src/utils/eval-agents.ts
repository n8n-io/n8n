/** Shared agent factory + helpers for eval LLM calls (hint generation, mock responses, pin data). */

import { Agent, Tool, type GenerateResult } from '@n8n/agents';

export { Tool };

// ---------------------------------------------------------------------------
// Model constants
// ---------------------------------------------------------------------------

export const SONNET_MODEL = 'anthropic/claude-sonnet-4-6';
export const HAIKU_MODEL = 'anthropic/claude-haiku-4-5-20251001';

// ---------------------------------------------------------------------------
// API key resolution
// ---------------------------------------------------------------------------

function getApiKey(): string {
	const key =
		process.env.N8N_INSTANCE_AI_MODEL_API_KEY ??
		process.env.N8N_AI_ANTHROPIC_KEY ??
		process.env.ANTHROPIC_API_KEY;
	if (!key) {
		throw new Error(
			'Missing API key. Set N8N_INSTANCE_AI_MODEL_API_KEY, N8N_AI_ANTHROPIC_KEY, or ANTHROPIC_API_KEY in your environment.',
		);
	}
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
		/**
		 * Extended-thinking config:
		 * - 'adaptive' (default): model decides per request.
		 * - 'off': no thinking.
		 * - { budgetTokens: N }: fixed budget mode.
		 */
		thinking?: 'adaptive' | 'off' | { budgetTokens: number };
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

	const thinking = options.thinking ?? 'adaptive';
	if (thinking === 'adaptive') {
		agent.thinking('anthropic', { mode: 'adaptive' });
	} else if (typeof thinking === 'object') {
		agent.thinking('anthropic', { mode: 'enabled', budgetTokens: thinking.budgetTokens });
	}

	return agent;
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

export function extractText(result: GenerateResult): string {
	const texts: string[] = [];
	for (const msg of result.messages) {
		if (!('role' in msg) || msg.role !== 'assistant') continue;
		if (!('content' in msg) || !Array.isArray(msg.content)) continue;
		for (const part of msg.content) {
			if (
				typeof part === 'object' &&
				part !== null &&
				'type' in part &&
				part.type === 'text' &&
				'text' in part
			) {
				texts.push(String(part.text));
			}
		}
	}
	return texts.join('');
}
