import type { HarnessAgentAdapter } from '@ai-sdk/harness/agent';
import { createClaudeCode, type ClaudeCodeAuthOptions } from '@ai-sdk/harness-claude-code';
import { createCodex, type CodexAuthOptions } from '@ai-sdk/harness-codex';

export interface N8nHarnessAdapterOptions {
	adapter: 'claude-code' | 'codex';
	model: string;
	apiKey: string;
	baseUrl?: string;
	reasoningEffort?: 'low' | 'medium' | 'high';
	webSearch?: boolean;
}

export function createN8nHarnessAdapter(options: N8nHarnessAdapterOptions): HarnessAgentAdapter {
	if (options.adapter === 'claude-code') {
		const auth: ClaudeCodeAuthOptions = {
			anthropic: {
				apiKey: options.apiKey,
				...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
			},
		};
		return createClaudeCode({ auth, model: options.model });
	}

	const auth: CodexAuthOptions = {
		openai: {
			apiKey: options.apiKey,
			...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
		},
	};
	return createCodex({
		auth,
		model: options.model,
		...(options.reasoningEffort ? { reasoningEffort: options.reasoningEffort } : {}),
		...(options.webSearch !== undefined ? { webSearch: options.webSearch } : {}),
	});
}
