import type { WorkflowRepository, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import type { WorkflowRunner } from '@/workflow-runner';

import {
	detectTriggerNode,
	normalizeTriggerInput,
	resolveWorkflowTool,
	validateCompatibility,
} from '../tools/workflow-tool-factory';
import type { WorkflowToolContext } from '../tools/workflow-tool-factory';
import { findWorkflowToolWorkflows } from '../tools/workflow-tool-workflow-resolver';
import type { WorkflowToolWorkflowLoader } from '../tools/workflow-tool-workflow-loader.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeManualTriggerNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'trigger-node-id',
		name: 'Manual Trigger',
		type: 'n8n-nodes-base.manualTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function makeFormTriggerNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'trigger-node-id',
		name: 'Form Trigger',
		type: 'n8n-nodes-base.formTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: { path: 'my-form' },
		webhookId: 'webhook-abc',
		...overrides,
	};
}

function makeWebhookTriggerNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'webhook-node-id',
		name: 'Webhook',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 2,
		position: [0, 0],
		parameters: { responseMode: 'responseNode' },
		webhookId: 'webhook-abc',
		...overrides,
	};
}

function makeRespondToWebhookNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'respond-node-id',
		name: 'Respond to Webhook',
		type: 'n8n-nodes-base.respondToWebhook',
		typeVersion: 1.5,
		position: [0, 0],
		parameters: { respondWith: 'firstIncomingItem' },
		...overrides,
	};
}

function makeWorkflow(
	overrides: Partial<WorkflowEntity> = {},
	triggerNode: INode = makeManualTriggerNode(),
): WorkflowEntity {
	return {
		id: 'workflow-123',
		name: 'My Test Workflow',
		active: false,
		nodes: [triggerNode],
		connections: {},
		settings: {},
		pinData: {},
		...overrides,
	} as unknown as WorkflowEntity;
}

