import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import {
	ExecutionContextHookRegistry,
	ExecutionContextService,
	establishExecutionContext,
	type Cipher,
} from 'n8n-core';
import {
	createRunExecutionData,
	type INode,
	type IWorkflowExecuteAdditionalData,
	type Workflow,
	type WorkflowSettings,
} from 'n8n-workflow';

import type { InstanceRedactionEnforcementService } from '../instance-redaction-enforcement.service';
import { RedactionContextHook } from '../redaction-context-hook';

/**
 * Wires the real RedactionContextHook, ExecutionContextService and
 * ExecutionContextHookRegistry together and drives them through
 * establishExecutionContext. Proves the end-to-end contract: at execution-context
 * establishment time, instance enforcement overrides the workflow-configured
 * redaction policy, and absent enforcement the workflow setting wins.
 */
describe('RedactionContextHook integration with establishExecutionContext', () => {
	const buildWorkflow = (redactionPolicy?: WorkflowSettings.RedactionPolicy) =>
		mock<Workflow>({ id: 'wf-1', settings: { redactionPolicy } });

	const buildRunExecutionData = () => {
		const startNode = mock<INode>({ name: 'Start', type: 'n8n-nodes-base.manualTrigger' });
		return createRunExecutionData({
			startData: {},
			resultData: { runData: {} },
			executionData: {
				contextData: {},
				nodeExecutionStack: [{ node: startNode, data: { main: [[{ json: {} }]] }, source: null }],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		});
	};

	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
		formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
		encryptedRunnerIdentity: undefined,
	});

	const passthroughCipher = mock<Cipher>({
		encryptV2: async (data) => (typeof data === 'string' ? data : JSON.stringify(data)),
		decryptV2: async (data) => data,
	});

	let enforcementService: ReturnType<typeof mock<InstanceRedactionEnforcementService>>;

	beforeEach(() => {
		enforcementService = mock<InstanceRedactionEnforcementService>();

		const hook = new RedactionContextHook(enforcementService);

		const hookRegistry = mock<ExecutionContextHookRegistry>();
		hookRegistry.getGlobalHooks.mockReturnValue([hook]);

		const executionContextService = new ExecutionContextService(
			mock(),
			hookRegistry,
			passthroughCipher,
		);

		Container.set(ExecutionContextHookRegistry, hookRegistry);
		Container.set(ExecutionContextService, executionContextService);
	});

	afterEach(() => {
		Container.reset();
	});

	it('overrides workflow.settings.redactionPolicy when enforcement is active', async () => {
		enforcementService.buildContext.mockResolvedValue({
			enforcement: { enforced: true, manual: true, production: true },
		});

		const workflow = buildWorkflow('non-manual');
		const runExecutionData = buildRunExecutionData();

		await establishExecutionContext(workflow, runExecutionData, additionalData, 'manual');

		expect(runExecutionData.executionData!.runtimeData!.redaction).toEqual({
			version: 1,
			policy: 'all',
		});
	});

	it('falls back to workflow.settings.redactionPolicy when enforcement is inactive', async () => {
		enforcementService.buildContext.mockResolvedValue({
			enforcement: { enforced: false, manual: true, production: true },
		});

		const workflow = buildWorkflow('non-manual');
		const runExecutionData = buildRunExecutionData();

		await establishExecutionContext(workflow, runExecutionData, additionalData, 'manual');

		expect(runExecutionData.executionData!.runtimeData!.redaction).toEqual({
			version: 1,
			policy: 'non-manual',
		});
	});

	it('defaults to "none" when neither enforcement nor workflow setting applies', async () => {
		enforcementService.buildContext.mockResolvedValue(undefined);

		const workflow = buildWorkflow(undefined);
		const runExecutionData = buildRunExecutionData();

		await establishExecutionContext(workflow, runExecutionData, additionalData, 'manual');

		expect(runExecutionData.executionData!.runtimeData!.redaction).toEqual({
			version: 1,
			policy: 'none',
		});
	});
});
