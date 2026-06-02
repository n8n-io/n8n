import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { RESOURCE_MIME_TYPE, WORKFLOW_PREVIEW_APP_URI } from '../constants';
import { loadAppHtml } from '../resource-loader';

export function registerWorkflowPreviewApp(server: Pick<McpServer, 'resource'>): void {
	server.resource(
		'workflow-preview',
		WORKFLOW_PREVIEW_APP_URI,
		{
			description: 'Loading UI shown after creating a workflow from code',
			mimeType: RESOURCE_MIME_TYPE,
		},
		async () => ({
			contents: [
				{
					uri: WORKFLOW_PREVIEW_APP_URI,
					mimeType: RESOURCE_MIME_TYPE,
					text: await loadAppHtml('workflow-preview.html'),
				},
			],
		}),
	);
}
