import { ApplicationError, ensureError } from 'n8n-workflow';
import * as a from 'node:assert/strict';

import { authenticate } from './authenticator';
import { JsTaskRunner } from './code';

type Config = {
	n8nUri: string;
	authToken?: string;
	grantToken?: string;
};

function readAndParseConfig(): Config {
	const authToken = process.env.N8N_RUNNERS_AUTH_TOKEN;
	const grantToken = process.env.N8N_RUNNERS_GRANT_TOKEN;
	if (!authToken && !grantToken) {
		throw new ApplicationError(
			'Missing task runner authentication. Use either N8N_RUNNERS_AUTH_TOKEN or N8N_RUNNERS_GRANT_TOKEN to configure it',
		);
	}

	return {
		n8nUri: process.env.N8N_RUNNERS_N8N_URI ?? 'localhost:5678',
		authToken,
		grantToken,
	};
}

void (async function start() {
	const config = readAndParseConfig();

	let grantToken = config.grantToken;
	if (!grantToken) {
		a.ok(config.authToken);

		grantToken = await authenticate({
			authToken: config.authToken,
			n8nUri: config.n8nUri,
		});
	}

	const wsUrl = `ws://${config.n8nUri}/runners/_ws`;
	new JsTaskRunner('javascript', wsUrl, grantToken, 5);
})().catch((e) => {
	const error = ensureError(e);
	console.error('Task runner failed to start', { error });
	process.exit(1);
});
