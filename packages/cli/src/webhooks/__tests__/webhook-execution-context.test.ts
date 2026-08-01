import type { INode, IWebhookData, IWorkflowDataProxyAdditionalKeys, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { WebhookExecutionContext } from '../webhook-execution-context';

// Every description-field read goes through this class, so this is where
// `resolve` has to be applied. Miss one field and a request that skipped
// acquiring an isolate gets a 500 instead of a response.
describe('WebhookExecutionContext', () => {
	const responseData = () => 'noData';
	const workflow = mock<Workflow>({
		expression: mock<Workflow['expression']>(),
	});
	const node = mock<INode>({ name: 'Webhook', parameters: {} });

	const context = new WebhookExecutionContext(
		workflow,
		node,
		// A plain object, not `mock<IWebhookData>`: a deep mock auto-creates
		// `resolve[field]` for every field, defeating the point of these tests.
		{
			webhookDescription: {
				name: 'default',
				httpMethod: 'POST',
				path: '={{$parameter["path"]}}',
				responseData: '={{(function (p) { return p.responseData; })($parameter)}}',
				resolve: { responseData },
			},
		} as unknown as IWebhookData,
		'trigger',
		mock<IWorkflowDataProxyAdditionalKeys>(),
	);

	it('passes the declared resolver when evaluating a simple value', () => {
		context.evaluateSimpleWebhookDescriptionExpression('responseData');

		expect(workflow.expression.getSimpleParameterValue).toHaveBeenCalledWith(
			node,
			expect.any(String),
			'trigger',
			expect.anything(),
			undefined,
			undefined,
			responseData,
		);
	});

	it('passes the declared resolver when evaluating a complex value', () => {
		context.evaluateComplexWebhookDescriptionExpression('responseData');

		expect(workflow.expression.getComplexParameterValue).toHaveBeenCalledWith(
			node,
			expect.any(String),
			'trigger',
			expect.anything(),
			undefined,
			undefined,
			{},
			responseData,
		);
	});

	it('passes no resolver for a field that declares none', () => {
		context.evaluateSimpleWebhookDescriptionExpression('path');

		expect(workflow.expression.getSimpleParameterValue).toHaveBeenLastCalledWith(
			node,
			'={{$parameter["path"]}}',
			'trigger',
			expect.anything(),
			undefined,
			undefined,
			undefined,
		);
	});
});
