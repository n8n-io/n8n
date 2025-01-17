import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';
import type {
	Expression,
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	INode,
	INodeType,
	INodeTypes,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { WebhookContext } from '../webhook-context';

describe('WebhookContext', () => {
	const testCredentialType = 'testCredential';
	const nodeType = mock<INodeType>({
		description: {
			credentials: [
				{
					name: testCredentialType,
					required: true,
				},
			],
			properties: [
				{
					name: 'testParameter',
					required: true,
				},
			],
		},
	});
	const nodeTypes = mock<INodeTypes>();
	const expression = mock<Expression>();
	const workflow = mock<Workflow>({ expression, nodeTypes });
	const node = mock<INode>({
		credentials: {
			[testCredentialType]: {
				id: 'testCredentialId',
			},
		},
	});
	node.parameters = {
		testParameter: 'testValue',
	};
	const credentialsHelper = mock<ICredentialsHelper>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		credentialsHelper,
	});
	additionalData.httpRequest = {
		body: { test: 'body' },
		headers: { test: 'header' },
		params: { test: 'param' },
		query: { test: 'query' },
	} as unknown as Request;
	additionalData.httpResponse = mock<Response>();
	const mode: WorkflowExecuteMode = 'manual';
	const webhookData = mock<IWebhookData>({
		webhookDescription: {
			name: 'default',
		},
	});
	const runExecutionData = null;

	const webhookContext = new WebhookContext(
		workflow,
		node,
		additionalData,
		mode,
		webhookData,
		[],
		runExecutionData,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });

			const credentials =
				await webhookContext.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentials).toEqual({ secret: 'token' });
		});
	});

	describe('getBodyData', () => {
		it('should return the body data of the request', () => {
			const bodyData = webhookContext.getBodyData();
			expect(bodyData).toEqual({ test: 'body' });
		});
	});

	describe('getHeaderData', () => {
		it('should return the header data of the request', () => {
			const headerData = webhookContext.getHeaderData();
			expect(headerData).toEqual({ test: 'header' });
		});
	});

	describe('getParamsData', () => {
		it('should return the params data of the request', () => {
			const paramsData = webhookContext.getParamsData();
			expect(paramsData).toEqual({ test: 'param' });
		});
	});

	describe('getQueryData', () => {
		it('should return the query data of the request', () => {
			const queryData = webhookContext.getQueryData();
			expect(queryData).toEqual({ test: 'query' });
		});
	});

	describe('getRequestObject', () => {
		it('should return the request object', () => {
			const request = webhookContext.getRequestObject();
			expect(request).toBe(additionalData.httpRequest);
		});
	});

	describe('getResponseObject', () => {
		it('should return the response object', () => {
			const response = webhookContext.getResponseObject();
			expect(response).toBe(additionalData.httpResponse);
		});
	});

	describe('getWebhookName', () => {
		it('should return the name of the webhook', () => {
			const webhookName = webhookContext.getWebhookName();
			expect(webhookName).toBe('default');
		});
	});

	describe('getNodeParameter', () => {
		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			expression.getParameterValue.mockImplementation((value) => value);
		});

		it('should return parameter value when it exists', () => {
			const parameter = webhookContext.getNodeParameter('testParameter');

			expect(parameter).toBe('testValue');
		});

		it('should return the fallback value when the parameter does not exist', () => {
			const parameter = webhookContext.getNodeParameter('otherParameter', 'fallback');

			expect(parameter).toBe('fallback');
		});
	});
});
