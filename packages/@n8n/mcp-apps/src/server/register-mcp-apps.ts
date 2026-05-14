import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerCredentialSetupApp } from './apps/credential-setup';
import { registerWorkflowDiagramApp } from './apps/workflow-diagram';

export async function registerMcpApps(server: Pick<McpServer, 'resource'>): Promise<void> {
	registerWorkflowDiagramApp(server);
	registerCredentialSetupApp(server);
}
