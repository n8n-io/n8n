import { Container } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { setGlobalState } from 'n8n-workflow';

import { MainConfig } from './config/main-config';
import type { HealthCheckServer } from './health-check-server';
import { JsTaskRunner } from './js-task-runner/js-task-runner';
import { TaskRunnerSentry } from './task-runner-sentry';

// Initialize module paths from NODE_PATH environment variable.
// This is necessary because Node.js doesn't automatically pick up NODE_PATH
// after the process starts. Without this, external npm packages installed
// in custom locations won't be found by the require() calls.
if (process.env.NODE_PATH) {
	// @ts-expect-error - _initPaths is an internal Node.js API
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	module.constructor._initPaths();
}

interface ShutdownOptions {
	/** Hard force-exit backstop, in seconds, if graceful stop does not finish in time. */
	timeoutInS?: number;
	/** Whether to keep serving until the broker drains (vs. drain immediately). */
	deferToBrokerDrain?: boolean;
}

let healthCheckServer: HealthCheckServer | undefined;
let runner: JsTaskRunner | undefined;
let isShuttingDown = false;
let sentry: TaskRunnerSentry | undefined;

function createSignalHandler(
	signal: string,
	{ timeoutInS = 10, deferToBrokerDrain = true }: ShutdownOptions = {},
) {
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
				await runner.stop({ deferToBrokerDrain });
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

void (async function start() {
	const config = Container.get(MainConfig);

	setGlobalState({
		defaultTimezone: config.baseRunnerConfig.timezone,
	});

	sentry = Container.get(TaskRunnerSentry);
	try {
		await sentry.initIfEnabled();
	} catch (error) {
		console.error(
			'FAILED TO INITIALIZE SENTRY. ERROR REPORTING WILL BE DISABLED. THIS IS LIKELY A CONFIGURATION OR ENVIRONMENT ISSUE.',
			error,
		);
		sentry = undefined;
	}

	runner = new JsTaskRunner(config);
	runner.on('runner:reached-idle-timeout', () => {
		// Nothing is waiting on this runner, so drain immediately (don't keep offering for
		// the grace period) with a short force-exit backstop.
		void createSignalHandler('IDLE_TIMEOUT', { timeoutInS: 3, deferToBrokerDrain: false })();
	});

	const { enabled, host, port } = config.baseRunnerConfig.healthcheckServer;

	if (enabled) {
		const { HealthCheckServer } = await import('./health-check-server');
		healthCheckServer = new HealthCheckServer();
		await healthCheckServer.start(host, port);
	}

	// Hard backstop if the graceful stop hangs: force-exit one margin past the grace period.
	// In external mode the launcher force-kills at grace + 2 × margin (see launcherShutdownTimeout
	// in task-runner-launcher), so it always outlasts this and can't kill a draining runner.
	const { gracefulShutdownTimeout, shutdownForceKillMargin } = config.baseRunnerConfig;
	const forceExitTimeoutInS =
		Math.max(0, gracefulShutdownTimeout) + Math.max(0, shutdownForceKillMargin);
	process.on('SIGINT', createSignalHandler('SIGINT', { timeoutInS: forceExitTimeoutInS }));
	process.on('SIGTERM', createSignalHandler('SIGTERM', { timeoutInS: forceExitTimeoutInS }));
})().catch((e) => {
	const error = ensureError(e);
	console.error('Task runner failed to start', { error });
	process.exit(1);
});
