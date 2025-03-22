import { mock } from 'jest-mock-extended';
import type {
	Expression,
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	INode,
	INodeType,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

import { LoadOptionsContext } from '../load-options-context';

describe('LoadOptionsContext', () => {
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
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
	const path = 'testPath';

	const loadOptionsContext = new LoadOptionsContext(workflow, node, additionalData, path);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });

			const credentials =
				await loadOptionsContext.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentials).toEqual({ secret: 'token' });
		});
	});

	describe('getCurrentNodeParameter', () => {
		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
		});

		it('should return parameter value when it exists', () => {
			additionalData.currentNodeParameters = {
				testParameter: 'testValue',
			};

			const parameter = loadOptionsContext.getCurrentNodeParameter('testParameter');

			expect(parameter).toBe('testValue');
		});
	});

	describe('getNodeParameter', () => {
		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			expression.getParameterValue.mockImplementation((value) => value);
		});

		it('should return parameter value when it exists', () => {
			const parameter = loadOptionsContext.getNodeParameter('testParameter');

			expect(parameter).toBe('testValue');
		});

		it('should return the fallback value when the parameter does not exist', () => {
			const parameter = loadOptionsContext.getNodeParameter('otherParameter', 'fallback');

			expect(parameter).toBe('fallback');
		});
	});
});
