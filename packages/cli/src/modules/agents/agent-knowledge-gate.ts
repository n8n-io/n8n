import type { AgentsConfig } from '@n8n/config';

export function isAgentKnowledgeBaseEnabled(
	config: Pick<AgentsConfig, 'sandboxEnabled' | 'sandboxProvider'>,
	aiAssistantAvailable: boolean,
): boolean {
	return aiAssistantAvailable || (config.sandboxEnabled && config.sandboxProvider === 'daytona');
}
