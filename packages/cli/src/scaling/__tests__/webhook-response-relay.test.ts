import type { Logger } from '@n8n/backend-common';
import type { EndpointsConfig } from '@n8n/config';
import type { BinaryDataConfig, BinaryDataService } from 'n8n-core';
import type { IBinaryData, IN8nHttpFullResponse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ENCODED_BUFFER_KEY, WebhookResponseRelay } from '../webhook-response-relay';

describe('WebhookResponseRelay', () => {
	const ctx = { workflowId: 'wf-1', executionId: 'exec-1' };
	const offloadThresholdMiB = 1;
	const maxInlineSizeInBytes = offloadThresholdMiB * 1024 * 1024;

	const endpointsConfig = mock<EndpointsConfig>({
		webhookResponseOffloadThreshold: offloadThresholdMiB,
	});

	const persistingStore = () => {
		const binaryDataService = mock<BinaryDataService>();
		binaryDataService.store.mockResolvedValue({
			id: 'database:stored-id',
			data: 'database',
			mimeType: 'application/octet-stream',
		});
		return binaryDataService;
	};

	const relayWith = (
		binaryDataService: BinaryDataService,
		mode: BinaryDataConfig['mode'] = 'database',
	) =>
		new WebhookResponseRelay(
			mock<Logger>(),
			binaryDataService,
			mock<BinaryDataConfig>({ mode }),
			endpointsConfig,
		);

	describe('prepareResponse', () => {
		it('base64-encodes a small Buffer body inline without touching the store', async () => {
			const binaryDataService = persistingStore();
			const response: IN8nHttpFullResponse = {
				body: Buffer.from('small'),
				headers: {},
				statusCode: 200,
			};

			const result = (await relayWith(binaryDataService).prepareResponse(
				response,
				ctx,
			)) as IN8nHttpFullResponse;

			expect(binaryDataService.store).not.toHaveBeenCalled();
			expect(result.body).toEqual({
				[ENCODED_BUFFER_KEY]: Buffer.from('small').toString('base64'),
			});
		});

		it('offloads a large Buffer body to the store and relays a reference', async () => {
			const binaryDataService = persistingStore();
			const response: IN8nHttpFullResponse = {
				body: Buffer.alloc(maxInlineSizeInBytes + 1, 1),
				headers: {},
				statusCode: 200,
			};

			const result = (await relayWith(binaryDataService).prepareResponse(
				response,
				ctx,
			)) as IN8nHttpFullResponse;

			expect(binaryDataService.store).toHaveBeenCalledTimes(1);
			expect((result.body as { binaryData: IBinaryData }).binaryData.id).toBe('database:stored-id');
			// Inline Buffers are sent via `res.end`, which sets no content-type.
			expect(result.headers['content-type']).toBeUndefined();
		});

		it('preserves an existing content-type header when offloading', async () => {
			const binaryDataService = persistingStore();
			const response: IN8nHttpFullResponse = {
				body: 'x'.repeat(maxInlineSizeInBytes + 1),
				headers: { 'content-type': 'application/xml' },
				statusCode: 200,
			};

			const result = (await relayWith(binaryDataService).prepareResponse(
				response,
				ctx,
			)) as IN8nHttpFullResponse;

			expect(result.headers['content-type']).toBe('application/xml');
			expect(binaryDataService.store).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.objectContaining({ mimeType: 'application/xml' }),
			);
		});

		it.each(['default', 'filesystem'] as const)(
			'relays a large Buffer inline without touching the store in %s mode',
			async (mode) => {
				const binaryDataService = persistingStore();
				const buffer = Buffer.alloc(maxInlineSizeInBytes + 1, 1);
				const response: IN8nHttpFullResponse = { body: buffer, headers: {}, statusCode: 200 };

				const result = (await relayWith(binaryDataService, mode).prepareResponse(
					response,
					ctx,
				)) as IN8nHttpFullResponse;

				expect(binaryDataService.store).not.toHaveBeenCalled();
				expect(result.body).toEqual({ [ENCODED_BUFFER_KEY]: buffer.toString('base64') });
			},
		);

		it('relays a large Buffer inline when the store returns no id', async () => {
			const binaryDataService = mock<BinaryDataService>();
			binaryDataService.store.mockResolvedValue({ data: '', mimeType: '' });
			const buffer = Buffer.alloc(maxInlineSizeInBytes + 1, 1);
			const response: IN8nHttpFullResponse = { body: buffer, headers: {}, statusCode: 200 };

			const result = (await relayWith(binaryDataService).prepareResponse(
				response,
				ctx,
			)) as IN8nHttpFullResponse;

			expect(result.body).toEqual({ [ENCODED_BUFFER_KEY]: buffer.toString('base64') });
		});

		it('relays a large Buffer inline when storing fails', async () => {
			const binaryDataService = mock<BinaryDataService>();
			binaryDataService.store.mockRejectedValue(new Error('store unavailable'));
			const buffer = Buffer.alloc(maxInlineSizeInBytes + 1, 1);
			const response: IN8nHttpFullResponse = { body: buffer, headers: {}, statusCode: 200 };

			const result = (await relayWith(binaryDataService).prepareResponse(
				response,
				ctx,
			)) as IN8nHttpFullResponse;

			expect(result.body).toEqual({ [ENCODED_BUFFER_KEY]: buffer.toString('base64') });
		});

		it('relays a large JSON body unchanged when storing fails', async () => {
			const binaryDataService = mock<BinaryDataService>();
			binaryDataService.store.mockRejectedValue(new Error('store unavailable'));
			const body = { blob: 'x'.repeat(maxInlineSizeInBytes + 1) };
			const response: IN8nHttpFullResponse = { body, headers: {}, statusCode: 200 };

			const result = (await relayWith(binaryDataService).prepareResponse(
				response,
				ctx,
			)) as IN8nHttpFullResponse;

			expect(result.body).toBe(body);
		});

		it('leaves an existing binary-data reference untouched', async () => {
			const binaryDataService = persistingStore();
			const reference = {
				binaryData: { id: 'filesystem-v2:abc', data: '', mimeType: 'image/png' },
			};
			const response: IN8nHttpFullResponse = { body: reference, headers: {}, statusCode: 200 };

			const result = (await relayWith(binaryDataService).prepareResponse(
				response,
				ctx,
			)) as IN8nHttpFullResponse;

			expect(binaryDataService.store).not.toHaveBeenCalled();
			expect(result.body).toBe(reference);
		});

		it('relays a small JSON body inline without touching the store', async () => {
			const binaryDataService = persistingStore();
			const body = { hello: 'world' };
			const response: IN8nHttpFullResponse = { body, headers: {}, statusCode: 200 };

			const result = (await relayWith(binaryDataService).prepareResponse(
				response,
				ctx,
			)) as IN8nHttpFullResponse;

			expect(binaryDataService.store).not.toHaveBeenCalled();
			expect(result.body).toBe(body);
		});

		it('offloads a large JSON body and sets the content-type it would get inline', async () => {
			const binaryDataService = persistingStore();
			const body = { blob: 'x'.repeat(maxInlineSizeInBytes + 1) };
			const response: IN8nHttpFullResponse = { body, headers: {}, statusCode: 200 };

			const result = (await relayWith(binaryDataService).prepareResponse(
				response,
				ctx,
			)) as IN8nHttpFullResponse;

			expect(binaryDataService.store).toHaveBeenCalledTimes(1);
			expect((result.body as { binaryData: IBinaryData }).binaryData.id).toBe('database:stored-id');
			// Same content-type as `res.json` would set for the inline equivalent.
			expect(result.headers['content-type']).toBe('application/json; charset=utf-8');
		});

		it('offloads a large string body and sets the content-type it would get inline', async () => {
			const binaryDataService = persistingStore();
			const response: IN8nHttpFullResponse = {
				body: 'x'.repeat(maxInlineSizeInBytes + 1),
				headers: {},
				statusCode: 200,
			};

			const result = (await relayWith(binaryDataService).prepareResponse(
				response,
				ctx,
			)) as IN8nHttpFullResponse;

			expect(binaryDataService.store).toHaveBeenCalledTimes(1);
			// Same content-type as `res.send` would set for the inline equivalent.
			expect(result.headers['content-type']).toBe('text/html; charset=utf-8');
		});

		it('leaves a response without a body untouched', async () => {
			const binaryDataService = persistingStore();
			const response = { foo: 'bar' };

			const result = await relayWith(binaryDataService).prepareResponse(response, ctx);

			expect(binaryDataService.store).not.toHaveBeenCalled();
			expect(result).toBe(response);
		});
	});

	describe('decodeResponse', () => {
		const relay = relayWith(mock<BinaryDataService>());

		it('decodes an encoded-buffer body back into the original Buffer', () => {
			const payload = Buffer.from('a large binary payload');
			const response: IN8nHttpFullResponse = {
				body: { [ENCODED_BUFFER_KEY]: payload.toString('base64') },
				headers: {},
				statusCode: 200,
			};

			const result = relay.decodeResponse(response) as IN8nHttpFullResponse;

			expect(Buffer.isBuffer(result.body)).toBe(true);
			expect(result.body).toEqual(payload);
		});

		it('leaves a binary-data reference untouched', () => {
			const reference = {
				binaryData: { id: 'database:abc', data: '', mimeType: 'application/pdf' },
			};
			const response: IN8nHttpFullResponse = { body: reference, headers: {}, statusCode: 200 };

			const result = relay.decodeResponse(response) as IN8nHttpFullResponse;

			expect(result.body).toBe(reference);
		});

		it('leaves a plain object body untouched', () => {
			const body = { hello: 'world' };
			const response: IN8nHttpFullResponse = { body, headers: {}, statusCode: 200 };

			const result = relay.decodeResponse(response) as IN8nHttpFullResponse;

			expect(result.body).toBe(body);
		});

		it('leaves a response without a body untouched', () => {
			const response = { foo: 'bar' };

			const result = relay.decodeResponse(response);

			expect(result).toBe(response);
		});
	});
});
