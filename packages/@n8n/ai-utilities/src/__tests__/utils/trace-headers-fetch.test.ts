import type { Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as httpProxyAgent from 'src/utils/http-proxy-agent';
import { createAiClientFetch, withTraceHeaders } from 'src/utils/trace-headers-fetch';

vi.mock('src/utils/http-proxy-agent', () => ({
	aiClientFetch: vi.fn(),
}));

const TRACEPARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

const sentHeaders = (baseFetch: ReturnType<typeof vi.fn>, call = 0) =>
	new Headers((baseFetch.mock.calls[call][1] as RequestInit | undefined)?.headers);

describe('withTraceHeaders', () => {
	const baseFetch = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		baseFetch.mockResolvedValue(new Response('ok'));
	});

	it('adds the trace headers and keeps the headers of the request', async () => {
		const traced = withTraceHeaders(baseFetch, () => ({ traceparent: TRACEPARENT }));

		await traced('https://provider.test', {
			method: 'POST',
			headers: { Authorization: 'Bearer x' },
		});

		const headers = sentHeaders(baseFetch);
		expect(headers.get('traceparent')).toBe(TRACEPARENT);
		expect(headers.get('authorization')).toBe('Bearer x');
		expect(baseFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
	});

	it('reads the trace headers again for each request', async () => {
		const getTraceHeaders = vi
			.fn()
			.mockReturnValueOnce({ traceparent: 'span-a' })
			.mockReturnValueOnce({ traceparent: 'span-b' });
		const traced = withTraceHeaders(baseFetch, getTraceHeaders);

		await traced('https://provider.test');
		await traced('https://provider.test');

		expect(sentHeaders(baseFetch, 0).get('traceparent')).toBe('span-a');
		expect(sentHeaders(baseFetch, 1).get('traceparent')).toBe('span-b');
	});

	it('keeps the headers of a Request input when there is no init', async () => {
		const traced = withTraceHeaders(baseFetch, () => ({ traceparent: TRACEPARENT }));
		const request = new Request('https://provider.test', { headers: { 'x-api-key': 'key' } });

		await traced(request);

		const headers = sentHeaders(baseFetch);
		expect(headers.get('x-api-key')).toBe('key');
		expect(headers.get('traceparent')).toBe(TRACEPARENT);
	});

	it('passes the request through unchanged when there is no trace context', async () => {
		const init = { headers: { Authorization: 'Bearer x' } };
		const traced = withTraceHeaders(baseFetch, () => ({}));

		await traced('https://provider.test', init);

		expect(baseFetch).toHaveBeenCalledWith('https://provider.test', init);
	});

	it('still sends the request when reading the trace context fails', async () => {
		const logger = mock<Logger>();
		const traced = withTraceHeaders(
			baseFetch,
			() => {
				throw new Error('tracer gone');
			},
			logger,
		);

		await traced('https://provider.test');

		expect(baseFetch).toHaveBeenCalledWith('https://provider.test', undefined);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to add the trace context to an outbound request',
			{ error: 'tracer gone' },
		);
	});
});

describe('createAiClientFetch', () => {
	it('sends through aiClientFetch with the trace headers of the context', async () => {
		const aiClientFetch = vi.mocked(httpProxyAgent.aiClientFetch);
		aiClientFetch.mockResolvedValue(new Response('ok'));
		const fetch = createAiClientFetch({
			helpers: { getTraceHeaders: () => ({ traceparent: TRACEPARENT }) },
		});

		await fetch('https://provider.test');

		expect(sentHeaders(aiClientFetch as ReturnType<typeof vi.fn>).get('traceparent')).toBe(
			TRACEPARENT,
		);
	});
});
