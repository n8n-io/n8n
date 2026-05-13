import { Config, Env, Nested } from '@n8n/config';

import { HarnessRunnerConfig } from './harness-runner-config';

/**
 * Healthcheck server config for the harness runner process.
 */
@Config
class HarnessHealthcheckServerConfig {
	@Env('N8N_RUNNERS_HEALTH_CHECK_SERVER_ENABLED')
	enabled: boolean = false;

	@Env('N8N_RUNNERS_HEALTH_CHECK_SERVER_HOST')
	host: string = '127.0.0.1';

	@Env('N8N_RUNNERS_HEALTH_CHECK_SERVER_PORT')
	port: number = 5682; // Different port from JS runner's 5681
}

/**
 * Base broker connection config for the harness runner.
 * Reads the same N8N_RUNNERS_* environment variables as the JS/Python runners.
 * Defined locally to avoid depending on a non-exported subpath of @n8n/task-runner.
 */
@Config
class HarnessBaseRunnerConfig {
	@Env('N8N_RUNNERS_TASK_BROKER_URI')
	taskBrokerUri: string = 'http://127.0.0.1:5679';

	@Env('N8N_RUNNERS_GRANT_TOKEN')
	grantToken: string = '';

	@Env('N8N_RUNNERS_MAX_PAYLOAD')
	maxPayloadSize: number = 1024 * 1024 * 1024;

	@Env('N8N_RUNNERS_MAX_CONCURRENCY')
	maxConcurrency: number = 10;

	@Env('N8N_RUNNERS_AUTO_SHUTDOWN_TIMEOUT')
	idleTimeout: number = 0;

	@Env('GENERIC_TIMEZONE')
	timezone: string = 'America/New_York';

	@Env('N8N_RUNNERS_TASK_TIMEOUT')
	taskTimeout: number = 300;

	@Nested
	healthcheckServer!: HarnessHealthcheckServerConfig;
}

@Config
export class HarnessMainConfig {
	@Nested
	baseRunnerConfig!: HarnessBaseRunnerConfig;

	@Nested
	harnessRunnerConfig!: HarnessRunnerConfig;
}
