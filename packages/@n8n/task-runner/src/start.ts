import { ensureError } from 'n8n-workflow';
import Container from 'typedi';

import { MainConfig } from './config/main-config';
import { HealthcheckServer } from './healthcheck-server';
import { JsTaskRunner } from './js-task-runner/js-task-runner';

let healthcheckServer: HealthcheckServer | undefined;
let runner: JsTaskRunner | undefined;
let isShuttingDown = false;

function createSignalHandler(signal: string) {
	return async function onSignal() {
		if (isShuttingDown) {
			return;
		}

		console.log(`Received ${signal} signal, shutting down...`);

		isShuttingDown = true;
		try {
			if (runner) {
				await runner.stop();
				runner = undefined;
				void healthcheckServer?.stop();
			}
		} catch (e) {
			const error = ensureError(e);
			console.error('Error stopping task runner', { error });
		} finally {
			process.exit(0);
		}
	};
}

void (async function start() {
	const config = Container.get(MainConfig);

	runner = new JsTaskRunner(config);

	const { enabled, host, port } = config.baseRunnerConfig.server;

	if (enabled) {
		healthcheckServer = new HealthcheckServer();
		await healthcheckServer.start(host, port);
	}

	process.on('SIGINT', createSignalHandler('SIGINT'));
	process.on('SIGTERM', createSignalHandler('SIGTERM'));
})().catch((e) => {
	const error = ensureError(e);
	console.error('Task runner failed to start', { error });
	process.exit(1);
});
