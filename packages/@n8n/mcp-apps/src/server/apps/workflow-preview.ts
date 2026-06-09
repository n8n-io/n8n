import type { McpUiResourceMeta } from '@modelcontextprotocol/ext-apps';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
	RESOURCE_MIME_TYPE,
	WORKFLOW_PREVIEW_APP_URI,
	WORKFLOW_PREVIEW_FRAME_DOMAINS,
} from '../constants';
import { loadAppHtml } from '../resource-loader';
import {
	injectTelemetryConfig,
	RUDDERSTACK_CDN_ORIGIN,
	type McpAppTelemetryConfig,
} from '../telemetry-config';

export interface RegisterWorkflowPreviewAppOptions {
	/** Origin allowed for telemetry egress via CSP `connect-src`. */
	instanceOrigin?: string;
	/** Front-end telemetry runtime config injected into the app HTML. */
	telemetry: McpAppTelemetryConfig;
	/** Called when the host reads the app HTML to render it. */
	onResourceRead?: () => void;
}

function getWorkflowPreviewUiMeta(instanceOrigin?: string): McpUiResourceMeta {
	return {
		csp: {
			frameDomains: [...WORKFLOW_PREVIEW_FRAME_DOMAINS],
			resourceDomains: instanceOrigin ? [RUDDERSTACK_CDN_ORIGIN] : [],
			connectDomains: instanceOrigin ? [instanceOrigin] : [],
		},
		prefersBorder: false,
	};
}

export function registerWorkflowPreviewApp(
	server: Pick<McpServer, 'resource'>,
	options: RegisterWorkflowPreviewAppOptions,
): void {
	const { instanceOrigin, telemetry, onResourceRead } = options;
	const uiMeta = getWorkflowPreviewUiMeta(instanceOrigin);

	server.resource(
		'workflow-preview',
		WORKFLOW_PREVIEW_APP_URI,
		{
			description: 'Workflow preview shown after creating a workflow from code',
			mimeType: RESOURCE_MIME_TYPE,
			_meta: {
				ui: uiMeta,
			},
		},
		async () => {
			const html = await loadAppHtml('workflow-preview.html');

			try {
				onResourceRead?.();
			} catch {
				// Telemetry must never break serving the app resource.
			}

			return {
				contents: [
					{
						uri: WORKFLOW_PREVIEW_APP_URI,
						mimeType: RESOURCE_MIME_TYPE,
						text: injectTelemetryConfig(html, telemetry),
						_meta: {
							ui: uiMeta,
						},
					},
				],
			};
		},
	);
}
