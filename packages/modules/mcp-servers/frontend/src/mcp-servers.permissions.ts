import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { getResourcePermissions } from '@n8n/permissions';

/** Whether the PostHog flag turns custom MCP servers on. No provider means off. */
export function isCustomMcpServersEnabled() {
	return capabilityRegistry.tryUse(capabilities.customMcpServersEnabled)?.() === true;
}

export function getMcpServerPermissions(projectId: string) {
	const permissions = capabilityRegistry.use(capabilities.projectPermissions);
	const mcpServer = getResourcePermissions(permissions.scopesFor(projectId)).mcpServer;

	return {
		canList: Boolean(mcpServer?.list),
		canRead: Boolean(mcpServer?.read),
	};
}
