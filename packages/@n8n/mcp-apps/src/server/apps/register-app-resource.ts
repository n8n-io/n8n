import type { McpUiResourceMeta } from '@modelcontextprotocol/ext-apps';

import { RESOURCE_MIME_TYPE } from '../constants';
import { loadAppHtml, type McpAppHtmlFileName } from '../resource-loader';
import {
	injectTelemetryConfig,
	RUDDERSTACK_CDN_ORIGIN,
	type McpAppTelemetryConfig,
} from '../telemetry-config';

/**
 * Minimal server surface the app registration helpers need. Both MCP SDK
 * generations satisfy it structurally (`registerResource` exists on the 1.x
 * and the v2 McpServer), so the helpers do not tie their callers to either
 * SDK's type identity.
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

export interface RegisterMcpAppOptions {
	/** Origin allowed for telemetry egress via CSP `connect-src`. */
	instanceOrigin?: string;
	/** Front-end telemetry runtime config injected into the app HTML. */
	telemetry: McpAppTelemetryConfig;
	/** Called when the host reads the app HTML to render it. */
	onResourceRead?: () => void;
}

interface McpAppResourceDefinition {
	/** MCP resource name, e.g. `workflow-preview`. */
	name: string;
	/** Resource URI referenced by tool `_meta`, e.g. `ui://.../app.html`. */
	uri: string;
	/** Built HTML file under `dist/apps/`. */
	htmlFile: McpAppHtmlFileName;
	description: string;
}

function getAppUiMeta(instanceOrigin?: string): McpUiResourceMeta {
	return {
		csp: {
			// Workflow graphs are rendered by the bundled editor canvas, so the
			// apps need no frame domains — a deliberately empty list, since MCP
			// hosts scrutinize frame-src allowances.
			frameDomains: [],
			resourceDomains: instanceOrigin ? [RUDDERSTACK_CDN_ORIGIN] : [],
			connectDomains: instanceOrigin ? [instanceOrigin] : [],
		},
		prefersBorder: false,
	};
}

/** Registers a single-file MCP app HTML resource with telemetry injection. */
export function registerMcpAppResource(
	server: McpAppResourceServer,
	{ name, uri, htmlFile, description }: McpAppResourceDefinition,
	options: RegisterMcpAppOptions,
): void {
	const { instanceOrigin, telemetry, onResourceRead } = options;
	const uiMeta = getAppUiMeta(instanceOrigin);

	server.registerResource(
		name,
		uri,
		{
			description,
			mimeType: RESOURCE_MIME_TYPE,
			_meta: {
				ui: uiMeta,
			},
		},
		async () => {
			const html = await loadAppHtml(htmlFile);

			try {
				onResourceRead?.();
			} catch {
				// Telemetry must never break serving the app resource.
			}

			return {
				contents: [
					{
						uri,
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
