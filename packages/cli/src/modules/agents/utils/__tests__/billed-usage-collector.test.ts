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

	it('keeps windows isolated: one call never settles another call’s responses', async () => {
		const base = vi
			.fn()
			.mockResolvedValueOnce(responseWithHeader('0.001'))
			.mockResolvedValueOnce(responseWithHeader('0.005'));
		const collector = createBilledUsageCollector();
		const first = collector.startWindow();
		const second = collector.startWindow();

		await first.wrap(base)('https://gw/v1/responses');
		await second.wrap(base)('https://gw/v1/responses');

		expect(first.settle()).toBe(0.001);
		expect(second.settle()).toBe(0.005);
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
