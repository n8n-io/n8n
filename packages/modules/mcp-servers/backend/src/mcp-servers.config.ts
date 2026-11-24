import { Config, Env, nonnegativeIntSchema } from '@n8n/config';

@Config
export class McpServersConfig {
	/** Maximum tool calls that can run at the same time for each custom MCP server, in each main process. When a server reaches this limit, n8n answers new calls with an error that says the server is busy. Set to 0 to remove the limit. */
	@Env('N8N_MCP_SERVERS_MAX_CONCURRENT_RUNS', nonnegativeIntSchema)
	maxConcurrentRuns: number = 10;
}
