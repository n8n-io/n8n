import type { ResponseEmitter, StepExecutionRequest } from '@n8n/engine';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { attachResponseHooks } from '../v1-response-hooks';

const newRequest = () => {
	const respond: ResponseEmitter = { send: vi.fn() };
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
	it('sends what the Respond node produced to the channel', async () => {
		const { request, respond } = newRequest();
		const additionalData = newAdditionalData();

		attachResponseHooks(additionalData, request);
		await additionalData.hooks?.runHook('sendResponse', [{ body: { ok: true }, statusCode: 200 }]);

		expect(respond.send).toHaveBeenCalledWith({ body: { ok: true }, statusCode: 200 });
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
