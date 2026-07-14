import { Config, Env } from '@n8n/config';
import { z } from 'zod';

/** Normalized to origin + path without a trailing slash; query and fragment are dropped. */
const baseUrlSchema = z
	.string()
	.refine(
		(value) => {
			try {
				const url = new URL(value);
				return url.protocol === 'http:' || url.protocol === 'https:';
			} catch {
				return false;
			}
		},
		{ message: 'Must be a valid http(s) URL' },
	)
	.transform((value) => {
		const url = new URL(value);
		return `${url.origin}${url.pathname}`.replace(/\/$/, '');
	});

/** Configuration for the instance MCP server module. */
@Config
export class McpConfig {
	/**
	 * Maximum number of requests to the MCP server endpoint (`/mcp-server/http`)
	 * per IP per 5 minutes. Set to `0` to disable IP rate limiting for the endpoint.
	 */
	@Env('N8N_MCP_SERVER_RATE_LIMIT', z.number({ coerce: true }).int().nonnegative())
	rateLimitServer: number = 100;

	/**
	 * Public base URL at which MCP clients reach this instance's MCP server,
	 * when it differs from the instance base URL — for split-hostname
	 * deployments that front the same backend with a dedicated MCP hostname
	 * (e.g. `https://n8n-mcp.example.com` while `N8N_EDITOR_BASE_URL` stays on
	 * the main UI hostname). When set, it becomes the canonical MCP resource
	 * URL: advertised in discovery, accepted as an RFC 8707 resource indicator,
	 * and used as the access-token audience. The instance-base-URL-derived
	 * resource remains accepted so existing clients keep working.
	 *
	 * @example N8N_MCP_BASE_URL=https://n8n-mcp.example.com
	 */
	@Env('N8N_MCP_BASE_URL', baseUrlSchema)
	baseUrl: string = '';
}
