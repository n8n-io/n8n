import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError } from '../identifier-interface';
import { OAuth2MetadataHttpClient } from '../oauth2-metadata-http-client';

describe('OAuth2MetadataHttpClient', () => {
	const logger = mockLogger();
	const cache = mock<CacheService>();
	const request = vi.fn();
	const outboundHttp = mock<OutboundHttp>();

	const buildClient = () => new OAuth2MetadataHttpClient(logger, cache, outboundHttp);

	beforeEach(() => {
		vi.clearAllMocks();
		outboundHttp.requests.mockReturnValue(mock<HttpRequestClient>({ request }));
		cache.get.mockResolvedValue(undefined);
		cache.set.mockResolvedValue();
	});

	describe('Client construction', () => {
		test('builds the client with the default safe mode and the request timeout', () => {
			buildClient();

			expect(outboundHttp.requests).toHaveBeenCalledWith({ timeout: 10_000 });
		});
	});

	describe('requestFull', () => {
		test('returns the full response without throwing on non-2xx', async () => {
			request.mockResolvedValue({ statusCode: 404, body: { error: 'nope' } });
			const client = buildClient();

			const response = await client.requestFull({ url: 'https://auth.example.com', method: 'GET' });

			expect(response).toEqual({ statusCode: 404, body: { error: 'nope' } });
			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://auth.example.com',
					method: 'GET',
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
				}),
			);
		});
	});

	describe('fetchMetadata', () => {
		const schema = z.object({ issuer: z.string().url() });

		test('fetches, validates, and caches the metadata', async () => {
			request.mockResolvedValue({ statusCode: 200, body: { issuer: 'https://auth.example.com' } });
			const client = buildClient();

			const metadata = await client.fetchMetadata(schema, {
				metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
				cachePrefix: 'test-prefix',
				skipCache: false,
			});

			expect(metadata).toEqual({ issuer: 'https://auth.example.com' });
			expect(cache.set).toHaveBeenCalledWith(
				expect.stringContaining('test-prefix:metadata:'),
				metadata,
				expect.any(Number),
			);
		});

		test('throws IdentifierValidationError when the metadata fetch fails', async () => {
			request.mockResolvedValue({ statusCode: 500, body: {} });
			const client = buildClient();

			await expect(
				client.fetchMetadata(schema, {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					cachePrefix: 'test-prefix',
					skipCache: true,
				}),
			).rejects.toThrow(IdentifierValidationError);
		});
	});
});
