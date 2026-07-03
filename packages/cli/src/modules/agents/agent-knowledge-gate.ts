import type { AgentsConfig } from '@n8n/config';

export function isAgentKnowledgeBaseEnabled(
	config: Pick<AgentsConfig, 'sandboxEnabled' | 'sandboxProvider' | 'daytonaVolumeId'>,
): boolean {
	return (
		config.sandboxEnabled &&
		config.sandboxProvider === 'daytona' &&
		config.daytonaVolumeId.trim().length > 0
	);
}