function makeContext(foundWorkflow: WorkflowEntity | null): WorkflowToolContext {
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	const workflowLoader = mock<WorkflowToolWorkflowLoader>();

	workflowLoader.loadWorkflow.mockResolvedValue(foundWorkflow);

	return {
		workflowLoader,
		workflowRunner,
		subworkflowPolicyChecker: mock<SubworkflowPolicyChecker>(),
		activeExecutions,
		projectId: 'project-1',
		executionMode: 'manual',
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveWorkflowTool() — metadata attachment', () => {
	afterEach(() => {
		Container.reset();
	});

	it('attaches metadata with triggerType "manual" for a manual trigger workflow', async () => {
		const workflow = makeWorkflow(
			{ id: 'wf-manual-1', name: 'Manual Workflow' },
			makeManualTriggerNode(),
		);
		const context = makeContext(workflow);

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Manual Workflow' },
			context,
		);

		expect(tool.metadata).toEqual({
			kind: 'workflow',
			workflowId: 'wf-manual-1',
			workflowName: 'Manual Workflow',
			triggerType: 'manual',
		});
	});

	it('attaches metadata with triggerType "form" for a form trigger workflow', async () => {
		const workflow = makeWorkflow(
			{ id: 'wf-form-2', name: 'Form Workflow' },
			makeFormTriggerNode(),
		);
		const context = makeContext(workflow);

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Form Workflow' },
			context,
		);

		expect(tool.metadata).toEqual({
			kind: 'workflow',
			workflowId: 'wf-form-2',
			workflowName: 'Form Workflow',
			triggerType: 'form',
		});
	});

	it('resolves a renamed workflow by id', async () => {
		const workflow = makeWorkflow(
			{ id: 'wf-id-99', name: 'canonical-name' },
			makeManualTriggerNode(),
		);
		const context = makeContext(workflow);

		const tool = await resolveWorkflowTool(
			{
				type: 'workflow',
				workflowId: 'wf-id-99',
				workflow: 'old-lookup-name',
				name: 'custom_tool_name',
			},
			context,
		);

		expect(tool.metadata).toMatchObject({
			workflowId: 'wf-id-99',
			workflowName: 'canonical-name',
		});
	});

	it('passes the project scope to legacy name lookup', async () => {
		const workflow = makeWorkflow({ id: 'wf-scoped-1', name: 'Scoped Workflow' });
		const context = makeContext(workflow);

		await resolveWorkflowTool({ type: 'workflow', workflow: 'Scoped Workflow' }, context);

		expect(context.workflowLoader.loadWorkflow).toHaveBeenCalledWith(
			'project-1',
			{ workflowName: 'Scoped Workflow' },
			{ usePublishedVersion: false },
		);
	});

	it('requests the published workflow version for production runtimes', async () => {
		const workflow = makeWorkflow({ id: 'wf-published', name: 'Published Workflow' });
		const context = { ...makeContext(workflow), usePublishedWorkflowVersion: true };

		await resolveWorkflowTool({ type: 'workflow', workflow: 'Published Workflow' }, context);

		expect(context.workflowLoader.loadWorkflow).toHaveBeenCalledWith(
			'project-1',
			{ workflowName: 'Published Workflow' },
			{ usePublishedVersion: true },
		);
	});

	it('does not fall back to the cached name when an id is present', async () => {
		const context = makeContext(null);

		await expect(
			resolveWorkflowTool(
				{ type: 'workflow', workflowId: 'missing-id', workflow: 'Existing Workflow' },
				context,
			),
		).rejects.toThrow('Workflow "Existing Workflow" not found');

		expect(context.workflowLoader.loadWorkflow).toHaveBeenCalledWith(
			'project-1',
			{ workflowId: 'missing-id', workflowName: 'Existing Workflow' },
			{ usePublishedVersion: false },
		);
	});

	it('throws when the workflow is not shared with the project', async () => {
		const context = makeContext(null);

		await expect(
			resolveWorkflowTool({ type: 'workflow', workflow: 'Missing Workflow' }, context),
		).rejects.toThrow('Workflow "Missing Workflow" not found');
	});

	it('loads the current workflow for every invocation', async () => {
		const initial = makeWorkflow({ id: 'wf-current', name: 'Current Workflow' });
		const secondVersion = makeWorkflow({
			id: 'wf-current',
			name: 'Current Workflow',
			versionId: 'version-2',
			nodes: [makeManualTriggerNode(), { ...makeRespondToWebhookNode(), name: 'Version 2' }],
		});
		const thirdVersion = makeWorkflow({
			id: 'wf-current',
			name: 'Current Workflow',
			versionId: 'version-3',
			nodes: [makeManualTriggerNode(), { ...makeRespondToWebhookNode(), name: 'Version 3' }],
		});
		const context = makeContext(initial);
		const loadWorkflow = vi
			.fn()
			.mockResolvedValueOnce(initial)
			.mockResolvedValueOnce(secondVersion)
			.mockResolvedValueOnce(thirdVersion);
		Object.assign(context, {
			workflowLoader: { loadWorkflow },
			executionMode: 'integrated',
		});
		context.workflowRunner.run = vi
			.fn()
			.mockResolvedValueOnce('exec-1')
			.mockResolvedValueOnce('exec-2');
		context.activeExecutions.has = vi.fn().mockReturnValue(false);
		Container.set(ExecutionPersistence, {
			findSingleExecution: vi
				.fn()
				.mockResolvedValue({ status: 'success', data: { resultData: { runData: {} } } }),
		} as unknown as ExecutionPersistence);

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflowId: 'wf-current', workflow: 'Current Workflow' },
			context,
		);
		await tool.handler?.({}, {});
		await tool.handler?.({}, {});

		const expectedReference = { workflowId: 'wf-current', workflowName: 'Current Workflow' };
		const expectedOptions = { usePublishedVersion: false };
		expect(loadWorkflow).toHaveBeenNthCalledWith(
			1,
			'project-1',
			expectedReference,
			expectedOptions,
		);
		expect(loadWorkflow).toHaveBeenNthCalledWith(
			2,
			'project-1',
			expectedReference,
			expectedOptions,
		);
		expect(loadWorkflow).toHaveBeenNthCalledWith(
			3,
			'project-1',
			expectedReference,
			expectedOptions,
		);
		expect(context.workflowRunner.run).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				workflowData: expect.objectContaining({ versionId: 'version-2' }),
			}),
			undefined,
			undefined,
			undefined,
			expect.anything(),
		);
		expect(context.workflowRunner.run).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				workflowData: expect.objectContaining({ versionId: 'version-3' }),
			}),
			undefined,
			undefined,
			undefined,
			expect.anything(),
		);
	});
});

