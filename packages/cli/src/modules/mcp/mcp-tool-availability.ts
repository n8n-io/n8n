import type { ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';

export function areAgentToolsAvailable(
	globalConfig: GlobalConfig,
	moduleRegistry: ModuleRegistry,
): boolean {
	return globalConfig.endpoints.mcpBuilderEnabled && moduleRegistry.isActive('agents');
}
