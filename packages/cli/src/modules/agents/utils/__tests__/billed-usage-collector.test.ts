import { createBilledUsageCollector, BILLED_USD_HEADER } from '../billed-usage-collector';

function responseWithHeader(value: string | null): Response {
	const headers = new Headers();
	if (value !== null) headers.set(BILLED_USD_HEADER, value);
	return new Response('{}', { headers });
}

describe('createBilledUsageCollector', () => {
	it('sums the billed amounts reported through one window', async () => {
		const base = vi
			.fn()
			.mockResolvedValueOnce(responseWithHeader('0.002'))
			.mockResolvedValueOnce(responseWithHeader('0.0022'));
		const collector = createBilledUsageCollector();
		const window = collector.startWindow();
		const wrapped = window.wrap(base);

		await wrapped('https://gw/v1/responses');
		await wrapped('https://gw/v1/responses');

		expect(window.settle()).toBeCloseTo(0.0042, 7);
	});

	it('settles undefined when no response reports a cost', async () => {
		const base = vi.fn().mockResolvedValue(responseWithHeader(null));
		const collector = createBilledUsageCollector();
		const window = collector.startWindow();

		await window.wrap(base)('https://gw/v1/responses');

		expect(window.settle()).toBeUndefined();
	});

	it('ignores a malformed header value', async () => {
		const base = vi.fn().mockResolvedValue(responseWithHeader('not-a-number'));
		const collector = createBilledUsageCollector();
		const window = collector.startWindow();

		await window.wrap(base)('https://gw/v1/responses');

		expect(window.settle()).toBeUndefined();
	});

	it.each(['-0.001', '0.0042junk', '0.0042 junk', '1e-3', ''])(
		'ignores the out-of-contract header value %j',
		async (value) => {
			const base = vi.fn().mockResolvedValue(responseWithHeader(value));
			const collector = createBilledUsageCollector();
			const window = collector.startWindow();

			await window.wrap(base)('https://gw/v1/responses');

			expect(window.settle()).toBeUndefined();
		},
	);

	it('keeps windows isolated: one call never settles another call’s responses', async () => {
		const base = vi
			.fn()
			.mockResolvedValueOnce(responseWithHeader('0.001'))
			.mockResolvedValueOnce(responseWithHeader('0.005'));
		const collector = createBilledUsageCollector();
		const first = collector.startWindow();
		const second = collector.startWindow();

		// In flight at the same time: a shared-state implementation cannot hide
		// behind sequential ordering.
		await Promise.all([
			first.wrap(base)('https://gw/v1/responses'),
			second.wrap(base)('https://gw/v1/responses'),
		]);

		expect(first.settle()).toBe(0.001);
		expect(second.settle()).toBe(0.005);
	});

	it('preserves the env-proxy fallback when wrapping an omitted transport', async () => {
		const original = process.env.HTTP_PROXY;
		process.env.HTTP_PROXY = 'http://proxy.example:8080';
		const globalFetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(responseWithHeader('0.001'));
		try {
			const collector = createBilledUsageCollector();
			const window = collector.startWindow();

			await window.wrap(undefined)('https://gw/v1/responses');

			// The env-proxy fallback routes through an undici dispatcher, the same
			// one the model factory would have used without the window.
			const [, init] = globalFetchSpy.mock.calls[0] as unknown as [
				string,
				{ dispatcher?: unknown },
			];
			expect(init?.dispatcher).toBeDefined();
			expect(window.settle()).toBe(0.001);
		} finally {
			globalFetchSpy.mockRestore();
			if (original === undefined) delete process.env.HTTP_PROXY;
			else process.env.HTTP_PROXY = original;
		}
	});

	it('passes the response through untouched', async () => {
		const expected = responseWithHeader('0.001');
		const base = vi.fn().mockResolvedValue(expected);
		const collector = createBilledUsageCollector();
		const window = collector.startWindow();

		const response = await window.wrap(base)('https://gw/v1/responses', { method: 'POST' });

		expect(response).toBe(expected);
		expect(base).toHaveBeenCalledWith('https://gw/v1/responses', { method: 'POST' });
	});
});
