import { createServer, type Server } from 'node:http';

import {
	extractErrorMessage,
	isExecutionTimeout,
	isRequestAbort,
	isTransientNetworkError,
} from '../../harness/transient-error';
import { N8nClient } from '../n8n-client';

// A lane that accepts the connection and then never answers is what wedged run
// 30432642501. Run against real undici rather than a stubbed fetch, because the
// two things that matter here are undici's own behaviour: that the per-request
// signal is what ends the call (the client removes undici's timeouts globally),
// and that the abort's message is the string the transport classifiers key on.
describe('a lane that accepts connections but never answers', () => {
	let server: Server;
	let baseUrl = '';

	beforeAll(async () => {
		server = createServer(() => {
			// Accept and hold: no response, no socket close.
		});
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

		// This route carries its own budget, so the assertion costs 200ms — not the
		// 120s floor a budget-less call would wait.
		const failure = await client
			.listThreadDebugRuns('11111111-1111-4111-8111-111111111111', 200)
			.catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(Error);
		const message = extractErrorMessage(failure);
		expect(message).toBe('The operation was aborted due to timeout');

		// Why isRequestAbort exists: the network predicate does NOT match this, so
		// a build killed here would otherwise fall through to the health probe —
		// which a lane wedged with a live HTTP listener still passes.
		expect(isRequestAbort(message)).toBe(true);
		expect(isExecutionTimeout(message)).toBe(true);
		expect(isTransientNetworkError(message)).toBe(false);
	});
});
