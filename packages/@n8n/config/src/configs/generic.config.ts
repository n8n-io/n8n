import { z } from 'zod';

import { Config, Env } from '../decorators';

const releaseChannelSchema = z.enum(['stable', 'beta', 'nightly', 'dev', 'rc']);
type ReleaseChannel = z.infer<typeof releaseChannelSchema>;

@Config
export class GenericConfig {
	/** Default timezone for the instance. Can be overridden per workflow. */
	@Env('GENERIC_TIMEZONE')
	timezone: string = 'America/New_York';

	/** Release channel (for example, stable, beta, nightly). Affects update checks and some defaults. */
	@Env('N8N_RELEASE_TYPE', releaseChannelSchema)
	releaseChannel: ReleaseChannel = 'dev';

	/** Seconds to wait for graceful shutdown (for example, finishing executions) before the process exits. */
	@Env('N8N_GRACEFUL_SHUTDOWN_TIMEOUT')
	gracefulShutdownTimeout: number = 30;
}
