import { Time } from '@n8n/constants';

import { Config, Env } from '../decorators';

/** Configuration for the MCP Client Tool node. */
@Config
export class McpClientConfig {
	/**
	 * Time in milliseconds a cached MCP client is kept alive after its last use
	 * before being evicted. Keeping the client open lets all tool calls within a
	 * single workflow execution share one MCP session (required for stateful MCP
	 * servers). Default: 5 minutes.
	 */
	@Env('N8N_MCP_CLIENT_CACHE_TTL_MS')
	cacheTtl: number = 5 * Time.minutes.toMilliseconds;

	/**
	 * Maximum number of MCP clients kept in the in-memory session cache. When the
	 * cache exceeds this size, the oldest entries are evicted. Default: 500.
	 */
	@Env('N8N_MCP_CLIENT_CACHE_MAX_SIZE')
	cacheMaxSize: number = 500;
}
