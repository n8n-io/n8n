import z from 'zod';

import { Config, Env } from '../decorators';

const positiveIntSchema = z.number({ coerce: true }).int().positive();

/** Configuration for the MCP Server Trigger node. */
@Config
export class McpServerConfig {
	/**
	 * Time in milliseconds a session may stay idle before it is evicted and its
	 * resources (MCP server, transport, tools) released. Streamable HTTP clients
	 * that disconnect without sending an explicit DELETE rely on this to avoid
	 * leaking sessions. Default: 1 hour.
	 */
	@Env('N8N_MCP_SERVER_SESSION_IDLE_TTL_MS', positiveIntSchema)
	sessionIdleTtl: number = 60 * 60 * 1000;

	/**
	 * Interval in milliseconds between sweeps that evict idle sessions.
	 * Default: 5 minutes.
	 */
	@Env('N8N_MCP_SERVER_SESSION_SWEEP_INTERVAL_MS', positiveIntSchema)
	sessionSweepInterval: number = 5 * 60 * 1000;
}
