import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerWorkflowDiagramApp } from './apps/workflow-diagram';

export async function registerMcpApps(server: Pick<McpServer, 'resource'>): Promise<void> {
	registerWorkflowDiagramApp(server);
}
