import type {
	INode,
	INodeParameters,
	IWebhookData,
	IWorkflowDataProxyAdditionalKeys,
	Workflow,
} from 'n8n-workflow';
import { fromFunction, fromParameter, webhookDescriptionFields } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { WebhookExecutionContext } from '../webhook-execution-context';

// Every description-field read goes through this class, so the native-resolver
// short-circuit has to hold on each one: a field that reaches the engine 500s
// on a request that skipped acquiring an isolate.
describe('WebhookExecutionContext', () => {
	const workflow = mock<Workflow>({
		expression: mock<Workflow['expression']>(),
	});

	const webhookDescription = {
		name: 'default' as const,
		httpMethod: 'POST',
		...webhookDescriptionFields({
			path: fromParameter('path'),
			responseData: fromFunction((p: INodeParameters) =>
				p.responseMode === 'lastNode' ? 'noData' : undefined,
			),
		}),
	};

	const buildContext = (node: INode) =>
		new WebhookExecutionContext(
			workflow,
			node,
			// A plain object, not `mock<IWebhookData>`: a deep mock auto-creates a
			// resolver for every field, defeating the point of these tests.
			{ webhookDescription } as unknown as IWebhookData,
			'trigger',
			mock<IWorkflowDataProxyAdditionalKeys>(),
		);

	beforeEach(() => vi.clearAllMocks());

	describe('with static node parameters', () => {
		const context = buildContext(
			mock<INode>({ name: 'Webhook', parameters: { path: 'my-path', responseMode: 'lastNode' } }),
		);

		it('resolves a simple value natively without touching the engine', () => {
			expect(context.evaluateSimpleWebhookDescriptionExpression('path')).toBe('my-path');
			expect(workflow.expression.getSimpleParameterValue).not.toHaveBeenCalled();
		});

		it('resolves a complex value natively without touching the engine', () => {
			expect(context.evaluateComplexWebhookDescriptionExpression('responseData')).toBe('noData');
			expect(workflow.expression.getComplexParameterValue).not.toHaveBeenCalled();
		});

		it('returns a natively resolved undefined as-is, not the default value', () => {
			const undefinedContext = buildContext(
				mock<INode>({ name: 'Webhook', parameters: { responseMode: 'onReceived' } }),
			);

			expect(
				undefinedContext.evaluateComplexWebhookDescriptionExpression(
					'responseData',
					undefined,
					'firstEntryJson',
				),
			).toBeUndefined();
			expect(workflow.expression.getComplexParameterValue).not.toHaveBeenCalled();
		});

		it('falls back to the engine for a field without a resolver', () => {
			context.evaluateSimpleWebhookDescriptionExpression('httpMethod');

			expect(workflow.expression.getSimpleParameterValue).toHaveBeenCalledWith(
				expect.anything(),
				'POST',
				'trigger',
				expect.anything(),
				undefined,
				undefined,
			);
		});
	});

	describe('with an expression in the node parameters', () => {
		const context = buildContext(
			mock<INode>({ name: 'Webhook', parameters: { path: '={{ $json.path }}' } }),
		);

		it('falls back to the engine even for a field with a resolver', () => {
			context.evaluateSimpleWebhookDescriptionExpression('path');

			expect(workflow.expression.getSimpleParameterValue).toHaveBeenCalledWith(
				expect.anything(),
				'={{$parameter["path"]}}',
				'trigger',
				expect.anything(),
				undefined,
				undefined,
			);
		});
	});
});
