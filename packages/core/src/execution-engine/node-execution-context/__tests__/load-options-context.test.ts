import type {
	ICredentialDataDecryptedObject,
	IExecutionContext,
	ICredentialsHelper,
	INode,
	INodeType,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExpression,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

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
	const expression = mock<WorkflowExpression>();
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
		executionContext: undefined,
	});
	const path = 'testPath';

	const loadOptionsContext = new LoadOptionsContext(workflow, node, additionalData, path);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);

			const credentials =
				await loadOptionsContext.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentials).toEqual({ secret: 'token' });
		});

		it("should decrypt with the entry point's execution context", async () => {
			// Design-time loading has no `runExecutionData`, so without the fallback below
			// `_getCredentials` would overwrite this with `undefined` and end-user credentials
			// would resolve against static data instead of the requesting user's connection.
			const executionContext: IExecutionContext = {
				version: 1,
				establishedAt: 1,
				source: 'internal',
				credentials: 'sealed-credential-context',
			};
			const additionalDataWithContext = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
			// Assigned rather than passed to `mock`, which would deep-wrap it into a copy.
			additionalDataWithContext.executionContext = executionContext;
			const context = new LoadOptionsContext(workflow, node, additionalDataWithContext, path);

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);

			await context.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				expect.objectContaining({ executionContext }),
				expect.anything(),
				testCredentialType,
				'internal',
				expect.objectContaining({ node }),
				false,
				undefined,
				undefined,
			);
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

	describe('getExecutionContext', () => {
		it('should return undefined when the entry point set none', () => {
			expect(loadOptionsContext.getExecutionContext()).toBeUndefined();
		});

		it("should return the entry point's context", () => {
			const executionContext: IExecutionContext = {
				version: 1,
				establishedAt: 1,
				source: 'internal',
				credentials: 'sealed-credential-context',
			};
			const additionalDataWithContext = mock<IWorkflowExecuteAdditionalData>({
				credentialsHelper,
			});
			additionalDataWithContext.executionContext = executionContext;

			const context = new LoadOptionsContext(workflow, node, additionalDataWithContext, path);

			expect(context.getExecutionContext()).toBe(executionContext);
		});
	});
});
