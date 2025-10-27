import { mock } from 'jest-mock-extended';
import type {
	WebhookType,
	Workflow,
	INode,
	IWebhookDescription,
	INodeType,
	INodeTypes,
	Expression,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { getWebhookDescription, getNodeWebhookUrl } from '../webhook-helper-functions';

describe('Webhook Helper Functions', () => {
	const nodeTypes = mock<INodeTypes>();
	const expression = mock<Expression>();
	const workflow = mock<Workflow>({ id: 'workflow-id', expression, nodeTypes });
	const nodeType = mock<INodeType>();
	const node = mock<INode>({ name: 'test-node' });

	beforeEach(() => jest.resetAllMocks());

	describe('getWebhookDescription', () => {
		const tests: Array<{
			description: string;
			name: WebhookType;
			webhooks: IWebhookDescription[] | undefined;
			expected: IWebhookDescription | undefined;
		}> = [
			{
				description: 'should return undefined for invalid webhook type',
				name: 'invalid' as WebhookType,
				webhooks: [
					{
						name: 'default',
						httpMethod: 'POST',
						path: 'webhook',
					},
				],
				expected: undefined,
			},
			{
				description: 'should return undefined when node has no webhooks',
				name: 'default',
				webhooks: undefined,
				expected: undefined,
			},
			{
				description: 'should return webhook description when webhook exists',
				name: 'default',
				webhooks: [
					{
						name: 'default',
						httpMethod: 'POST',
						path: 'webhook',
					},
				],
				expected: {
					name: 'default',
					httpMethod: 'POST',
					path: 'webhook',
				},
			},
		];
		test.each(tests)('$description', ({ name, webhooks, expected }) => {
			nodeType.description.webhooks = webhooks;
			nodeTypes.getByNameAndVersion.mockReturnValueOnce(nodeType);

			const result = getWebhookDescription(name, workflow, node);

			expect(result).toEqual(expected);
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalled();
		});
	});

	describe('getNodeWebhookUrl', () => {
		const webhookBaseUrl = 'http://localhost:5678/webhook';
		const webhookTestBaseUrl = 'http://localhost:5678/webhook-test';
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			webhookBaseUrl,
			webhookTestBaseUrl,
		});
		const webhookDescription = mock<IWebhookDescription>({
			name: 'default',
			isFullPath: false,
		});

		const tests: Array<{
			description: string;
			webhookPath: string | undefined;
			webhookId: string | undefined;
			isTest: boolean;
			expected: string;
		}> = [
			{
				description: 'should return webhook URL with path',
				webhookPath: 'webhook',
				webhookId: undefined,
				isTest: false,
				expected: `${webhookBaseUrl}/workflow-id/test-node/webhook`,
			},
			{
				description: 'should handle path starting with /',
				webhookPath: '/webhook',
				webhookId: undefined,
				isTest: false,
				expected: `${webhookBaseUrl}/workflow-id/test-node/webhook`,
			},
			{
				description: 'should return webhook URL with webhookId',
				webhookPath: 'webhook',
				webhookId: 'abc123',
				isTest: false,
				expected: `${webhookBaseUrl}/abc123/webhook`,
			},
			{
				description: 'should return test webhook URL for test webhooks',
				webhookPath: 'webhook',
				webhookId: undefined,
				isTest: true,
				expected: `${webhookTestBaseUrl}/workflow-id/test-node/webhook`,
			},
		];
		test.each(tests)('$description', ({ webhookPath, webhookId, isTest, expected }) => {
			node.webhookId = webhookId;
			if (webhookPath) webhookDescription.path = webhookPath;
			nodeType.description.webhooks = [webhookDescription];
			nodeTypes.getByNameAndVersion.mockReturnValueOnce(nodeType);

			expression.getSimpleParameterValue.mockImplementation((_node, parameterValue) => {
				if (parameterValue === 'webhook') return webhookPath;
				return parameterValue;
			});

			const result = getNodeWebhookUrl(
				'default',
				workflow,
				node,
				additionalData,
				'manual',
				{},
				isTest,
			);

			expect(result).toEqual(expected);
			expect(expression.getSimpleParameterValue).toHaveBeenCalled();
		});
	});
});
