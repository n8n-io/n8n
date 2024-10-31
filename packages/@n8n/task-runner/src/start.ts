import { ensureError } from 'n8n-workflow';
import Container from 'typedi';

import { MainConfig } from './config/main-config';
import { JsTaskRunner } from './js-task-runner/js-task-runner';

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

	process.on('SIGINT', createSignalHandler('SIGINT'));
	process.on('SIGTERM', createSignalHandler('SIGTERM'));
})().catch((e) => {
	const error = ensureError(e);
	console.error('Task runner failed to start', { error });
	process.exit(1);
});
