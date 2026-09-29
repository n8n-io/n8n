import {
	noopResponseEmitter,
	type JsonValue,
	type ResponseEmitter,
	type ResponseExpectation,
	type StepExecutionRequest,
} from '@n8n/engine';
import { ENCODED_BUFFER_KEY, ExecutionLifecycleHooks } from 'n8n-core';
import type { IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { attachResponseHooks } from '../v1-response-hooks';

const newRequest = (responseExpectation: ResponseExpectation = { kind: 'stepResponse' }) => {
	// Builds the payload like an emitter that accepts it, so a test can read
	// what the node sent.
	const sent: JsonValue[] = [];
	const chunks: JsonValue[] = [];
	const respond: ResponseEmitter = {
		send: vi.fn((build: () => JsonValue) => {
			sent.push(build());
			return { ok: true as const, result: undefined };
		}),
		chunk: vi.fn((build: () => JsonValue) => {
			chunks.push(build());
			return { ok: true as const, result: undefined };
		}),
	};
	const request = {
		context: {
			executionId: 'exec-1',
			stepId: 'step-1',
			workflowId: 'wf-1',
			mode: 'production',
			iteration: 0,
			callerContext: { hostMode: 'webhook' },
			responseExpectation,
		},
		respond,
	} as unknown as StepExecutionRequest;

	return { request, respond, sent, chunks };
};

const newAdditionalData = () => ({}) as IWorkflowExecuteAdditionalData;

describe('attachResponseHooks', () => {
	it('preserves hooks supplied by the host', async () => {
		const { request, sent } = newRequest();
		const existingHandler = vi.fn();
		const hooks = new ExecutionLifecycleHooks('webhook', 'exec-1', {} as IWorkflowBase);
		hooks.addHandler('sendChunk', existingHandler);
		const additionalData = { ...newAdditionalData(), hooks };
		const response = { body: { ok: true }, statusCode: 200 };

		attachResponseHooks(additionalData, request);
		await additionalData.hooks.runHook('sendResponse', [response]);

		expect(additionalData.hooks).toBe(hooks);
		expect(additionalData.hooks.handlers.sendChunk).toEqual([existingHandler]);
		expect(sent).toContainEqual(response);
	});

	it('sends what the Respond node produced to the channel', async () => {
		const { request, sent } = newRequest();
		const additionalData = newAdditionalData();

		attachResponseHooks(additionalData, request);
		await additionalData.hooks?.runHook('sendResponse', [{ body: { ok: true }, statusCode: 200 }]);

		expect(sent).toContainEqual({ body: { ok: true }, statusCode: 200 });
	});

	it('surfaces errors from the response channel', async () => {
		const { request, respond } = newRequest();
		const error = new Error('Response failed');
		vi.mocked(respond.send).mockReturnValue({ ok: false, error });
		const additionalData = newAdditionalData();

		attachResponseHooks(additionalData, request);
		await expect(
			additionalData.hooks?.runHook('sendResponse', [{ body: { ok: true }, statusCode: 200 }]),
		).rejects.toBe(error);
		expect(respond.send).toHaveBeenCalledOnce();
	});

	it('does not build a payload the emitter drops', async () => {
		// Like the engine's emitter for a caller that expects no step response.
		const respond: ResponseEmitter = noopResponseEmitter;
		const { request } = newRequest();
		const additionalData = newAdditionalData();
		attachResponseHooks(additionalData, { ...request, respond });

		// A bare Buffer has no JSON form, so building it would throw.
		await expect(
			additionalData.hooks?.runHook('sendResponse', [Buffer.from('hi')]),
		).resolves.toBeUndefined();
	});

	describe('a Buffer body', () => {
		const headers = { 'content-type': 'application/octet-stream', 'content-length': 5 };

		it('is sent as a base64 envelope, with its headers and status code', async () => {
			const { request, sent } = newRequest();
			const additionalData = newAdditionalData();

			attachResponseHooks(additionalData, request);
			await additionalData.hooks?.runHook('sendResponse', [
				{ body: Buffer.from('hello'), headers, statusCode: 201 },
			]);

			expect(sent).toContainEqual({
				body: { [ENCODED_BUFFER_KEY]: 'aGVsbG8=' },
				headers,
				statusCode: 201,
			});
		});

		it('leaves the response the node produced untouched', async () => {
			const { request } = newRequest();
			const additionalData = newAdditionalData();
			const body = Buffer.from('hello');
			const response = { body, headers, statusCode: 200 };

			attachResponseHooks(additionalData, request);
			await additionalData.hooks?.runHook('sendResponse', [response]);

			expect(response.body).toBe(body);
		});
	});

	describe('a stored binary reference body', () => {
		it('is sent as is, with its headers and status code', async () => {
			const { request, sent } = newRequest();
			const additionalData = newAdditionalData();
			const response = {
				body: { binaryData: { id: 'filesystem-v2:file-1', mimeType: 'image/png', data: '' } },
				headers: { 'content-type': 'image/png' },
				statusCode: 200,
			};

			attachResponseHooks(additionalData, request);
			await additionalData.hooks?.runHook('sendResponse', [response]);

			expect(sent).toContainEqual(response);
		});
	});

	it.each(['none', 'runEnd', 'stream'] as const)(
		'registers no response handler when the caller expects %s',
		async (kind) => {
			const { request, respond } = newRequest({ kind });
			const additionalData = newAdditionalData();

			attachResponseHooks(additionalData, request);
			await additionalData.hooks?.runHook('sendResponse', [{ body: { ok: true } }]);

			expect(additionalData.hooks?.handlers.sendResponse).toHaveLength(0);
			expect(respond.send).not.toHaveBeenCalled();
		},
	);

	it.each(['none', 'runEnd', 'stepResponse'] as const)(
		'leaves streaming off when the caller expects %s',
		(kind) => {
			const additionalData = newAdditionalData();

			attachResponseHooks(additionalData, newRequest({ kind }).request);

			// `isStreaming()` reads both. On for every run, the Respond node would
			// stream instead of answering, and `responseNode` would never reply.
			expect(additionalData.streamingEnabled).toBeUndefined();
			expect(additionalData.hooks?.handlers.sendChunk).toHaveLength(0);
		},
	);

	it('carries chunks once the caller expects a stream', async () => {
		const { request, chunks } = newRequest({ kind: 'stream' });
		const additionalData = newAdditionalData();

		attachResponseHooks(additionalData, request);
		await additionalData.hooks?.runHook('sendChunk', [{ type: 'item', content: 'hi' }]);

		expect(additionalData.streamingEnabled).toBe(true);
		expect(chunks).toEqual([{ type: 'item', content: 'hi' }]);
	});

	it('surfaces chunk errors from the response channel', async () => {
		const { request, respond } = newRequest({ kind: 'stream' });
		const error = new Error('Chunk failed');
		vi.mocked(respond.chunk).mockReturnValue({ ok: false, error });
		const additionalData = newAdditionalData();

		attachResponseHooks(additionalData, request);

		await expect(
			additionalData.hooks?.runHook('sendChunk', [{ type: 'item', content: 'hi' }]),
		).rejects.toBe(error);
	});

	it.each([
		['a stream body', { body: { pipe: () => {} } }],
		['a binary reference without an id', { body: { binaryData: { data: 'aGk=' } } }],
		['a binary reference with an empty id', { body: { binaryData: { id: '', data: 'aGk=' } } }],
		['a binaryData value that is not an object', { body: { binaryData: 'file-1' } }],
		['a bare Buffer in place of a response', Buffer.from('hi')],
	])('refuses %s, which has no JSON form', async (_name, response) => {
		const { request } = newRequest();
		const additionalData = newAdditionalData();
		attachResponseHooks(additionalData, request);

		await expect(additionalData.hooks?.runHook('sendResponse', [response])).rejects.toThrow(
			/Engine v2 cannot/,
		);
	});
});
