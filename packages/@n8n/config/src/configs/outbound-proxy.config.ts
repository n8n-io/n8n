import { z } from 'zod';

import { Config, Env } from '../decorators';

const outboundProxyModeSchema = z.enum(['all', 'main-only']);

export type OutboundProxyMode = z.infer<typeof outboundProxyModeSchema>;

@Config
export class OutboundProxyConfig {
	/**
	 * Which n8n processes install process-wide proxy agents, so that outbound
	 * HTTP made through the Node.js default agents honours the standard proxy
	 * environment variables (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`,
	 * `NO_PROXY`, and their lowercase variants).
	 *
	 * - `all` (default): every process type installs them, meaning main, workers,
	 *   webhook processors and one-off CLI commands. Proxy exemptions are a
	 *   `NO_PROXY` concern: list every internal endpoint the deployment must
	 *   reach directly (loopback services, in-cluster hosts, object storage).
	 *   There is no implicit bypass, `localhost` included.
	 * - `main-only`: restores the historical behavior where only the main server
	 *   process installs them and default-agent HTTP in every other process
	 *   connects directly. HTTP clients that resolve the proxy environment
	 *   variables per request keep doing so in every process regardless of this
	 *   setting.
	 *
	 * An unrecognized value logs a warning at startup and falls back to `all`.
	 *
	 * Deprecated: this variable exists only for backward compatibility with
	 * deployments whose `NO_PROXY` was tuned for the main process alone. Prefer
	 * keeping the default and extending `NO_PROXY` instead.
	 */
	@Env('N8N_OUTBOUND_PROXY_MODE', outboundProxyModeSchema)
	mode: OutboundProxyMode = 'all';
}
