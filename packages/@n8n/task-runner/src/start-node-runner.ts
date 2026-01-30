import { Container } from '@n8n/di';
import { ensureError, setGlobalState } from 'n8n-workflow';

import { MainConfig } from './config/main-config';
import type { HealthCheckServer } from './health-check-server';
import { NodeTaskRunner } from './node-task-runner/node-task-runner';
import { TaskRunnerSentry } from './task-runner-sentry';

let healthCheckServer: HealthCheckServer | undefined;
let runner: NodeTaskRunner | undefined;
let isShuttingDown = false;
let sentry: TaskRunnerSentry | undefined;

console.log('[start-node-runner] Node task runner process starting...');

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

			if (sentry) {
				await sentry.shutdown();
				sentry = undefined;
			}
		} catch (e) {
			const error = ensureError(e);
			console.error('Error stopping node task runner', { error });
		} finally {
			console.log('Node task runner stopped');
			process.exit(0);
		}
	};
}

void (async function start() {
	console.log('[start-node-runner] Initializing configuration...');
	const config = Container.get(MainConfig);

	console.log('[start-node-runner] Setting global state', {
		timezone: config.baseRunnerConfig.timezone,
	});
	setGlobalState({
		defaultTimezone: config.baseRunnerConfig.timezone,
	});

	sentry = Container.get(TaskRunnerSentry);
	try {
		await sentry.initIfEnabled();
		console.log('[start-node-runner] Sentry initialized');
	} catch (error) {
		console.error(
			'FAILED TO INITIALIZE SENTRY. ERROR REPORTING WILL BE DISABLED. THIS IS LIKELY A CONFIGURATION OR ENVIRONMENT ISSUE.',
			error,
		);
		sentry = undefined;
	}

	console.log('[start-node-runner] Creating NodeTaskRunner instance...', {
		taskBrokerUri: config.baseRunnerConfig.taskBrokerUri,
		grantToken: config.baseRunnerConfig.grantToken ? '***set***' : '***NOT SET***',
		maxConcurrency: config.baseRunnerConfig.maxConcurrency,
		taskTimeout: config.baseRunnerConfig.taskTimeout,
	});
	runner = new NodeTaskRunner(config);
	console.log('[start-node-runner] NodeTaskRunner created, WebSocket connecting...');
	runner.on('runner:reached-idle-timeout', () => {
		console.log('[start-node-runner] Idle timeout reached, initiating shutdown');
		// Use shorter timeout since we know we don't have any tasks running
		void createSignalHandler('IDLE_TIMEOUT', 3)();
	});

	const { enabled, host, port } = config.baseRunnerConfig.healthcheckServer;

	if (enabled) {
		console.log('[start-node-runner] Starting health check server', { host, port });
		const { HealthCheckServer } = await import('./health-check-server');
		healthCheckServer = new HealthCheckServer();
		await healthCheckServer.start(host, port);
	}

	process.on('SIGINT', createSignalHandler('SIGINT'));
	process.on('SIGTERM', createSignalHandler('SIGTERM'));

	console.log('[start-node-runner] Node task runner started successfully');
})().catch((e) => {
	const error = ensureError(e);
	console.error('Node task runner failed to start', { error });
	process.exit(1);
});
