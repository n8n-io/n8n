import { Config, Env } from '../decorators';

@Config
export class SentryConfig {
	/** Sentry DSN for the backend. */
	@Env('N8N_SENTRY_DSN')
	backendDsn: string = '';

	/** Sentry DSN for the frontend . */
	@Env('N8N_FRONTEND_SENTRY_DSN')
	frontendDsn: string = '';
}
