import { Config, Env, Nested } from '../decorators';

@Config
class LoggingConfig {
	/**
	 * Scopes for debug logging. Disabled by default.
	 *
	 * @example
	 * DEBUG=n8n:concurrency
	 * DEBUG=n8n:concurrency,n8n:license
	 * DEBUG=n8n:*
	 * DEBUG=*
	 */
	@Env('DEBUG')
	scopes: string = '';
}

@Config
export class DebugConfig {
	@Nested
	logging: LoggingConfig;
}
