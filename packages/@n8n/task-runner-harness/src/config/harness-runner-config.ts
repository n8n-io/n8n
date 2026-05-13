import { Config, Env } from '@n8n/config';

@Config
export class HarnessRunnerConfig {
	/** Default timeout in seconds for harness task execution */
	@Env('N8N_RUNNERS_HARNESS_TIMEOUT')
	taskTimeout: number = 600; // 10 minutes

	/** Maximum number of concurrent harness tasks */
	@Env('N8N_RUNNERS_HARNESS_MAX_CONCURRENCY')
	maxConcurrency: number = 3;

	/** Maximum stdout/stderr capture size in bytes per task */
	@Env('N8N_RUNNERS_HARNESS_MAX_OUTPUT_SIZE')
	maxOutputSize: number = 10 * 1024 * 1024; // 10 MB
}
