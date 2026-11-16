import { execFileSync } from 'node:child_process';

describe('Sentry instrumentation overrides', () => {
	it('should construct and set up the Knex and Mongoose integrations', () => {
		// Use Node's real module loader and isolate the process-wide instrumentation hooks from Jest.
		expect(() =>
			execFileSync(
				process.execPath,
				[
					'--eval',
					`
						const assert = require('node:assert/strict');
						const Sentry = require('@sentry/node');

						async function smokeTest() {
							try {
								const knex = Sentry.knexIntegration();
								const mongoose = Sentry.mongooseIntegration();
								const client = Sentry.init({
									dsn: 'https://public@example.invalid/1',
									defaultIntegrations: false,
									integrations: [knex, mongoose],
									tracesSampleRate: 1,
									sendClientReports: false,
								});

								assert.ok(client);
								assert.equal(client.getIntegrationByName('Knex'), knex);
								assert.equal(client.getIntegrationByName('Mongoose'), mongoose);
							} finally {
								assert.equal(await Sentry.close(1000), true);
							}
						}

						smokeTest().catch((error) => {
							console.error(error);
							process.exitCode = 1;
						});
					`,
				],
				{ cwd: __dirname, timeout: 10_000 },
			),
		).not.toThrow();
	});
});
