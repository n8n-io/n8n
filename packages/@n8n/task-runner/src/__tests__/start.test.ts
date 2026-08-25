import { Container } from '@n8n/di';
import http from 'node:http';
import https from 'node:https';
import { mock } from 'vitest-mock-extended';

import { TaskRunnerSentry } from '../task-runner-sentry';

vi.mock('../js-task-runner/js-task-runner', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	JsTaskRunner: class {
		on() {}

		async stop() {}
	},
}));

describe('start', () => {
	it('should install env-proxy global agents and exempt the broker host when proxy env vars are set', async () => {
		const previousHttpAgent = http.globalAgent;
		const previousHttpsAgent = https.globalAgent;
		const previousNoProxy = process.env.NO_PROXY;
		process.env.HTTPS_PROXY = 'http://proxy.host.invalid:3128';
		// The NODE_PATH shim in start.ts relies on a CJS-only internal API.
		vi.stubEnv('NODE_PATH', undefined);
		Container.set(TaskRunnerSentry, mock<TaskRunnerSentry>());

		try {
			await import('../start.js');

			expect(http.globalAgent.constructor.name).toBe('EnvProxyHttpAgent');
			expect(https.globalAgent.constructor.name).toBe('EnvProxyHttpsAgent');
			expect(process.env.NO_PROXY?.split(',')).toContain('127.0.0.1');
		} finally {
			delete process.env.HTTPS_PROXY;
			if (previousNoProxy === undefined) {
				delete process.env.NO_PROXY;
				delete process.env.no_proxy;
			} else {
				process.env.NO_PROXY = previousNoProxy;
			}
			vi.unstubAllEnvs();
			http.globalAgent = previousHttpAgent;
			https.globalAgent = previousHttpsAgent;
		}
	});
});
