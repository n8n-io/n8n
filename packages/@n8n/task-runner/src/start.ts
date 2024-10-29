import { ApplicationError, ensureError } from 'n8n-workflow';

import { JsTaskRunner } from './js-task-runner/js-task-runner';

let runner: JsTaskRunner | undefined;
let isShuttingDown = false;

type Config = {
	n8nUri: string;
	grantToken: string;
};

function readAndParseConfig(): Config {
	const grantToken = process.env.N8N_RUNNERS_GRANT_TOKEN;
	if (!grantToken) {
		throw new ApplicationError('Missing N8N_RUNNERS_GRANT_TOKEN environment variable');
	}

	return {
		n8nUri: process.env.N8N_RUNNERS_N8N_URI ?? '127.0.0.1:5679',
		grantToken,
	};
}

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
	const config = readAndParseConfig();

	const wsUrl = `ws://${config.n8nUri}/runners/_ws`;
	runner = new JsTaskRunner({
		wsUrl,
		grantToken: config.grantToken,
		maxConcurrency: 5,
		allowedBuiltInModules: process.env.NODE_FUNCTION_ALLOW_BUILTIN,
		allowedExternalModules: process.env.NODE_FUNCTION_ALLOW_EXTERNAL,
	});

	process.on('SIGINT', createSignalHandler('SIGINT'));
	process.on('SIGTERM', createSignalHandler('SIGTERM'));
})().catch((e) => {
	const error = ensureError(e);
	console.error('Task runner failed to start', { error });
	process.exit(1);
});
