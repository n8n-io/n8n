import { Config, Env, nonnegativeIntSchema } from '@n8n/config';

@Config
export class McpServersConfig {
	/** Maximum tool calls that can run at the same time for each custom MCP server, in each main process. When a server reaches this limit, n8n answers new calls with an error that says the server is busy. Set to 0 to remove the limit. */
	@Env('N8N_MCP_SERVERS_MAX_CONCURRENT_RUNS', nonnegativeIntSchema)
	maxConcurrentRuns: number = 10;

	/** Maximum requests from one IP address to the endpoints of custom MCP servers, in each five-minute window. Set to 0 to turn off this limit. */
	@Env('N8N_MCP_SERVERS_RATE_LIMIT', nonnegativeIntSchema)
	rateLimit: number = 100;
}
