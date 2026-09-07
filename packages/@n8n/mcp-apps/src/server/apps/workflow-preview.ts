import type { McpUiResourceMeta } from '@modelcontextprotocol/ext-apps';

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

/**
 * Minimal server surface this helper needs. Both MCP SDK generations satisfy
 * it structurally (`registerResource` exists on the 1.x and the v2 McpServer),
 * so the helper does not tie its caller to either SDK's type identity.
 */
export interface McpAppResourceServer {
	registerResource(
		name: string,
		uri: string,
		metadata: { description?: string; mimeType?: string; _meta?: Record<string, unknown> },
		readCallback: () => Promise<{
			contents: Array<{
				uri: string;
				mimeType: string;
				text: string;
				_meta?: Record<string, unknown>;
			}>;
		}>,
	): unknown;
}

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
	server: McpAppResourceServer,
	options: RegisterWorkflowPreviewAppOptions,
): void {
	const { instanceOrigin, telemetry, onResourceRead } = options;
	const uiMeta = getWorkflowPreviewUiMeta(instanceOrigin);

	server.registerResource(
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
