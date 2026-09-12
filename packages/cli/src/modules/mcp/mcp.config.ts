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

	/**
	 * Whether the workflow-builder tools may offer verified community nodes that
	 * are not installed on this instance, and install them on request.
	 *
	 * When off, `search_nodes` and `get_node_types` report installed nodes only
	 * and `install_community_node` is not registered at all. Installing still
	 * additionally requires the MCP client to hold the `communityPackage:install`
	 * scope and the user to hold that global scope, so turning this on does not
	 * by itself grant any client the ability to install packages.
	 */
	@Env('N8N_MCP_COMMUNITY_NODE_DISCOVERY_ENABLED')
	communityNodeDiscoveryEnabled: boolean = true;
}
