import type {
	Cron,
	CronExpression,
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
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ credentialsHelper });
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
