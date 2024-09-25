import * as a from 'node:assert/strict';

import { JsTaskRunner } from './code';
import { authenticate } from './authenticator';

let _runner: JsTaskRunner;

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

void (async function start() {
	const config = readAndParseConfig();

	const grantToken = await authenticate({
		authToken: config.authToken,
		n8nUri: config.n8nUri,
	});

	const wsUrl = `ws://${config.n8nUri}/rest/runners/_ws`;

	_runner = new JsTaskRunner('javascript', wsUrl, grantToken, 5);
})();
