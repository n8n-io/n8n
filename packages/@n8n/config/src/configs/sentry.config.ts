import { Config, Env } from '../decorators';

@Config
export class SentryConfig {
	/** Sentry DSN for the backend. */
	@Env('N8N_SENTRY_DSN')
	backendDsn: string =
		// https://n8nio.sentry.io/issues/?project=4504016528408576
		'https://a257ce801ae971a3883d69c2e7c5e431@o1420875.ingest.us.sentry.io/4504016528408576';

	/** Sentry DSN for the frontend . */
	@Env('N8N_FRONTEND_SENTRY_DSN')
	frontendDsn: string = '';
}
