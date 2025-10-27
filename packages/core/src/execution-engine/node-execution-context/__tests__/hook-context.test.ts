import { ApplicationError } from '@n8n/errors';
import { mock } from 'jest-mock-extended';
import type {
	Expression,
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	INode,
	INodeType,
	INodeTypes,
	IWebhookDescription,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { HookContext } from '../hook-context';

describe('HookContext', () => {
	const testCredentialType = 'testCredential';
	const webhookDescription: IWebhookDescription = {
		name: 'default',
		httpMethod: 'GET',
		responseMode: 'onReceived',
		path: 'testPath',
	};
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
	nodeType.description.webhooks = [webhookDescription];
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
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
	const mode: WorkflowExecuteMode = 'manual';
	const activation: WorkflowActivateMode = 'init';
	const webhookData = mock<IWebhookData>({
		webhookDescription: {
			name: 'default',
			isFullPath: true,
		},
	});

	const hookContext = new HookContext(
		workflow,
		node,
		additionalData,
		mode,
		activation,
		webhookData,
	);

	beforeEach(() => {
		jest.clearAllMocks();
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
		expression.getParameterValue.mockImplementation((value) => value);
		expression.getSimpleParameterValue.mockImplementation((_, value) => value);
	});

	describe('getActivationMode', () => {
		it('should return the activation property', () => {
			const result = hookContext.getActivationMode();
			expect(result).toBe(activation);
		});
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });

			const credentials =
				await hookContext.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentials).toEqual({ secret: 'token' });
		});
	});

	describe('getNodeParameter', () => {
		it('should return parameter value when it exists', () => {
			const parameter = hookContext.getNodeParameter('testParameter');

			expect(parameter).toBe('testValue');
		});
	});

	describe('getNodeWebhookUrl', () => {
		it('should return node webhook url', () => {
			const url = hookContext.getNodeWebhookUrl('default');

			expect(url).toContain('testPath');
		});
	});

	describe('getWebhookName', () => {
		it('should return webhook name', () => {
			const name = hookContext.getWebhookName();

			expect(name).toBe('default');
		});

		it('should throw an error if webhookData is undefined', () => {
			const hookContextWithoutWebhookData = new HookContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
			);

			expect(() => hookContextWithoutWebhookData.getWebhookName()).toThrow(ApplicationError);
		});
	});

	describe('getWebhookDescription', () => {
		it('should return webhook description', () => {
			const description = hookContext.getWebhookDescription('default');

			expect(description).toEqual<IWebhookDescription>(webhookDescription);
		});
	});
});
