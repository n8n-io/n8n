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
 * establishment time the effective redaction is resolved strictest-per-channel — the
 * instance floor is a minimum, and a workflow can only be equal to or stricter than it.
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

	const establishWith = async (
		floor: 'off' | 'production' | 'all',
		workflowPolicy?: WorkflowSettings.RedactionPolicy,
	) => {
		enforcementService.get.mockResolvedValue(floor);

		const workflow = buildWorkflow(workflowPolicy);
		const runExecutionData = buildRunExecutionData();

		await establishExecutionContext(workflow, runExecutionData, additionalData, 'manual');

		return runExecutionData.executionData!.runtimeData!.redaction;
	};

	it("floor 'production' + workflow default → production redacted, manual not", async () => {
		expect(await establishWith('production', undefined)).toEqual({
			version: 2,
			production: true,
			manual: false,
		});
	});

	it("floor 'production' + workflow redacts manual → both redacted (stricter workflow preserved)", async () => {
		expect(await establishWith('production', 'all')).toEqual({
			version: 2,
			production: true,
			manual: true,
		});
	});

	it("floor 'all' → both channels redacted regardless of workflow setting", async () => {
		expect(await establishWith('all', 'none')).toEqual({
			version: 2,
			production: true,
			manual: true,
		});
	});

	it("floor 'off' → workflow setting applies", async () => {
		expect(await establishWith('off', 'non-manual')).toEqual({
			version: 2,
			production: true,
			manual: false,
		});
	});

	it("floor 'off' + no workflow setting → nothing redacted", async () => {
		expect(await establishWith('off', undefined)).toEqual({
			version: 2,
			production: false,
			manual: false,
		});
	});
});
