/**
 * Shared Anthropic client for eval LLM calls.
 *
 * Used by both Phase 1 (hint generation) and Phase 2 (per-request mock generation).
 * Lazy-initialized on first use, reads the API key from environment.
 */

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | undefined;

export function getEvalAnthropicClient(): Anthropic {
	if (!_client) {
		const apiKey = process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			throw new Error(
				'Eval mock execution requires an Anthropic API key. Set N8N_AI_ANTHROPIC_KEY or ANTHROPIC_API_KEY.',
			);
		}
		_client = new Anthropic({ apiKey });
	}
	return _client;
}
