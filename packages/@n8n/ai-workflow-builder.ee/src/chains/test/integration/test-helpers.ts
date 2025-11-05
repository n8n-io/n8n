import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { anthropicClaudeSonnet45 } from '@/llm-config';

/**
 * Sets up the LLM for integration testing
 * This is a simplified version that doesn't require node loading
 *
 * @returns Configured LLM instance
 * @throws Error if N8N_AI_ANTHROPIC_KEY environment variable is not set
 */
export async function setupIntegrationLLM(): Promise<BaseChatModel> {
	const apiKey = process.env.N8N_AI_ANTHROPIC_KEY;
	if (!apiKey) {
		throw new Error('N8N_AI_ANTHROPIC_KEY environment variable is required for integration tests');
	}
	return await anthropicClaudeSonnet45({ apiKey });
}

/**
 * Check if integration tests should run
 * Integration tests are skipped unless ENABLE_INTEGRATION_TESTS=true
 *
 * @returns True if integration tests should run
 */
export function shouldRunIntegrationTests(): boolean {
	return process.env.ENABLE_INTEGRATION_TESTS === 'true';
}
