import type {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	INode,
	INodeType,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	WorkflowExpression,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { PollContext } from '../poll-context';

describe('PollContext', () => {
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
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
	const mode: WorkflowExecuteMode = 'manual';
	const activation: WorkflowActivateMode = 'init';

	const pollContext = new PollContext(workflow, node, additionalData, mode, activation);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getActivationMode', () => {
		it('should return the activation property', () => {
			const result = pollContext.getActivationMode();
			expect(result).toBe(activation);
		});
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);

			const credentials =
				await pollContext.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentials).toEqual({ secret: 'token' });
		});
	});

	describe('getNodeParameter', () => {
		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			expression.getParameterValue.mockImplementation((value) => value);
		});

		it('should return parameter value when it exists', () => {
			const parameter = pollContext.getNodeParameter('testParameter');

			expect(parameter).toBe('testValue');
		});

		it('should return the fallback value when the parameter does not exist', () => {
			const parameter = pollContext.getNodeParameter('otherParameter', 'fallback');

			expect(parameter).toBe('fallback');
		});
	});

	describe('getExecutionContext', () => {
		it('should return undefined', () => {
			expect(pollContext.getExecutionContext()).toBeUndefined();
		});
	});

	describe('cursor', () => {
		it('returns undefined from __takeStagedCursor when the node staged nothing', () => {
			expect(pollContext.getCursor()).toBeUndefined();
			expect(pollContext.__takeStagedCursor()).toBeUndefined();
		});

		it('carries the version passed at construction alongside a staged cursor', () => {
			const versioned = new PollContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				undefined,
				undefined,
				undefined,
				7,
			);

			versioned.setCursor({ lastItemId: 'a' });

			expect(versioned.__takeStagedCursor()).toEqual({ cursor: { lastItemId: 'a' }, version: 7 });
		});

		it('clears the staged cursor once taken, so a later poll cannot re-commit it', () => {
			pollContext.setCursor({ lastItemId: 'a' });

			expect(pollContext.__takeStagedCursor()).toEqual({ cursor: { lastItemId: 'a' }, version: 0 });
			expect(pollContext.__takeStagedCursor()).toBeUndefined();
		});
	});
});
