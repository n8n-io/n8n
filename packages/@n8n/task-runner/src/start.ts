import { ensureError } from 'n8n-workflow';
import Container from 'typedi';

import { MainConfig } from './config/main-config';
import { JsTaskRunner } from './js-task-runner/js-task-runner';
import { TaskRunnerServer } from './task-runner-server';

let taskRunnerServer: TaskRunnerServer | undefined;
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
				void taskRunnerServer?.stop();
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
		taskRunnerServer = new TaskRunnerServer();
		await taskRunnerServer.start(host, port);
	}

	process.on('SIGINT', createSignalHandler('SIGINT'));
	process.on('SIGTERM', createSignalHandler('SIGTERM'));
})().catch((e) => {
	const error = ensureError(e);
	console.error('Task runner failed to start', { error });
	process.exit(1);
});
