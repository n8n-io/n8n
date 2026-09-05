import type {
	Cron,
	CronExpression,
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IExecutionContext,
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

import { TriggerContext } from '../trigger-context';

describe('TriggerContext', () => {
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
	const mode: WorkflowExecuteMode = 'manual';
	const activation: WorkflowActivateMode = 'init';

	const triggerContext = new TriggerContext(workflow, node, additionalData, mode, activation);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getActivationMode', () => {
		it('should return the activation property', () => {
			const result = triggerContext.getActivationMode();
			expect(result).toBe(activation);
		});
	});

	describe('getCredentials', () => {
		it('should get decrypted credentials', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);

			const credentials =
				await triggerContext.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentials).toEqual({ secret: 'token' });
		});

		it('should identify credentials requested by a trigger', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);

			await triggerContext.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				additionalData,
				expect.anything(),
				testCredentialType,
				mode,
				expect.objectContaining({ node }),
				false,
				undefined,
				{ credentialUsage: 'trigger' },
			);
		});

		it("should preserve the entry point's execution context", async () => {
			const executionContext: IExecutionContext = {
				version: 1,
				establishedAt: 1,
				source: 'manual',
				credentials: 'sealed-credential-context',
			};
			const additionalDataWithContext = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
			additionalDataWithContext.executionContext = executionContext;
			const context = new TriggerContext(
				workflow,
				node,
				additionalDataWithContext,
				mode,
				activation,
			);
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			credentialsHelper.getDecrypted.mockResolvedValue({ secret: 'token' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);

			await context.getCredentials<ICredentialDataDecryptedObject>(testCredentialType);

			expect(credentialsHelper.getDecrypted).toHaveBeenCalledWith(
				expect.objectContaining({ executionContext }),
				expect.anything(),
				testCredentialType,
				mode,
				expect.objectContaining({ node }),
				false,
				undefined,
				{ credentialUsage: 'trigger' },
			);
		});
	});

	describe('getNodeParameter', () => {
		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			expression.getParameterValue.mockImplementation((value) => value);
		});

		it('should return parameter value when it exists', () => {
			const parameter = triggerContext.getNodeParameter('testParameter');

			expect(parameter).toBe('testValue');
		});

		it('should return the fallback value when the parameter does not exist', () => {
			const parameter = triggerContext.getNodeParameter('otherParameter', 'fallback');

			expect(parameter).toBe('fallback');
		});
	});

	describe('getExecutionContext', () => {
		it('should return undefined', () => {
			expect(triggerContext.getExecutionContext()).toBeUndefined();
		});
	});

	describe('scheduling helpers', () => {
		it('should expose injected scheduling functions through helpers', () => {
			const registerCron = vi.fn();
			const context = new TriggerContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				undefined,
				undefined,
				undefined,
				{ registerCron },
			);

			const cron: Cron = { expression: '0 0 9 * * *' as CronExpression };
			const onTick = vi.fn();
			context.helpers.registerCron(cron, onTick);

			expect(registerCron).toHaveBeenCalledWith(cron, onTick);
		});

		it('should fall back to the in-memory scheduling functions when none are injected', () => {
			expect(typeof triggerContext.helpers.registerCron).toBe('function');
		});
	});
});
