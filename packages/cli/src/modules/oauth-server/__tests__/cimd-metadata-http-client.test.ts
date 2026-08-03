import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp, SsrfProtectionService, HttpRequestClient } from '@n8n/backend-network';
import type { IN8nHttpFullResponse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

// Build a plain response object rather than a mock proxy: `mock()` would return
// mock functions for the document keys the schema reads but the fixture omits.

import { CimdMetadataError, CimdMetadataHttpClient } from '../cimd-metadata-http-client';

import type { CacheService } from '@/services/cache/cache.service';

const CLIENT_ID = 'https://client.example.com/metadata.json';

const validDocument = {
	client_id: CLIENT_ID,
	client_name: 'Example Client',
	redirect_uris: ['https://client.example.com/callback'],
	grant_types: ['authorization_code', 'refresh_token'],
	token_endpoint_auth_method: 'none',
	logo_uri: 'https://client.example.com/logo.png',
};

const response = (statusCode: number, body: unknown): IN8nHttpFullResponse =>
	({ statusCode, body }) as unknown as IN8nHttpFullResponse;

describe('CimdMetadataHttpClient', () => {
	const logger = mock<Logger>();
	const cache = mock<CacheService>();
	const ssrfProtectionService = mock<SsrfProtectionService>();
	const httpClient = mock<HttpRequestClient>();
	const outboundHttp = mock<OutboundHttp>();

	let client: CimdMetadataHttpClient;

	beforeEach(() => {
		vi.clearAllMocks();
		outboundHttp.requests.mockReturnValue(httpClient);
		cache.get.mockResolvedValue(undefined);
		client = new CimdMetadataHttpClient(logger, cache, outboundHttp, ssrfProtectionService);
	});

	it('always routes the fetch through the SSRF filter', () => {
		// The client_id is client-controlled, so SSRF protection is passed
		// unconditionally rather than gated on the global toggle.
		expect(outboundHttp.requests).toHaveBeenCalledWith(
			expect.objectContaining({ ssrf: ssrfProtectionService }),
		);
	});

	it('fetches, validates and caches a valid document', async () => {
		httpClient.request.mockResolvedValue(response(200, validDocument));

		const result = await client.fetchMetadata(CLIENT_ID);

		expect(result).toMatchObject({
			client_name: 'Example Client',
			redirect_uris: ['https://client.example.com/callback'],
		});
		expect(httpClient.request).toHaveBeenCalledWith(
			expect.objectContaining({ url: CLIENT_ID, method: 'GET' }),
		);
		expect(cache.set).toHaveBeenCalledWith(
			`cimd:metadata:${CLIENT_ID}`,
			result,
			expect.any(Number),
		);
	});

	it('returns the cached document without an HTTP request', async () => {
		cache.get.mockResolvedValue(validDocument);

		const result = await client.fetchMetadata(CLIENT_ID);

		expect(result).toEqual(validDocument);
		expect(httpClient.request).not.toHaveBeenCalled();
	});

	it('throws on a non-200 response', async () => {
		httpClient.request.mockResolvedValue(response(404, 'not found'));

		await expect(client.fetchMetadata(CLIENT_ID)).rejects.toThrow(CimdMetadataError);
		expect(cache.set).not.toHaveBeenCalled();
	});

	it('throws when the document fails schema validation', async () => {
		httpClient.request.mockResolvedValue(response(200, { client_name: 'No redirect URIs' }));

		await expect(client.fetchMetadata(CLIENT_ID)).rejects.toThrow(CimdMetadataError);
	});

	it('throws when the document declares a mismatched client_id', async () => {
		httpClient.request.mockResolvedValue(
			response(200, { ...validDocument, client_id: 'https://evil.example.com/metadata.json' }),
		);

		await expect(client.fetchMetadata(CLIENT_ID)).rejects.toThrow(/mismatched client_id/);
	});

	it('accepts a document that omits client_id', async () => {
		const { client_id, ...withoutId } = validDocument;
		httpClient.request.mockResolvedValue(response(200, withoutId));

		await expect(client.fetchMetadata(CLIENT_ID)).resolves.toMatchObject({
			client_name: 'Example Client',
		});
	});
});
