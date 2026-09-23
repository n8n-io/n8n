import type { INode, IWorkflowExecuteAdditionalData, Workflow } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { EvalLlmMockHandler } from '@/execution-engine';

import { getRequestHelperFunctions } from '../factory';

// The eval mock answers before any real HTTP client runs, so it has to agree
// with those clients on status errors: a request that opted out of throwing on
// non-2xx (`simple: false` on the legacy helper, `ignoreHttpStatusErrors` on
// the axios one) gets the response back instead of an error.
describe('request helpers under the eval mock', () => {
	const workflow = mock<Workflow>();
	const node = mock<INode>({ name: 'Enrich A', type: 'n8n-nodes-base.httpRequest' });
	const notFound = {
		statusCode: 404,
		headers: { 'content-type': 'application/json' },
		body: { error: 'not found' },
	};
	const url = 'https://enrich-a.example.com/api/company';

	function helpersUnderMock(handler: EvalLlmMockHandler) {
		const additionalData = mockDeep<IWorkflowExecuteAdditionalData>();
		additionalData.evalLlmMockHandler = handler;
		additionalData.otel = undefined;
		return getRequestHelperFunctions(workflow, node, additionalData);
	}

	test('legacy request with simple:false resolves with the mocked 404 as a full response', async () => {
		const helpers = helpersUnderMock(vi.fn().mockResolvedValue(notFound));

		await expect(
			helpers.request({ uri: url, method: 'GET', simple: false, resolveWithFullResponse: true }),
		).resolves.toMatchObject({ statusCode: 404, body: { error: 'not found' } });
	});

	test('legacy request without simple:false rejects with the legacy 404 error shape', async () => {
		const helpers = helpersUnderMock(vi.fn().mockResolvedValue(notFound));

		await expect(
			helpers.request({ uri: url, method: 'GET', resolveWithFullResponse: true }),
		).rejects.toMatchObject({ statusCode: 404, response: { body: { error: 'not found' } } });
	});

	test('httpRequest with ignoreHttpStatusErrors resolves with the mocked 404 as a full response', async () => {
		const helpers = helpersUnderMock(vi.fn().mockResolvedValue(notFound));

		await expect(
			helpers.httpRequest({
				url,
				method: 'GET',
				ignoreHttpStatusErrors: true,
				returnFullResponse: true,
			}),
		).resolves.toMatchObject({ statusCode: 404, body: { error: 'not found' } });
	});

	test('httpRequest without ignoreHttpStatusErrors rejects with the axios 404 error shape', async () => {
		const helpers = helpersUnderMock(vi.fn().mockResolvedValue(notFound));

		await expect(helpers.httpRequest({ url, method: 'GET' })).rejects.toMatchObject({
			isAxiosError: true,
			response: { status: 404 },
		});
	});
});
