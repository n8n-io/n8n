import { Container } from '@n8n/di';
import { ensureError, setGlobalState } from 'n8n-workflow';

import { HarnessMainConfig } from './config/main-config';
import { HarnessTaskRunner } from './harness-task-runner';
import { runPreflightChecks } from './preflight';

let runner: HarnessTaskRunner | undefined;
let isShuttingDown = false;

function createSignalHandler(signal: string, timeoutInS = 10) {
	return async function onSignal() {
		if (isShuttingDown) {
			return;
		}

		console.log(`Received ${signal} signal, shutting down...`);

		setTimeout(() => {
			console.error('Shutdown timeout reached, forcing shutdown...');
			process.exit(1);
		}, timeoutInS * 1_000).unref();

		isShuttingDown = true;
		try {
			if (runner) {
				await runner.stop();
				runner = undefined;
			}
		} catch (e) {
			const error = ensureError(e);
			console.error('Error stopping harness task runner', { error });
		} finally {
			console.log('Harness task runner stopped');
			process.exit(0);
		}
	};
}

void (async function start() {
	const config = Container.get(HarnessMainConfig);

	setGlobalState({
		defaultTimezone: config.baseRunnerConfig.timezone,
	});

	// Run pre-flight checks (verifies git is available)
	await runPreflightChecks();

	runner = new HarnessTaskRunner({
		...config.baseRunnerConfig,
		harnessConfig: config.harnessRunnerConfig,
		taskType: 'harness',
		name: 'Harness Task Runner',
		maxConcurrency: config.harnessRunnerConfig.maxConcurrency,
		taskTimeout: config.harnessRunnerConfig.taskTimeout,
	});

	runner.on('runner:reached-idle-timeout', () => {
		void createSignalHandler('IDLE_TIMEOUT', 3)();
	});

	console.log('Harness task runner started');

	process.on('SIGINT', createSignalHandler('SIGINT'));
	process.on('SIGTERM', createSignalHandler('SIGTERM'));
})().catch((e) => {
	const error = ensureError(e);
	console.error('Harness task runner failed to start', { error });
	process.exit(1);
});
