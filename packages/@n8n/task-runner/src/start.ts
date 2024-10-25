import { ensureError } from 'n8n-workflow';
import Container from 'typedi';

import { MainConfig } from './config/main-config';
import type { ErrorReporting } from './error-reporting';
import { JsTaskRunner } from './js-task-runner/js-task-runner';

let runner: JsTaskRunner | undefined;
let isShuttingDown = false;
let errorReporting: ErrorReporting | undefined;

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

			if (errorReporting) {
				await errorReporting.stop();
				errorReporting = undefined;
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

	if (config.sentryConfig.sentryDsn) {
		const { ErrorReporting } = await import('@/error-reporting');
		errorReporting = new ErrorReporting(config.sentryConfig);
		await errorReporting.start();
	}

	runner = new JsTaskRunner(config);

	process.on('SIGINT', createSignalHandler('SIGINT'));
	process.on('SIGTERM', createSignalHandler('SIGTERM'));
})().catch((e) => {
	const error = ensureError(e);
	console.error('Task runner failed to start', { error });
	process.exit(1);
});
