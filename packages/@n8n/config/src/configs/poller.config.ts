import { Config, Env } from '../decorators';

@Config
export class PollerConfig {
	/** Whether a poll trigger's cursor is committed to the `poller_state` table in the same transaction as the execution it produced. */
	@Env('N8N_POLLER_DURABLE_CURSORS_ENABLED')
	durableCursorsEnabled: boolean = false;
}
