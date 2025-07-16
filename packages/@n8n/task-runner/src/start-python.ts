import { Container } from '@n8n/di';
import { ensureError, setGlobalState } from 'n8n-workflow';

import { MainConfig } from './config/main-config';
import { createSignalHandler, setInstances } from './create-signal-handler';
import type { HealthCheckServer } from './health-check-server';
import { PyTaskRunner } from './py-task-runner/py-task-runner';
import { TaskRunnerSentry } from './task-runner-sentry';

void (async function start() {
	const config = Container.get(MainConfig);

	setGlobalState({
		defaultTimezone: config.baseRunnerConfig.timezone,
	});

	const sentry = Container.get(TaskRunnerSentry);
	await sentry.initIfEnabled();

	const runner = new PyTaskRunner(config);
	runner.on('runner:reached-idle-timeout', () => {
		// Use shorter timeout since we know we don't have any tasks running
		void createSignalHandler('IDLE_TIMEOUT', 3)();
	});

	const { enabled, host, port } = config.baseRunnerConfig.healthcheckServer;

	let healthCheckServer: HealthCheckServer | undefined;
	if (enabled) {
		const { HealthCheckServer } = await import('./health-check-server');
		healthCheckServer = new HealthCheckServer();
		await healthCheckServer.start(host, port);
	}

	setInstances(runner, healthCheckServer, sentry);

	process.on('SIGINT', createSignalHandler('SIGINT'));
	process.on('SIGTERM', createSignalHandler('SIGTERM'));
})().catch((e) => {
	const error = ensureError(e);
	console.error('PY task runner failed to start', { error });
	process.exit(1);
});
