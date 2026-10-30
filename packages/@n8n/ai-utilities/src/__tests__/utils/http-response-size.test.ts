import { Readable } from 'node:stream';
// `vi.resetModules` gives the reloaded module its own `OperationalError` class,
// so its identity differs from a top-level import. Match on the class name,
// which survives the reset.

// The response-size cap is read from the environment when the module loads, so
// each test reloads the module with the value it needs. Global `fetch` is
// mocked, so no request leaves the process and the proxy environment is
// irrelevant here.

const originalFetch = global.fetch;

async function loadModule(maxResponseSize: string) {
	vi.resetModules();
	vi.stubEnv('N8N_AI_MAX_RESPONSE_SIZE', maxResponseSize);
	return await import('../../utils/http-proxy-agent.js');
}

afterEach(() => {
	global.fetch = originalFetch;
	vi.unstubAllEnvs();
});

describe('aiClientFetch', () => {
	it('passes a response within the cap', async () => {
		global.fetch = vi.fn(async () => new Response(new Uint8Array(5)));
		const { aiClientFetch } = await loadModule('1000');

		const response = await aiClientFetch('https://provider.test');

		await expect(response.arrayBuffer()).resolves.toHaveProperty('byteLength', 5);
	});

	it('aborts a response over the cap', async () => {
		global.fetch = vi.fn(async () => new Response(new Uint8Array(100)));
		const { aiClientFetch } = await loadModule('10');

		await expect(
			aiClientFetch('https://provider.test').then(
				async (response: Response) => await response.text(),
			),
		).rejects.toThrow(/exceeded the maximum allowed size/);
	});

	it('throws an OperationalError when the cap is exceeded', async () => {
		global.fetch = vi.fn(async () => new Response(new Uint8Array(100)));
		const { aiClientFetch } = await loadModule('10');

		const error = await aiClientFetch('https://provider.test')
			.then(async (response: Response) => await response.text())
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(Error);
		expect((error as Error).constructor.name).toBe('OperationalError');
	});

	it('does not cap the response when the value is 0', async () => {
		global.fetch = vi.fn(async () => new Response(new Uint8Array(100)));
		const { aiClientFetch } = await loadModule('0');

		const response = await aiClientFetch('https://provider.test');

		await expect(response.arrayBuffer()).resolves.toHaveProperty('byteLength', 100);
	});

	it('falls back to the default cap when the value is malformed', async () => {
		global.fetch = vi.fn(async () => new Response(new Uint8Array(100)));
		const { aiClientFetch } = await loadModule('not-a-number');

		// The default cap is 100 MB, so a 100-byte response passes.
		const response = await aiClientFetch('https://provider.test');

		await expect(response.arrayBuffer()).resolves.toHaveProperty('byteLength', 100);
	});
});

describe('limitAiResponseStream', () => {
	async function totalBytes(stream: Readable): Promise<number> {
		let total = 0;
		for await (const chunk of stream) total += (chunk as Buffer).length;
		return total;
	}

	it('passes a stream within the cap', async () => {
		const { limitAiResponseStream } = await loadModule('1000');

		const limited = limitAiResponseStream(Readable.from([Buffer.alloc(5)]));

		await expect(totalBytes(limited)).resolves.toBe(5);
	});

	it('errors a stream over the cap with an OperationalError', async () => {
		const { limitAiResponseStream } = await loadModule('10');

		// Feed the oversize payload as small chunks so the limiter must stop
		// mid-stream; assert it never forwards more than the cap before erroring.
		const chunks = Array.from({ length: 20 }, () => Buffer.alloc(5));
		const limited = limitAiResponseStream(Readable.from(chunks));
		let yielded = 0;
		let error: unknown;
		try {
			for await (const chunk of limited) yielded += (chunk as Buffer).length;
		} catch (caught) {
			error = caught;
		}

		expect(yielded).toBeLessThanOrEqual(10);
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).constructor.name).toBe('OperationalError');
	});

	it('returns the same stream when the value is 0', async () => {
		const { limitAiResponseStream } = await loadModule('0');
		const source = Readable.from([Buffer.alloc(100)]);

		expect(limitAiResponseStream(source)).toBe(source);
	});
});
