import type { McpUiResourceMeta } from '@modelcontextprotocol/ext-apps';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
	RESOURCE_MIME_TYPE,
	WORKFLOW_PREVIEW_APP_URI,
	WORKFLOW_PREVIEW_FRAME_DOMAINS,
} from '../constants';
import { loadAppHtml } from '../resource-loader';

const WORKFLOW_PREVIEW_UI_META: McpUiResourceMeta = {
	csp: {
		frameDomains: [...WORKFLOW_PREVIEW_FRAME_DOMAINS],
	},
	prefersBorder: false,
};

export function registerWorkflowPreviewApp(server: Pick<McpServer, 'resource'>): void {
	server.resource(
		'workflow-preview',
		WORKFLOW_PREVIEW_APP_URI,
		{
			description: 'Workflow preview shown after creating a workflow from code',
			mimeType: RESOURCE_MIME_TYPE,
			_meta: {
				ui: WORKFLOW_PREVIEW_UI_META,
			},
		},
		async () => ({
			contents: [
				{
					uri: WORKFLOW_PREVIEW_APP_URI,
					mimeType: RESOURCE_MIME_TYPE,
					text: await loadAppHtml('workflow-preview.html'),
					_meta: {
						ui: WORKFLOW_PREVIEW_UI_META,
					},
				},
			],
		}),
	);
}
