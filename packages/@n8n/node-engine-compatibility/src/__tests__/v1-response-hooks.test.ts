import type { ResponseEmitter, StepExecutionRequest } from '@n8n/engine';
import { ENCODED_BUFFER_KEY, ExecutionLifecycleHooks } from 'n8n-core';
import type { IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { attachResponseHooks } from '../v1-response-hooks';

const newRequest = () => {
	const respond: ResponseEmitter = {
		send: vi.fn(() => ({ ok: true as const, result: undefined })),
	};
	const request = {
		context: {
			executionId: 'exec-1',
			stepId: 'step-1',
			workflowId: 'wf-1',
			mode: 'production',
			iteration: 0,
			callerContext: { hostMode: 'webhook' },
		},
		respond,
	} as unknown as StepExecutionRequest;

	return { request, respond };
};

const newAdditionalData = () => ({}) as IWorkflowExecuteAdditionalData;

describe('attachResponseHooks', () => {
	it('preserves hooks supplied by the host', async () => {
		const { request, respond } = newRequest();
		const existingHandler = vi.fn();
		const hooks = new ExecutionLifecycleHooks('webhook', 'exec-1', {} as IWorkflowBase);
		hooks.addHandler('sendChunk', existingHandler);
		const additionalData = { ...newAdditionalData(), hooks };
		const response = { body: { ok: true }, statusCode: 200 };

		attachResponseHooks(additionalData, request);
		await additionalData.hooks.runHook('sendResponse', [response]);

		expect(additionalData.hooks).toBe(hooks);
		expect(additionalData.hooks.handlers.sendChunk).toEqual([existingHandler]);
		expect(respond.send).toHaveBeenCalledWith(response);
	});

	it('sends what the Respond node produced to the channel', async () => {
		const { request, respond } = newRequest();
		const additionalData = newAdditionalData();

		attachResponseHooks(additionalData, request);
		await additionalData.hooks?.runHook('sendResponse', [{ body: { ok: true }, statusCode: 200 }]);

		expect(respond.send).toHaveBeenCalledWith({ body: { ok: true }, statusCode: 200 });
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

	describe('a Buffer body', () => {
		const headers = { 'content-type': 'application/octet-stream', 'content-length': 5 };

		it('is sent as a base64 envelope, with its headers and status code', async () => {
			const { request, respond } = newRequest();
			const additionalData = newAdditionalData();

			attachResponseHooks(additionalData, request);
			await additionalData.hooks?.runHook('sendResponse', [
				{ body: Buffer.from('hello'), headers, statusCode: 201 },
			]);

			expect(respond.send).toHaveBeenCalledWith({
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

	it.each([
		['a stream body', { body: { pipe: () => {} } }],
		['a binary reference without an id', { body: { binaryData: { data: 'aGk=' } } }],
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
