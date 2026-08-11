import { Config, Env } from '../decorators';

@Config
export class PollerConfig {
	/**
	 * Whether a poll trigger's cursor advance and the execution it produced are saved
	 * together, atomically. When disabled, a crash between the two can leave a poll
	 * pointing past items whose execution was never saved (or vice versa).
	 */
	@Env('N8N_POLLER_DURABLE_CURSORS_ENABLED')
	durableCursorsEnabled: boolean = false;
}
