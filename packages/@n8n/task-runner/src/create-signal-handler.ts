import { ensureError } from 'n8n-workflow';

import type { CodeTaskRunner } from './code-task-runner';
import type { HealthCheckServer } from './health-check-server';
import type { TaskRunnerSentry } from './task-runner-sentry';

let runner: CodeTaskRunner | undefined;
let healthCheckServer: HealthCheckServer | undefined;
let sentry: TaskRunnerSentry | undefined;
let isShuttingDown = false;

export function setInstances(
	runnerInstance: CodeTaskRunner,
	healthCheckServerInstance: HealthCheckServer | undefined,
	sentryInstance: TaskRunnerSentry | undefined,
) {
	runner = runnerInstance;
	healthCheckServer = healthCheckServerInstance;
	sentry = sentryInstance;
}

export function createSignalHandler(signal: string, timeoutInS = 10) {
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

			if (sentry) {
				await sentry.shutdown();
				sentry = undefined;
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
