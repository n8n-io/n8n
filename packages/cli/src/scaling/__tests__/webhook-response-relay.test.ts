import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig } from '@n8n/config';
import { FileLocation, FileTooLargeError } from 'n8n-core';
import type { BinaryDataConfig, BinaryDataService } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import type { IBinaryData, IExecuteResponsePromiseData } from 'n8n-workflow';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { WebhookResponseTooLargeError } from '@/errors/webhook-response-too-large.error';

import {
	decodeRelayedWebhookResponse,
	ENCODED_BUFFER_KEY,
	OFFLOADED_BODY_KIND_KEY,
	WebhookResponseRelay,
} from '../webhook-response-relay';

const ONE_MIB = 1024 * 1024;
const SIZE_MAX_IN_MIB = 2;

const ctx = { workflowId: 'workflow-1', executionId: 'execution-1' };

const fullResponse = (body: unknown, headers: Record<string, string> = {}) =>
	({ body, headers, statusCode: 200 }) as IExecuteResponsePromiseData;

const bodyOf = (response: IExecuteResponsePromiseData) =>
	(response as { body: unknown }).body as Record<string, unknown>;

const headersOf = (response: IExecuteResponsePromiseData) =>
	(response as { headers: Record<string, string> }).headers;

type Harness = {
	relay: WebhookResponseRelay;
	binaryDataService: ReturnType<typeof mock<BinaryDataService>>;
	logger: ReturnType<typeof mock<Logger>>;
};

const buildRelay = ({
	mode = 'database',
	offloadEnabled = true,
}: { mode?: BinaryDataConfig['mode']; offloadEnabled?: boolean } = {}): Harness => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const binaryDataService = mock<BinaryDataService>();
	binaryDataService.store.mockImplementation(async (_location, _body, binaryData) => ({
		...binaryData,
		id: `${mode}:stored-file-id`,
	}));

	const relay = new WebhookResponseRelay(
		logger,
		binaryDataService,
		mock<BinaryDataConfig>({ mode }),
		mock<ExecutionsConfig>({
			webhookResponseRelaySizeMaxMiB: SIZE_MAX_IN_MIB,
			webhookResponseRelayOffloadEnabled: offloadEnabled,
		}),
	);

	return { relay, binaryDataService, logger };
};

/** A relayed response as it reaches main after the worker offloaded its body. */
const offloadedResponse = (
	kind: 'buffer' | 'string' | 'json',
	binaryData: Partial<IBinaryData> = {},
) =>
	({
		body: { binaryData: { id: 'database:abc', ...binaryData } },
		headers: {},
		statusCode: 200,
		[OFFLOADED_BODY_KIND_KEY]: kind,
	}) as IExecuteResponsePromiseData;

const offloadMarkerOf = (response: IExecuteResponsePromiseData) =>
	(response as Record<string, unknown>)[OFFLOADED_BODY_KIND_KEY];

