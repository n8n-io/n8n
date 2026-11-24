import { createServer, type Server } from 'node:http';

import {
	extractErrorMessage,
	isExecutionTimeout,
	isRequestAbort,
	isTransientNetworkError,
} from '../../harness/transient-error';
import { N8nClient } from '../n8n-client';

// Real undici, not a stubbed fetch: what matters is undici's own behaviour — that
// the per-request signal is what ends a call to a lane that never answers, and
// that the abort's message is the string the transport classifiers key on.
describe('a lane that accepts connections but never answers', () => {
	let server: Server;
	let baseUrl = '';

	beforeAll(async () => {
		server = createServer(() => {}); // accept and hold: no response, no close
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
		const address = server.address();
		if (address === null || typeof address === 'string') throw new Error('no port assigned');
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it('aborts at the budget instead of hanging, and reads as a transport failure', async () => {
		const client = new N8nClient(baseUrl);

		// This route takes its own budget, so the assertion costs 200ms, not 120s.
		const failure = await client
			.listThreadDebugRuns('11111111-1111-4111-8111-111111111111', 200)
			.catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(Error);
		const message = extractErrorMessage(failure);
		expect(message).toBe('The operation was aborted due to timeout');

		// Why isRequestAbort exists: the network predicate misses this, and a lane
		// wedged with a live listener still passes the health probe.
		expect(isRequestAbort(message)).toBe(true);
		expect(isExecutionTimeout(message)).toBe(true);
		expect(isTransientNetworkError(message)).toBe(false);
	});
});
