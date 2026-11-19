import type {
	IExecuteFunctions,
	INode,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
	PaginationOptions,
} from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getRequestHelperFunctions } from '../factory';

describe('requestWithAuthenticationPaginated Max Pages', () => {
	// NODE-6412: Max Pages must resolve variables from the execution data.
	test.each([
		{ description: 'a fixed number', maxRequests: 1 },
		{ description: 'a constant expression', maxRequests: '={{ 1 }}' },
		{ description: 'a $vars expression', maxRequests: '={{ parseInt($vars.page_limit) }}' },
	])('stops after one page when Max Pages is $description', async ({ maxRequests }) => {
		const node: INode = {
			id: 'http-request',
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			position: [0, 0],
			parameters: {},
		};
		const workflow = new Workflow({
			nodes: [node],
			connections: {},
			active: false,
			nodeTypes: mock<INodeTypes>(),
		});
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			variables: { page_limit: '1' },
		});
		const helpers = getRequestHelperFunctions(workflow, node, additionalData);
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getExecutionCancelSignal.mockReturnValue(undefined);
		const firstPage = {
			body: { items: [{ id: 1 }], hasNextPage: true },
			headers: {},
			statusCode: 200,
		};
		const secondPage = {
			body: { items: [{ id: 2 }], hasNextPage: false },
			headers: {},
			statusCode: 200,
		};
		context.helpers.request.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);
		const paginationOptions: PaginationOptions = {
			request: {
				url: 'https://example.com/items',
				qs: { page: '={{ $pageCount + 1 }}' },
			},
			continue: '={{ $response.body.hasNextPage }}',
			requestInterval: 0,
			maxRequests: maxRequests as number,
		};

		const responses = await helpers.requestWithAuthenticationPaginated.call(
			context,
			{ uri: 'https://example.com/items' },
			0,
			paginationOptions,
		);

		expect(context.helpers.request).toHaveBeenCalledTimes(1);
		expect(responses).toEqual([firstPage]);
	});
});
