import * as a from 'node:assert/strict';

import { authenticate } from './authenticator';
import { JsTaskRunner } from './code';

let _runner: JsTaskRunner | undefined;
let isShuttingDown = false;

type Config = {
	n8nUri: string;
	authToken: string;
};

function readAndParseConfig(): Config {
	const authToken = process.env.N8N_RUNNERS_AUTH_TOKEN;
	a.ok(authToken, 'Missing task runner auth token. Use N8N_RUNNERS_AUTH_TOKEN to configure it');

	return {
		n8nUri: process.env.N8N_RUNNERS_N8N_URI ?? 'localhost:5678',
		authToken,
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
			if (_runner) {
				await _runner.stop();
				_runner = undefined;
			}
		} catch (error) {
			console.error(`Error stopping task runner: ${error}`);
		} finally {
			process.exit(0);
		}
	};
}

void (async function start() {
	const config = readAndParseConfig();

	const grantToken = await authenticate({
		authToken: config.authToken,
		n8nUri: config.n8nUri,
	});

	const wsUrl = `ws://${config.n8nUri}/rest/runners/_ws`;

	_runner = new JsTaskRunner('javascript', wsUrl, grantToken, 5);

	process.on('SIGINT', createSignalHandler('SIGINT'));
	process.on('SIGTERM', createSignalHandler('SIGTERM'));
})();
