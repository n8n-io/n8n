import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { RESOURCE_MIME_TYPE } from '../register-mcp-app-tool';
import { loadAppHtml } from '../resource-loader';

export const CREDENTIAL_SETUP_URI = 'ui://credential-setup/credential-setup.html';

export function registerCredentialSetupApp(server: Pick<McpServer, 'resource'>): void {
	server.resource(
		'credential-setup',
		CREDENTIAL_SETUP_URI,
		{
			description: 'Credential setup form for n8n MCP builder tools',
			mimeType: RESOURCE_MIME_TYPE,
		},
		async () => ({
			contents: [
				{
					uri: CREDENTIAL_SETUP_URI,
					mimeType: RESOURCE_MIME_TYPE,
					text: await loadAppHtml('credential-setup.html'),
				},
			],
		}),
	);
}
