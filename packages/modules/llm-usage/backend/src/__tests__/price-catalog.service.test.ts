import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import { LlmUsageConfig } from '../llm-usage.config';
import { PriceCatalogService } from '../price-catalog.service';

const prices = (input: number, output = input * 2) => ({ input, output, cacheRead: null });
const ok = (body: unknown, headers: Record<string, string> = {}) => ({
	statusCode: 200,
	headers,
	body,
});

const catalog = {
	version: 'v1',
	models: [
		{ provider: 'openai', model: 'gpt-4o-mini', prices: prices(0.1) },
		{ provider: 'anthropic', model: 'claude-sonnet-4-5', prices: prices(3) },
		{ provider: 'alibaba', model: 'qwen-max', prices: prices(1.6) },
		{ provider: 'moonshot', model: 'kimi-k2', prices: prices(0.6) },
		{ provider: 'google', model: 'gemini-2.5-pro', prices: prices(1.25) },
		{ provider: 'google', model: 'gemini-2.5-pro-gt-200k', prices: prices(2.5) },
		{ provider: 'openai', model: 'shared-model', prices: prices(1) },
		{ provider: 'alibaba', model: 'shared-model', prices: prices(2) },
	],
};

describe('PriceCatalogService', () => {
	const request = vi.fn();
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.requests.mockReturnValue(mock<HttpRequestClient>({ request }));
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const config = Object.assign(new LlmUsageConfig(), { catalogUrl: 'http://catalog.test' });
	let service: PriceCatalogService;

	beforeEach(async () => {
		request.mockReset().mockResolvedValue(ok(catalog));
		service = new PriceCatalogService(config, outboundHttp, logger);
		await service.refresh();
	});

	it('finds prices by provider and model', () => {
		expect(service.lookup('anthropic', 'claude-sonnet-4-5', 10)).toEqual({
			input: 3,
			output: 6,
			cacheRead: undefined,
			cacheWrite: undefined,
		});
	});

	it('ignores a date suffix in the model name', () => {
		expect(service.lookup('anthropic', 'claude-sonnet-4-5-20250929', 10)?.input).toBe(3);
		expect(service.lookup('openai', 'gpt-4o-mini-2024-07-18', 10)?.input).toBe(0.1);
	});

	it('reads a vendor/model string as the vendor and its model', () => {
		expect(service.lookup('openai', 'moonshotai/kimi-k2', 10)?.input).toBe(0.6);
	});

	it('finds a model under the only provider that has it', () => {
		// The Alibaba chat model node is built on ChatOpenAI, so it reports `openai`.
		expect(service.lookup('openai', 'qwen-max', 10)?.input).toBe(1.6);
	});

	it('does not guess when several providers have the model', () => {
		expect(service.lookup('mistral', 'shared-model', 10)).toBeUndefined();
	});

	it('uses the long-context tier above its threshold', () => {
		expect(service.lookup('google', 'gemini-2.5-pro', 200_000)?.input).toBe(1.25);
		expect(service.lookup('google', 'gemini-2.5-pro', 200_001)?.input).toBe(2.5);
	});

	it('does nothing without a catalog URL', async () => {
		request.mockClear();
		const unconfigured = new PriceCatalogService(new LlmUsageConfig(), outboundHttp, logger);

		await unconfigured.refresh();

		expect(request).not.toHaveBeenCalled();
		expect(unconfigured.lookup('openai', 'gpt-4o-mini', 10)).toBeUndefined();
	});

	it('keeps the catalog when the version is unchanged', async () => {
		request.mockResolvedValue(ok({ version: 'v1', models: [] }));

		await service.refresh();

		expect(service.lookup('openai', 'gpt-4o-mini', 10)?.input).toBe(0.1);
	});

	it('keeps the last catalog when a refresh fails', async () => {
		request.mockRejectedValue(new Error('offline'));

		await service.refresh();

		expect(service.lookup('openai', 'gpt-4o-mini', 10)?.input).toBe(0.1);
		expect(logger.warn).toHaveBeenCalled();
	});

	it('retries a failed first load after a minute, then refreshes daily', async () => {
		vi.useFakeTimers();
		try {
			request
				.mockReset()
				.mockRejectedValueOnce(new Error('not ready'))
				.mockResolvedValue(ok(catalog));
			service = new PriceCatalogService(config, outboundHttp, logger);

			await service.start();
			expect(service.lookup('openai', 'gpt-4o-mini', 10)).toBeUndefined();

			await vi.advanceTimersByTimeAsync(60_000);
			expect(service.lookup('openai', 'gpt-4o-mini', 10)?.input).toBe(0.1);

			await vi.advanceTimersByTimeAsync(60 * 60_000);
			expect(request).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(24 * 60 * 60_000);
			expect(request).toHaveBeenCalledTimes(3);
		} finally {
			service.stop();
			vi.useRealTimers();
		}
	});

	it('skips a bad entry or price and keeps the rest of the catalog', async () => {
		request.mockResolvedValue(
			ok({
				version: 'v2',
				models: [
					{ provider: 42, model: 'broken' },
					{ provider: 'openai', model: 'text-price', prices: { input: 'n/a', output: 1 } },
					{ provider: 'openai', model: 'negative', prices: { input: -1, output: 1 } },
					{ provider: 'openai', model: 'gpt-4o-mini', prices: prices(0.2) },
				],
			}),
		);

		await service.refresh();

		expect(service.lookup('openai', 'text-price', 10)?.input).toBeUndefined();
		expect(service.lookup('openai', 'negative', 10)?.input).toBeUndefined();
		expect(service.lookup('openai', 'gpt-4o-mini', 10)?.input).toBe(0.2);
	});

	it('sends the request with a timeout and a size limit', () => {
		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({ timeout: 30_000, maxResponseBodyBytes: 20 * 1024 * 1024 }),
		);
	});

	it('asks with the entity tag of the loaded catalog and keeps it on 304', async () => {
		request.mockResolvedValueOnce(ok(catalog, { etag: '"v1"' }));
		await service.refresh();
		request.mockResolvedValueOnce({ statusCode: 304, headers: {}, body: '' });

		await service.refresh();

		expect(request).toHaveBeenLastCalledWith(
			expect.objectContaining({ headers: { 'if-none-match': '"v1"' } }),
		);
		expect(service.lookup('openai', 'gpt-4o-mini', 10)?.input).toBe(0.1);
	});

	it('keeps the last catalog when the body has no model list', async () => {
		request.mockResolvedValueOnce(ok({ version: 'v2' }));

		await service.refresh();

		expect(service.lookup('openai', 'gpt-4o-mini', 10)?.input).toBe(0.1);
	});

	it('keeps the last catalog when the server answers with an error status', async () => {
		logger.warn.mockClear();
		request.mockResolvedValueOnce({ statusCode: 503, headers: {}, body: 'down' });

		await service.refresh();

		expect(service.lookup('openai', 'gpt-4o-mini', 10)?.input).toBe(0.1);
		expect(logger.warn).toHaveBeenCalled();
	});

	it('announces each new catalog version once', async () => {
		const listener = vi.fn();
		service = new PriceCatalogService(config, outboundHttp, logger);
		service.onChange(listener);

		await service.refresh();
		await service.refresh();
		request.mockResolvedValue(ok({ ...catalog, version: 'v2' }));
		await service.refresh();

		expect(listener).toHaveBeenCalledTimes(2);
	});
});
