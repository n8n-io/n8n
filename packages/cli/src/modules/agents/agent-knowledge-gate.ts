import type { AgentsConfig } from '@n8n/config';

export function isAgentKnowledgeBaseEnabled(
	config: Pick<AgentsConfig, 'sandboxEnabled' | 'sandboxProvider'>,
): boolean {
	return config.sandboxEnabled && config.sandboxProvider === 'daytona';
}
