import { Config, Env } from '@n8n/config';
import { z } from 'zod';

/** Configuration for the instance MCP server module. */
@Config
export class McpConfig {
	/** Maximum number of requests to the MCP server endpoint (`/mcp-server/http`) per IP per 5 minutes. */
	@Env('N8N_MCP_SERVER_RATE_LIMIT', z.number({ coerce: true }).int().positive())
	rateLimitServer: number = 100;
}
