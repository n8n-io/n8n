import type { ErrorReporter } from 'n8n-core';
import { ensureError, setGlobalState } from 'n8n-workflow';
import Container from 'typedi';

import { MainConfig } from './config/main-config';
import type { HealthCheckServer } from './health-check-server';
import { JsTaskRunner } from './js-task-runner/js-task-runner';

let healthCheckServer: HealthCheckServer | undefined;
let runner: JsTaskRunner | undefined;
let isShuttingDown = false;
let errorReporter: ErrorReporter | undefined;

function createSignalHandler(signal: string, timeoutInS = 10) {
	return async function onSignal() {
		if (isShuttingDown) {
			return;
		}

		console.log(`Received ${signal} signal, shutting down...`);

		setTimeout(() => {
			console.error('Shutdown timeout reached, forcing shutdown...');
			process.exit(1);
		}, timeoutInS * 1000).unref();

		isShuttingDown = true;
		try {
			if (runner) {
				await runner.stop();
				runner = undefined;
				void healthCheckServer?.stop();
			}

			if (errorReporter) {
				await errorReporter.shutdown();
				errorReporter = undefined;
			}
		} catch (e) {
			const error = ensureError(e);
			console.error('Error stopping task runner', { error });
		} finally {
			console.log('Task runner stopped');
			process.exit(0);
		}
	};
}

void (async function start() {
	const config = Container.get(MainConfig);

	setGlobalState({
		defaultTimezone: config.baseRunnerConfig.timezone,
	});

	if (config.sentryConfig.sentryDsn) {
		const { ErrorReporter } = await import('n8n-core');
		errorReporter = new ErrorReporter();
		await errorReporter.init('task_runner', config.sentryConfig.sentryDsn);
	}

	runner = new JsTaskRunner(config);
	runner.on('runner:reached-idle-timeout', () => {
		// Use shorter timeout since we know we don't have any tasks running
		void createSignalHandler('IDLE_TIMEOUT', 1)();
	});

	const { enabled, host, port } = config.baseRunnerConfig.healthcheckServer;

	if (enabled) {
		const { HealthCheckServer } = await import('./health-check-server');
		healthCheckServer = new HealthCheckServer();
		await healthCheckServer.start(host, port);
	}

	process.on('SIGINT', createSignalHandler('SIGINT'));
	process.on('SIGTERM', createSignalHandler('SIGTERM'));
})().catch((e) => {
	const error = ensureError(e);
	console.error('Task runner failed to start', { error });
	process.exit(1);
});