describe('WebhookResponseRelay', () => {
	describe('prepare, within the limit', () => {
		it('wraps a Buffer body in a base64 envelope', async () => {
			const { relay, binaryDataService } = buildRelay();

			const prepared = await relay.prepare(fullResponse(Buffer.from('hello')), ctx);

			expect(bodyOf(prepared)).toEqual({ [ENCODED_BUFFER_KEY]: 'aGVsbG8=' });
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it.each([
			['a JSON body', { hello: 'world' }],
			['a nested JSON body', { outer: { inner: ['x'.repeat(ONE_MIB)] } }],
			['a string body', 'hello'],
			['a null body', null],
			['a binary-data reference', { binaryData: { id: 'database:abc' } }],
		])('leaves %s untouched', async (_label, body) => {
			const { relay, binaryDataService } = buildRelay();

			const prepared = await relay.prepare(fullResponse(body), ctx);

			expect(bodyOf(prepared)).toEqual(body);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('leaves a cyclic body it cannot serialize untouched', async () => {
			const { relay, binaryDataService } = buildRelay();
			const body: Record<string, unknown> = { name: 'cycle' };
			body.self = body;

			const prepared = await relay.prepare(fullResponse(body), ctx);

			expect(bodyOf(prepared)).toBe(body);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('keeps inline a body and headers that fit the limit together', async () => {
			const { relay, binaryDataService } = buildRelay();
			const response = fullResponse('x'.repeat(ONE_MIB / 2), { 'x-data': 'y'.repeat(ONE_MIB) });

			await expect(relay.prepare(response, ctx)).resolves.toBe(response);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('leaves a stream body untouched, whatever its size', async () => {
			const { relay, binaryDataService } = buildRelay();
			const stream = Readable.from('hello');

			const prepared = await relay.prepare(fullResponse(stream), ctx);

			expect(bodyOf(prepared)).toBe(stream);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('leaves a payload that is not a full response untouched', async () => {
			const { relay } = buildRelay();
			const payload = { toolResult: 'done' };

			expect(await relay.prepare(payload, ctx)).toBe(payload);
		});
	});

	describe('prepare, over the limit with a store', () => {
		it.each([
			['a Buffer body', Buffer.alloc(3 * ONE_MIB), 'buffer'],
			['a string body', 'x'.repeat(3 * ONE_MIB), 'string'],
			['a multi-byte string body', 'é'.repeat(2 * ONE_MIB), 'string'],
			['a JSON body', { blob: 'x'.repeat(3 * ONE_MIB) }, 'json'],
			['a JSON body nested in an array', { items: [{ blob: 'x'.repeat(3 * ONE_MIB) }] }, 'json'],
		])('offloads %s and records its form', async (_label, body, kind) => {
			const { relay, binaryDataService } = buildRelay();

			const prepared = await relay.prepare(fullResponse(body), ctx);

			expect(binaryDataService.store).toHaveBeenCalledTimes(1);
			expect(bodyOf(prepared)).toEqual({
				binaryData: expect.objectContaining({ id: 'database:stored-file-id' }),
			});
			expect(offloadMarkerOf(prepared)).toBe(kind);
		});

		it('measures a Buffer body base64-encoded, the form it would travel in', async () => {
			const { relay, binaryDataService } = buildRelay();
			// Under the limit raw, a third over it once encoded.
			const body = Buffer.alloc(1.75 * ONE_MIB);

			await relay.prepare(fullResponse(body), ctx);

			expect(binaryDataService.store).toHaveBeenCalledTimes(1);
		});

		it('measures a string body in bytes, not in UTF-16 code units', async () => {
			const { relay, binaryDataService } = buildRelay();
			// Half the limit in code units, one and a half times it in UTF-8 bytes.
			const body = 'é'.repeat(1.5 * ONE_MIB);

			await relay.prepare(fullResponse(body), ctx);

			expect(binaryDataService.store).toHaveBeenCalledTimes(1);
		});

		it('offloads a body that fits the limit only without the rest of the response', async () => {
			const { relay, binaryDataService } = buildRelay();
			const response = fullResponse('x'.repeat(1.5 * ONE_MIB), { 'x-data': 'y'.repeat(ONE_MIB) });

			await relay.prepare(response, ctx);

			expect(binaryDataService.store).toHaveBeenCalledTimes(1);
		});

		it('stores the serialized body', async () => {
			const { relay, binaryDataService } = buildRelay();
			const body = { blob: 'x'.repeat(3 * ONE_MIB) };

			await relay.prepare(fullResponse(body), ctx);

			const [, stored] = binaryDataService.store.mock.calls[0];
			// `equals` over `toEqual`: deep equality walks a Buffer byte by byte.
			expect(Buffer.isBuffer(stored) && stored.equals(Buffer.from(JSON.stringify(body)))).toBe(
				true,
			);
		});

		it.each(['filesystem', 'database', 's3', 'azure'] as const)(
			"stores under the execution's location in %s mode",
			async (mode) => {
				const { relay, binaryDataService } = buildRelay({ mode });

				const prepared = await relay.prepare(fullResponse('x'.repeat(3 * ONE_MIB)), ctx);

				expect(binaryDataService.store).toHaveBeenCalledWith(
					FileLocation.ofExecution(ctx.workflowId, ctx.executionId),
					expect.anything(),
					expect.anything(),
				);
				expect(bodyOf(prepared)).toEqual({
					binaryData: expect.objectContaining({ id: `${mode}:stored-file-id` }),
				});
			},
		);

		it.each([
			['a string body', 'x'.repeat(3 * ONE_MIB), 'text/html; charset=utf-8'],
			['a JSON body', { blob: 'x'.repeat(3 * ONE_MIB) }, 'application/json; charset=utf-8'],
		])('keeps the content-type %s would have had inline', async (_label, body, contentType) => {
			const { relay } = buildRelay();

			const prepared = await relay.prepare(fullResponse(body), ctx);

			expect(headersOf(prepared)['content-type']).toBe(contentType);
		});

		it('leaves a content-type set by the node alone', async () => {
			const { relay } = buildRelay();
			const headers = { 'Content-Type': 'application/xml' };

			const prepared = await relay.prepare(fullResponse('x'.repeat(3 * ONE_MIB), headers), ctx);

			expect(headersOf(prepared)).toEqual(headers);
		});

		it('sets no content-type for a Buffer body, which has none inline either', async () => {
			const { relay } = buildRelay();

			const prepared = await relay.prepare(fullResponse(Buffer.alloc(3 * ONE_MIB)), ctx);

			expect(headersOf(prepared)['content-type']).toBeUndefined();
		});

		it('throws when the store reports no id, rather than relaying the body inline', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.store.mockImplementation(
				async (_location, _body, binaryData) => binaryData,
			);

			await expect(relay.prepare(fullResponse('x'.repeat(3 * ONE_MIB)), ctx)).rejects.toThrow(
				OperationalError,
			);
		});

		it('propagates a store failure, rather than relaying the body inline', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.store.mockRejectedValue(new Error('store is down'));

			await expect(relay.prepare(fullResponse('x'.repeat(3 * ONE_MIB)), ctx)).rejects.toThrow(
				'store is down',
			);
		});

		it('names the store limit when the store refuses the body for its size', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.store.mockRejectedValue(
				new FileTooLargeError({ fileSizeMb: 600, maxFileSizeMb: 512, fileId: 'file-1' }),
			);

			const error = await relay
				.prepare(fullResponse('x'.repeat(3 * ONE_MIB)), ctx)
				.catch((e: WebhookResponseTooLargeError) => e);

			expect(error).toBeInstanceOf(WebhookResponseTooLargeError);
			expect((error as WebhookResponseTooLargeError).message).not.toContain('MiB');
			expect((error as WebhookResponseTooLargeError).description).toContain('3 MiB');
			expect((error as WebhookResponseTooLargeError).description).toContain(
				'N8N_BINARY_DATA_DATABASE_MAX_FILE_SIZE',
			);
			expect((error as WebhookResponseTooLargeError).description).toContain(
				'N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX',
			);
			expect((error as WebhookResponseTooLargeError).cause).toBeInstanceOf(FileTooLargeError);
		});

		it('names every store mode without a size limit of its own', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.store.mockRejectedValue(
				new FileTooLargeError({ fileSizeMb: 600, maxFileSizeMb: 512, fileId: 'file-1' }),
			);

			const error = await relay
				.prepare(fullResponse('x'.repeat(3 * ONE_MIB)), ctx)
				.catch((e: WebhookResponseTooLargeError) => e);

			expect((error as WebhookResponseTooLargeError).description).toContain(
				'filesystem, s3 and azure',
			);
		});
	});

	describe('prepare, over the limit with offload turned off', () => {
		it.each(['filesystem', 'database', 's3', 'azure'] as const)(
			'rejects a body in %s mode rather than storing it',
			async (mode) => {
				const { relay, binaryDataService } = buildRelay({ mode, offloadEnabled: false });

				await expect(relay.prepare(fullResponse('x'.repeat(3 * ONE_MIB)), ctx)).rejects.toThrow(
					WebhookResponseTooLargeError,
				);
				expect(binaryDataService.store).not.toHaveBeenCalled();
			},
		);

		it('names the flag to turn on, not the binary-data mode to change', async () => {
			const { relay } = buildRelay({ offloadEnabled: false });

			const error = await relay
				.prepare(fullResponse('x'.repeat(3 * ONE_MIB)), ctx)
				.catch((e: WebhookResponseTooLargeError) => e);

			expect((error as WebhookResponseTooLargeError).message).not.toContain('MiB');
			expect((error as WebhookResponseTooLargeError).description).toContain('The limit is 2 MiB');
			expect((error as WebhookResponseTooLargeError).description).toContain(
				'N8N_WEBHOOK_RESPONSE_RELAY_OFFLOAD_ENABLED',
			);
			expect((error as WebhookResponseTooLargeError).description).not.toContain(
				'N8N_DEFAULT_BINARY_DATA_MODE',
			);
		});

		it('keeps relaying a body within the limit inline', async () => {
			const { relay, binaryDataService } = buildRelay({ offloadEnabled: false });

			const prepared = await relay.prepare(fullResponse(Buffer.from('hello')), ctx);

			expect(bodyOf(prepared)).toEqual({ [ENCODED_BUFFER_KEY]: 'aGVsbG8=' });
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});
	});

	describe('prepare, over the limit without a store', () => {
		it.each([
			['a Buffer body', Buffer.alloc(3 * ONE_MIB)],
			['a string body', 'x'.repeat(3 * ONE_MIB)],
			['a multi-byte string body', 'é'.repeat(2 * ONE_MIB)],
			['a JSON body', { blob: 'x'.repeat(3 * ONE_MIB) }],
			['a JSON body nested in an array', { items: [{ blob: 'x'.repeat(3 * ONE_MIB) }] }],
		])('rejects %s where bytes are only kept in memory', async (_label, body) => {
			const { relay, binaryDataService } = buildRelay({ mode: 'default' });

			await expect(relay.prepare(fullResponse(body), ctx)).rejects.toThrow(
				WebhookResponseTooLargeError,
			);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('names the limit and both ways out', async () => {
			const { relay } = buildRelay({ mode: 'default' });

			const error = await relay
				.prepare(fullResponse('x'.repeat(3 * ONE_MIB)), ctx)
				.catch((e: WebhookResponseTooLargeError) => e);

			expect((error as WebhookResponseTooLargeError).message).not.toContain('MiB');
			expect((error as WebhookResponseTooLargeError).description).toContain('The limit is 2 MiB');
			expect((error as WebhookResponseTooLargeError).description).toContain(
				'N8N_DEFAULT_BINARY_DATA_MODE',
			);
			expect((error as WebhookResponseTooLargeError).description).toContain(
				'N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX',
			);
		});
	});

	describe('prepare, over the limit with nothing to offload', () => {
		it('rejects oversized headers, which cannot be stored, even with a store', async () => {
			const { relay, binaryDataService } = buildRelay();
			const response = fullResponse(null, { 'x-data': 'x'.repeat(3 * ONE_MIB) });

			await expect(relay.prepare(response, ctx)).rejects.toThrow(WebhookResponseTooLargeError);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('rejects an oversized payload that is not a full response', async () => {
			const { relay, binaryDataService } = buildRelay();

			await expect(relay.prepare({ toolResult: 'x'.repeat(3 * ONE_MIB) }, ctx)).rejects.toThrow(
				WebhookResponseTooLargeError,
			);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('rejects an oversized value beside a body that is within the limit', async () => {
			const { relay } = buildRelay();

			await expect(
				relay.prepare({ body: 'small', extra: 'x'.repeat(3 * ONE_MIB) }, ctx),
			).rejects.toThrow(WebhookResponseTooLargeError);
		});

		it('rejects an oversized body shaped like a binary-data reference', async () => {
			const { relay, binaryDataService } = buildRelay();
			const body = { binaryData: { id: 'database:abc' }, blob: 'x'.repeat(3 * ONE_MIB) };

			await expect(relay.prepare(fullResponse(body), ctx)).rejects.toThrow(
				WebhookResponseTooLargeError,
			);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('rejects oversized headers beside a stream body, which is exempt from measuring', async () => {
			const { relay } = buildRelay();
			const response = fullResponse(Readable.from('hello'), {
				'x-data': 'x'.repeat(3 * ONE_MIB),
			});

			await expect(relay.prepare(response, ctx)).rejects.toThrow(WebhookResponseTooLargeError);
		});

		it('rejects a non-offloadable body and headers that only fit the limit apart', async () => {
			const { relay, binaryDataService } = buildRelay();
			const body = { binaryData: { id: 'database:abc' }, blob: 'x'.repeat(1.5 * ONE_MIB) };
			const response = fullResponse(body, { 'x-data': 'y'.repeat(1.5 * ONE_MIB) });

			await expect(relay.prepare(response, ctx)).rejects.toThrow(WebhookResponseTooLargeError);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('rejects an oversized payload shaped like a binary-data reference that is not a full response', async () => {
			const { relay, binaryDataService } = buildRelay();
			const payload = { binaryData: { id: 'database:abc' }, toolResult: 'x'.repeat(3 * ONE_MIB) };

			await expect(relay.prepare(payload, ctx)).rejects.toThrow(WebhookResponseTooLargeError);
			expect(binaryDataService.store).not.toHaveBeenCalled();
		});

		it('names the limit and how to raise it', async () => {
			const { relay } = buildRelay();
			const response = fullResponse(null, { 'x-data': 'x'.repeat(3 * ONE_MIB) });

			const error = await relay
				.prepare(response, ctx)
				.catch((e: WebhookResponseTooLargeError) => e);

			expect((error as WebhookResponseTooLargeError).message).not.toContain('MiB');
			expect((error as WebhookResponseTooLargeError).description).toContain('The limit is 2 MiB');
			expect((error as WebhookResponseTooLargeError).description).toContain(
				'N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX',
			);
		});
	});

	describe('restoreOffloadedBody', () => {
		it.each([
			['buffer', Buffer.from('hello'), Buffer.from('hello')],
			['string', Buffer.from('hello'), 'hello'],
			['json', Buffer.from('{"hello":"world"}'), { hello: 'world' }],
		] as const)('restores an offloaded %s body', async (kind, stored, expected) => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.getAsBuffer.mockResolvedValue(stored);

			const restored = await relay.restoreOffloadedBody(offloadedResponse(kind), {
				reclaim: true,
				context: ctx,
			});

			expect(bodyOf(restored)).toEqual(expected);
		});

		it.each([
			['an unknown form', 'stream'],
			['a non-string', 42],
			['null', null],
		] as const)('leaves a reference marked with %s untouched', async (_label, marker) => {
			const { relay, binaryDataService } = buildRelay();
			const response = {
				body: { binaryData: { id: 'database:abc' } },
				headers: {},
				statusCode: 200,
				[OFFLOADED_BODY_KIND_KEY]: marker,
			} as IExecuteResponsePromiseData;

			const restored = await relay.restoreOffloadedBody(response, { reclaim: true, context: ctx });

			expect(binaryDataService.getAsBuffer).not.toHaveBeenCalled();
			expect(bodyOf(restored)).toEqual({ binaryData: { id: 'database:abc' } });
		});

		it('round-trips a body the worker offloaded', async () => {
			const { relay, binaryDataService } = buildRelay();
			const body = { blob: 'x'.repeat(3 * ONE_MIB) };

			const prepared = await relay.prepare(fullResponse(body), ctx);
			const [, stored] = binaryDataService.store.mock.calls[0];
			binaryDataService.getAsBuffer.mockResolvedValue(stored as Buffer);

			const restored = await relay.restoreOffloadedBody(prepared, { reclaim: true, context: ctx });

			expect(bodyOf(restored)).toEqual(body);
		});

		it('reclaims the storage once the body is read', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from('hello'));

			await relay.restoreOffloadedBody(offloadedResponse('string'), {
				reclaim: true,
				context: ctx,
			});

			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith(['database:abc']);
		});

		it('hands the body back without waiting for the storage to be reclaimed', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from('hello'));
			binaryDataService.deleteManyByBinaryDataId.mockReturnValue(new Promise<void>(() => {}));

			const restored = await relay.restoreOffloadedBody(offloadedResponse('string'), {
				reclaim: true,
				context: ctx,
			});

			expect(bodyOf(restored)).toEqual('hello');
		});

		it('logs a reclaim that fails once the body has been handed back', async () => {
			const { relay, binaryDataService, logger } = buildRelay();
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from('hello'));
			binaryDataService.deleteManyByBinaryDataId.mockRejectedValue(new Error('store is down'));

			const restored = await relay.restoreOffloadedBody(offloadedResponse('string'), {
				reclaim: true,
				context: ctx,
			});
			await new Promise(setImmediate);

			expect(bodyOf(restored)).toEqual('hello');
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to delete an offloaded webhook response body',
				expect.objectContaining({ binaryDataId: 'database:abc' }),
			);
		});

		it('leaves the storage in place for other readers when not reclaiming', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from('hello'));

			const restored = await relay.restoreOffloadedBody(offloadedResponse('string'), {
				reclaim: false,
				context: ctx,
			});

			expect(bodyOf(restored)).toEqual('hello');
			expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
		});

		it('removes the offload marker once the body is restored', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.from('hello'));

			const restored = await relay.restoreOffloadedBody(offloadedResponse('string'), {
				reclaim: true,
				context: ctx,
			});

			expect(offloadMarkerOf(restored)).toBeUndefined();
		});

		it.each([
			['buffer', Buffer.alloc(0)],
			['string', ''],
			['json', {}],
		] as const)(
			'substitutes an empty %s body when the fetch fails for a shared reader',
			async (kind, expected) => {
				const { relay, binaryDataService } = buildRelay();
				binaryDataService.getAsBuffer.mockRejectedValue(new Error('gone'));

				const restored = await relay.restoreOffloadedBody(offloadedResponse(kind), {
					reclaim: false,
					context: ctx,
				});

				expect(bodyOf(restored)).toEqual(expected);
				expect(offloadMarkerOf(restored)).toBeUndefined();
				expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
			},
		);

		it('throws when the fetch fails for a sole reader, which owns the delivery', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.getAsBuffer.mockRejectedValue(new Error('gone'));

			await expect(
				relay.restoreOffloadedBody(offloadedResponse('json'), { reclaim: true, context: ctx }),
			).rejects.toThrow(OperationalError);
			expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
		});

		it('names the store as the thing to check when the fetch fails', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.getAsBuffer.mockRejectedValue(new Error('gone'));

			const error = await relay
				.restoreOffloadedBody(offloadedResponse('json'), { reclaim: true, context: ctx })
				.catch((e: OperationalError) => e);

			expect((error as OperationalError).description).toContain('N8N_DEFAULT_BINARY_DATA_MODE');
		});

		it('reports which execution the unreadable body belongs to', async () => {
			const { relay, binaryDataService } = buildRelay();
			binaryDataService.getAsBuffer.mockRejectedValue(new Error('gone'));

			const error = await relay
				.restoreOffloadedBody(offloadedResponse('json'), { reclaim: true, context: ctx })
				.catch((e: OperationalError) => e);

			expect((error as OperationalError).extra).toEqual({
				binaryDataId: 'database:abc',
				workflowId: 'workflow-1',
				executionId: 'execution-1',
			});
		});

		it('reports which execution a body it could not restore belongs to', async () => {
			const { relay, binaryDataService, logger } = buildRelay();
			binaryDataService.getAsBuffer.mockRejectedValue(new Error('gone'));

			await relay.restoreOffloadedBody(offloadedResponse('json'), {
				reclaim: false,
				context: ctx,
			});

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to restore an offloaded webhook response body',
				expect.objectContaining({
					binaryDataId: 'database:abc',
					workflowId: 'workflow-1',
					executionId: 'execution-1',
				}),
			);
		});

		it.each([
			['a genuine binary-data reference', { binaryData: { id: 'database:abc' } }],
			[
				'a reference whose marker sits inside the body, which only a workflow produces',
				{
					binaryData: { id: 'database:abc' },
					[OFFLOADED_BODY_KIND_KEY]: 'json',
				},
			],
			['a JSON body', { hello: 'world' }],
			['a null body', null],
		])('leaves %s untouched', async (_label, body) => {
			const { relay, binaryDataService } = buildRelay();

			const restored = await relay.restoreOffloadedBody(fullResponse(body), {
				reclaim: true,
				context: ctx,
			});

			expect(bodyOf(restored)).toEqual(body);
			expect(binaryDataService.getAsBuffer).not.toHaveBeenCalled();
		});

		it('leaves a reference with an unknown form marker untouched', async () => {
			const { relay, binaryDataService } = buildRelay();
			const response = {
				body: { binaryData: { id: 'database:abc' } },
				headers: {},
				statusCode: 200,
				[OFFLOADED_BODY_KIND_KEY]: 'zip',
			} as IExecuteResponsePromiseData;

			const restored = await relay.restoreOffloadedBody(response, { reclaim: true, context: ctx });

			expect(bodyOf(restored)).toEqual({ binaryData: { id: 'database:abc' } });
			expect(binaryDataService.getAsBuffer).not.toHaveBeenCalled();
		});

		it('leaves a payload that is not a full response untouched', async () => {
			const { relay } = buildRelay();
			const payload = { toolResult: 'done' };

			expect(await relay.restoreOffloadedBody(payload, { reclaim: true, context: ctx })).toBe(
				payload,
			);
		});
	});

	describe('deleteOffloadedBody', () => {
		it('reclaims the storage of an offloaded body', async () => {
			const { relay, binaryDataService } = buildRelay();

			await relay.deleteOffloadedBody(offloadedResponse('json'), ctx);

			expect(binaryDataService.deleteManyByBinaryDataId).toHaveBeenCalledWith(['database:abc']);
		});

		it.each([
			['a genuine binary-data reference', { binaryData: { id: 'database:abc' } }],
			[
				'a reference whose marker sits inside the body, which only a workflow produces',
				{
					binaryData: { id: 'database:abc' },
					[OFFLOADED_BODY_KIND_KEY]: 'json',
				},
			],
			['a JSON body', { hello: 'world' }],
			['a null body', null],
		])('leaves %s alone', async (_label, body) => {
			const { relay, binaryDataService } = buildRelay();

			await relay.deleteOffloadedBody(fullResponse(body), ctx);

			expect(binaryDataService.deleteManyByBinaryDataId).not.toHaveBeenCalled();
		});

		it('logs rather than throws when the store cannot delete', async () => {
			const { relay, binaryDataService, logger } = buildRelay();
			binaryDataService.deleteManyByBinaryDataId.mockRejectedValue(new Error('store is down'));

			await expect(
				relay.deleteOffloadedBody(offloadedResponse('json'), ctx),
			).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to delete an offloaded webhook response body',
				expect.objectContaining({
					binaryDataId: 'database:abc',
					workflowId: 'workflow-1',
					executionId: 'execution-1',
				}),
			);
		});

		it('accepts a payload that is not a full response', async () => {
			const { relay } = buildRelay();

			await expect(relay.deleteOffloadedBody({ toolResult: 'done' }, ctx)).resolves.toBeUndefined();
		});
	});
});

describe('decodeRelayedWebhookResponse', () => {
	it('restores a base64 envelope to a Buffer', () => {
		const response = fullResponse({ [ENCODED_BUFFER_KEY]: 'aGVsbG8=' });

		const decoded = decodeRelayedWebhookResponse(response);

		expect(decoded).toBe(response);
		expect(bodyOf(decoded)).toEqual(Buffer.from('hello'));
	});

	it('round-trips a Buffer body the worker relayed inline', async () => {
		const { relay } = buildRelay();
		const body = Buffer.from([0x00, 0xff, 0x10]);

		const decoded = decodeRelayedWebhookResponse(await relay.prepare(fullResponse(body), ctx));

		expect(bodyOf(decoded)).toEqual(body);
	});

	it.each([
		['a JSON body', { hello: 'world' }],
		['a string body', 'hello'],
		['a null body', null],
		[
			'a binary-data reference, offloaded or genuine, which main streams instead',
			{ binaryData: { id: 'database:abc' } },
		],
		['an envelope whose payload is not a string', { [ENCODED_BUFFER_KEY]: 42 }],
	])('leaves %s untouched', (_label, body) => {
		const decoded = decodeRelayedWebhookResponse(fullResponse(body));

		expect(bodyOf(decoded)).toEqual(body);
	});

	it('leaves a payload that is not a full response untouched', () => {
		const payload = { toolResult: 'done' };

		expect(decodeRelayedWebhookResponse(payload)).toBe(payload);
	});
});
