/**
 * Shared Anthropic client for eval LLM calls.
 *
 * Used by both Phase 1 (hint generation) and Phase 2 (per-request mock generation).
 * Lazy-initialized on first use, reads the API key from environment.
 */

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | undefined;

export function getEvalAnthropicClient(): Anthropic {
	_client ??= new Anthropic({
		apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY,
	});
	return _client;
}
