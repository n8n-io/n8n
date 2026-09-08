import { Config, Env } from '@n8n/config';
import { z } from 'zod';

@Config
export class AppsConfig {
	/**
	 * Maximum number of requests to a served app's runtime API (`/apps/<namespace>/api/*`)
	 * per IP per minute. Set to `0` to disable IP rate limiting for these endpoints.
	 */
	@Env('N8N_APPS_RUNTIME_RATE_LIMIT', z.number({ coerce: true }).int().nonnegative())
	runtimeRateLimit: number = 60;
}
