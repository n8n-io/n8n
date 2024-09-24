import { Config, Env } from '../decorators';

@Config
export class SentryConfig {
	/** Sentry DSN for the backend */
	@Env('N8N_SENTRY_DSN')
	backend_dsn: string = '';

	/** Sentry DSN for the frontend . */
	@Env('N8N_FRONTEND_SENTRY_DSN')
	frontend_dsn: string = '';
}
