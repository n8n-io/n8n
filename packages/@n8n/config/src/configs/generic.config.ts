import { z } from 'zod';

import { Config, Env } from '../decorators';

const releaseChannelSchema = z.enum(['stable', 'beta', 'nightly', 'dev']);
type ReleaseChannel = z.infer<typeof releaseChannelSchema>;

@Config
export class GenericConfig {
	/** Default timezone for the n8n instance. Can be overridden on a per-workflow basis. */
	@Env('GENERIC_TIMEZONE')
	timezone: string = 'America/New_York';

	@Env('N8N_RELEASE_TYPE', releaseChannelSchema)
	releaseChannel: ReleaseChannel = 'dev';

	/** Grace period (in seconds) to wait for components to shut down before process exit. */
	@Env('N8N_GRACEFUL_SHUTDOWN_TIMEOUT')
	gracefulShutdownTimeout: number = 30;

	/** Period (in seconds) in which n8n should whether an external webhook is still registered. */
	@Env('N8N_WEBHOOK_REGISTERED_CHECK')
	webhookRegisteredCheck: number = 300_000;
}
