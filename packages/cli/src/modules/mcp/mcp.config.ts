import { Config, Env, nonnegativeIntSchema } from '@n8n/config';

/** Configuration for the instance MCP server module. */
@Config
export class McpConfig {
	/**
	 * Maximum number of requests to the MCP server endpoint (`/mcp-server/http`)
	 * per IP per 5 minutes. Set to `0` to disable IP rate limiting for the endpoint.
	 */
	@Env('N8N_MCP_SERVER_RATE_LIMIT', nonnegativeIntSchema)
	rateLimitServer: number = 100;
}
