import { MCP_APP_TELEMETRY_GLOBAL, type McpAppTelemetryConfig } from '../telemetry-contract';

export {
	MCP_APP_TELEMETRY_GLOBAL,
	RUDDERSTACK_CDN_ORIGIN,
	type McpAppTelemetryConfig,
} from '../telemetry-contract';

/**
 * Inject the telemetry runtime config into app HTML before the app bundle runs.
 * `<` is escaped in serialized JSON so values cannot break out of the script.
 */
export function injectTelemetryConfig(html: string, config: McpAppTelemetryConfig): string {
	const serialized = JSON.stringify(config)
		.replace(/</g, '\\u003c')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
	const tag = `<script>window.${MCP_APP_TELEMETRY_GLOBAL}=${serialized};</script>`;

	const headMatch = /<head[^>]*>/i.exec(html);
	if (headMatch) {
		const insertAt = headMatch.index + headMatch[0].length;
		return `${html.slice(0, insertAt)}${tag}${html.slice(insertAt)}`;
	}

	return `${tag}${html}`;
}
