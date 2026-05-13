import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { RESOURCE_MIME_TYPE } from '../register-mcp-app-tool';
import { loadAppHtml } from '../resource-loader';

export const WORKFLOW_DIAGRAM_URI = 'ui://workflow-diagram/workflow-diagram.html';

export function registerWorkflowDiagramApp(server: Pick<McpServer, 'resource'>): void {
	server.resource(
		'workflow-diagram',
		WORKFLOW_DIAGRAM_URI,
		{
			description: 'Interactive workflow diagram preview',
			mimeType: RESOURCE_MIME_TYPE,
		},
		async () => ({
			contents: [
				{
					uri: WORKFLOW_DIAGRAM_URI,
					mimeType: RESOURCE_MIME_TYPE,
					text: await loadAppHtml('workflow-diagram.html'),
				},
			],
		}),
	);
}
