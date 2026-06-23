import { type LocalServer, startServer } from '../local-server';
import { buildDispatcher, createDispatcherTransport } from '../undici/transport';

// Proves the undici timeout knobs added for long-running outbound calls (e.g.
// LLM completions) actually reach the dispatcher. A local server delays its
// response well past a tight `headersTimeout`: with the knob applied the request
// aborts, and with undici's default (5 min) the same slow response succeeds.

const RESPONSE_DELAY_MS = 1000;
const TIGHT_TIMEOUT_MS = 50;

describe('transport timeouts', () => {
	let slow: LocalServer;

	beforeAll(async () => {
		slow = await startServer((_req, res) => {
			setTimeout(() => {
				res.setHeader('Content-Type', 'text/plain');
				res.end('late');
			}, RESPONSE_DELAY_MS);
		});
	});

	afterAll(async () => {
		await slow.close();
	});

	it('applies headersTimeout to the dispatcher so a slow response aborts', async () => {
		const transport = createDispatcherTransport({
			proxy: false,
			ssrf: 'disabled',
			timeouts: { headersTimeout: TIGHT_TIMEOUT_MS, bodyTimeout: TIGHT_TIMEOUT_MS },
		});

		await expect(transport.asCustomFetch()(`${slow.url}/x`)).rejects.toThrow();
	});

	it('keeps undici defaults when no timeout is set so the slow response succeeds', async () => {
		const transport = createDispatcherTransport({ proxy: false, ssrf: 'disabled' });

		const response = await transport.asCustomFetch()(`${slow.url}/x`);

		expect(await response.text()).toBe('late');
	});

	it('builds a dispatcher without timeouts when none are provided', () => {
		// Smoke check that the optional argument path stays valid.
		expect(() => buildDispatcher(false, 'disabled')).not.toThrow();
		expect(() =>
			buildDispatcher('env', 'disabled', { timeouts: { bodyTimeout: 1000 } }),
		).not.toThrow();
	});
});
