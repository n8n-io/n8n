import { Time } from '@n8n/constants';

import { Config, Env } from '../decorators';
import { positiveIntSchema } from '../schemas';

/** Configuration for the MCP Server Trigger node. */
@Config
export class McpServerConfig {
	/**
	 * Time in milliseconds a session may stay idle before it is evicted and its
	 * resources (MCP server, transport, tools) released. Streamable HTTP clients
	 * that disconnect without sending an explicit DELETE rely on this to avoid
	 * leaking sessions. Default: 15 minutes.
	 */
	@Env('N8N_MCP_SERVER_SESSION_IDLE_TTL_MS', positiveIntSchema)
	sessionIdleTtl: number = 15 * Time.minutes.toMilliseconds;

	/**
	 * Interval in milliseconds between sweeps that evict idle sessions.
	 * Default: 5 minutes.
	 */
	@Env('N8N_MCP_SERVER_SESSION_SWEEP_INTERVAL_MS', positiveIntSchema)
	sessionSweepInterval: number = 5 * Time.minutes.toMilliseconds;
}
