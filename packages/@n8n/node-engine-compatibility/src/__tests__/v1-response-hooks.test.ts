import type { ResponseEmitter, StepExecutionRequest } from '@n8n/engine';
import { ExecutionLifecycleHooks } from 'n8n-core';
import type { IWorkflowBase, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { attachResponseHooks } from '../v1-response-hooks';

const newRequest = (streamingEnabled?: boolean) => {
	const respond: ResponseEmitter = { send: vi.fn(), chunk: vi.fn() };
	const request = {
		context: {
			executionId: 'exec-1',
			stepId: 'step-1',
			workflowId: 'wf-1',
			mode: 'production',
			iteration: 0,
			callerContext: { hostMode: 'webhook', streamingEnabled },
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

	it('leaves streaming off unless the caller waits for a stream', () => {
		const additionalData = newAdditionalData();

		attachResponseHooks(additionalData, newRequest().request);

		// `isStreaming()` reads both. On for every run, the Respond node would
		// stream instead of answering, and `responseNode` would never reply.
		expect(additionalData.streamingEnabled).toBeUndefined();
		expect(additionalData.hooks?.handlers.sendChunk).toHaveLength(0);
	});

	it('carries chunks once the caller waits for a stream', async () => {
		const { request, respond } = newRequest(true);
		const additionalData = newAdditionalData();

		attachResponseHooks(additionalData, request);
		await additionalData.hooks?.runHook('sendChunk', [{ type: 'item', content: 'hi' }]);

		expect(additionalData.streamingEnabled).toBe(true);
		expect(respond.chunk).toHaveBeenCalledWith({ type: 'item', content: 'hi' });
	});

	it.each([
		['a buffer body', { body: Buffer.from('hi') }],
		['a stream body', { body: { pipe: () => {} } }],
		['a binary reference', { body: { binaryData: { id: 'file-1' } } }],
	])('refuses %s, which has no JSON form', async (_name, response) => {
		const { request } = newRequest();
		const additionalData = newAdditionalData();
		attachResponseHooks(additionalData, request);

		await expect(additionalData.hooks?.runHook('sendResponse', [response])).rejects.toThrow(
			/Engine 2.0 cannot/,
		);
	});
});