describe('workflow tool compatibility', () => {
	it('rejects workflows with only a schedule trigger', () => {
		const workflow = makeWorkflow(
			{},
			makeManualTriggerNode({ type: 'n8n-nodes-base.scheduleTrigger' }),
		);

		expect(() => detectTriggerNode(workflow)).toThrow('no supported trigger node');
	});

	it('allows Respond to Webhook nodes in workflow tools', () => {
		const workflow = makeWorkflow({
			nodes: [makeWebhookTriggerNode(), makeRespondToWebhookNode()],
		});

		expect(() => validateCompatibility(workflow)).not.toThrow();
	});

	// A Wait node parks the sub-execution, which the tool hands off to HITL.
	it('allows a reachable Wait node in workflow tools', () => {
		const workflow = makeWorkflow({
			nodes: [
				makeManualTriggerNode(),
				{
					id: 'wait-node-id',
					name: 'Wait',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: { resume: 'webhook' },
				},
			],
			connections: { 'Manual Trigger': { main: [[{ node: 'Wait', type: 'main', index: 0 }]] } },
		});

		expect(() => validateCompatibility(workflow)).not.toThrow();
	});

	// The Form node has no equivalent path — it needs an interactive browser
	// session part-way through the execution.
	it('rejects a reachable Form node in workflow tools', () => {
		const workflow = makeWorkflow({
			nodes: [
				makeManualTriggerNode(),
				{
					id: 'form-node-id',
					name: 'Form',
					type: 'n8n-nodes-base.form',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: { 'Manual Trigger': { main: [[{ node: 'Form', type: 'main', index: 0 }]] } },
		});

		expect(() => validateCompatibility(workflow)).toThrow("aren't supported as agent tools");
	});

	it('attaches metadata with triggerType "webhook" for a webhook trigger workflow', async () => {
		const workflow = makeWorkflow(
			{ id: 'wf-webhook-1', name: 'Webhook Workflow' },
			makeWebhookTriggerNode(),
		);
		const context = makeContext(workflow);

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Webhook Workflow' },
			context,
		);

		expect(tool.metadata).toEqual({
			kind: 'workflow',
			workflowId: 'wf-webhook-1',
			workflowName: 'Webhook Workflow',
			triggerType: 'webhook',
		});
	});

	it('normalizes webhook tool input into the webhook trigger output shape', () => {
		const triggerNode = makeWebhookTriggerNode();
		const pinData = normalizeTriggerInput(
			triggerNode,
			'webhook',
			{
				customerId: '123',
				priority: 'high',
			},
			'integrated',
		);

		expect(pinData).toEqual({
			Webhook: [
				{
					json: {
						headers: {},
						params: {},
						query: {},
						body: { customerId: '123', priority: 'high' },
						webhookUrl: '',
						executionMode: 'production',
					},
				},
			],
		});
	});
});

describe('findWorkflowToolWorkflows', () => {
	it('maps id-backed and legacy refs without using the stale name as an id fallback', async () => {
		const workflowRepository = mock<WorkflowRepository>();

		const emptyResult = await findWorkflowToolWorkflows(workflowRepository, [], 'project-1');

		expect(emptyResult).toEqual(new Map());
		expect(workflowRepository.findManyByAgentToolReferences).not.toHaveBeenCalled();

		const renamedWorkflow = makeWorkflow({ id: 'wf-a', name: 'Renamed Workflow' });
		const legacyWorkflow = makeWorkflow({ id: 'wf-b', name: 'Legacy Workflow' });
		workflowRepository.findManyByAgentToolReferences.mockResolvedValue([
			renamedWorkflow,
			legacyWorkflow,
		]);

		const result = await findWorkflowToolWorkflows(
			workflowRepository,
			[
				{ type: 'workflow', workflowId: 'wf-a', workflow: 'Old Workflow Name' },
				{ type: 'workflow', workflow: 'Legacy Workflow' },
			],
			'project-1',
		);

		expect(workflowRepository.findManyByAgentToolReferences).toHaveBeenCalledWith(
			'project-1',
			['wf-a'],
			['Legacy Workflow'],
		);
		expect(result.get('wf-a')).toBe(renamedWorkflow);
		expect(result.has('Old Workflow Name')).toBe(false);
		expect(result.get('Legacy Workflow')).toBe(legacyWorkflow);
	});
});
