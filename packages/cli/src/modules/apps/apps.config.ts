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

	/**
	 * Maximum number of runtime API calls per main process that hold a workflow run at
	 * the same time. A call holds its run until the run ends or the call answers 202.
	 * Set to `0` to disable the cap.
	 */
	@Env('N8N_APPS_RUNTIME_MAX_CONCURRENT', z.number({ coerce: true }).int().nonnegative())
	runtimeMaxConcurrent: number = 10;
}
