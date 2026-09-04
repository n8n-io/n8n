import type { WorkflowRepository, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError, type INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import type { WorkflowRunner } from '@/workflow-runner';

import {
	buildUnavailableWorkflowTool,
	detectTriggerNode,
	resolveWorkflowTool,
	validateCompatibility,
} from '../tools/workflow-tool-factory';
import type { WorkflowToolContext } from '../tools/workflow-tool-factory';
import { WorkflowToolUnavailableError } from '../tools/workflow-tool-unavailable-error';
import { findWorkflowToolWorkflows } from '../tools/workflow-tool-workflow-resolver';
import type { WorkflowToolWorkflowLoader } from '../tools/workflow-tool-workflow-loader.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TRIGGER_NAME = 'When Executed by Another Workflow';

function makeExecuteWorkflowTriggerNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'trigger-node-id',
		name: TRIGGER_NAME,
		type: 'n8n-nodes-base.executeWorkflowTrigger',
		typeVersion: 1.1,
		position: [0, 0],
		parameters: { inputSource: 'passthrough' },
		...overrides,
	};
}

function makeManualTriggerNode(): INode {
	return {
		id: 'manual-trigger-id',
		name: 'Manual Trigger',
		type: 'n8n-nodes-base.manualTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
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
	triggerNode: INode = makeExecuteWorkflowTriggerNode(),
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

// The build-time load may fall back to the draft; the call-time load never does.
const BUILD_LOAD_OPTIONS = { usePublishedVersion: false, fallbackToDraft: true };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveWorkflowTool() — metadata attachment', () => {
	afterEach(() => {
		Container.reset();
	});

	it('attaches workflow metadata to the built tool', async () => {
		const workflow = makeWorkflow({ id: 'wf-1', name: 'Execute Workflow' });
		const context = makeContext(workflow);

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Execute Workflow' },
			context,
		);

		expect(tool.metadata).toEqual({
			kind: 'workflow',
			workflowId: 'wf-1',
			workflowName: 'Execute Workflow',
			triggerType: 'executeWorkflow',
		});
	});

	it('resolves a renamed workflow by id', async () => {
		const workflow = makeWorkflow({ id: 'wf-id-99', name: 'canonical-name' });
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
			BUILD_LOAD_OPTIONS,
		);
	});

	it('requests the published workflow version for production runtimes', async () => {
		const workflow = makeWorkflow({ id: 'wf-published', name: 'Published Workflow' });
		const context = { ...makeContext(workflow), usePublishedWorkflowVersion: true };

		await resolveWorkflowTool({ type: 'workflow', workflow: 'Published Workflow' }, context);

		expect(context.workflowLoader.loadWorkflow).toHaveBeenCalledWith(
			'project-1',
			{ workflowName: 'Published Workflow' },
			{ usePublishedVersion: true, fallbackToDraft: true },
		);
	});

	it('builds the tool from the draft when the published version is missing', async () => {
		const draft = makeWorkflow({ id: 'wf-draft', name: 'Draft Only' });
		const context = { ...makeContext(draft), usePublishedWorkflowVersion: true };
		const notPublished = new UserError(
			'Workflow "Draft Only" is not published. Publish it so the published agent can use it.',
		);
		context.workflowLoader.loadWorkflow = vi
			.fn()
			.mockResolvedValueOnce(draft)
			.mockRejectedValueOnce(notPublished);

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflowId: 'wf-draft', workflow: 'Draft Only' },
			context,
		);

		expect(tool.metadata).toMatchObject({ workflowId: 'wf-draft' });
		await expect(tool.handler?.({}, {})).rejects.toThrow('is not published');
		expect(context.workflowLoader.loadWorkflow).toHaveBeenNthCalledWith(
			2,
			'project-1',
			{ workflowId: 'wf-draft', workflowName: 'Draft Only' },
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
			BUILD_LOAD_OPTIONS,
		);
	});

	it('reports a missing workflow as unavailable with reason not_found', async () => {
		const context = makeContext(null);

		await expect(
			resolveWorkflowTool({ type: 'workflow', workflow: 'Missing Workflow' }, context),
		).rejects.toMatchObject({
			constructor: WorkflowToolUnavailableError,
			reason: 'not_found',
			message: 'Workflow "Missing Workflow" not found',
		});
	});

	it('reports a workflow without the execute-workflow trigger as unavailable with reason incompatible', async () => {
		const context = makeContext(makeWorkflow({ name: 'Manual Only' }, makeManualTriggerNode()));

		await expect(
			resolveWorkflowTool({ type: 'workflow', workflow: 'Manual Only' }, context),
		).rejects.toMatchObject({
			constructor: WorkflowToolUnavailableError,
			reason: 'incompatible',
		});
	});

	it('runs a stubbed workflow tool as soon as the workflow is fixed', async () => {
		const broken = makeWorkflow({ id: 'wf-1', name: 'Fixable' }, makeManualTriggerNode());
		const fixed = makeWorkflow({ id: 'wf-1', name: 'Fixable' });
		const context = makeContext(broken);
		context.workflowLoader.loadWorkflow = vi
			.fn()
			.mockResolvedValueOnce(broken)
			.mockResolvedValueOnce(fixed);
		context.workflowRunner.run = vi.fn().mockResolvedValue('exec-1');
		context.activeExecutions.has = vi.fn().mockReturnValue(false);
		Container.set(ExecutionPersistence, {
			findSingleExecution: vi
				.fn()
				.mockResolvedValue({ status: 'success', data: { resultData: { runData: {} } } }),
		} as unknown as ExecutionPersistence);
		const descriptor = { type: 'workflow' as const, workflowId: 'wf-1', workflow: 'Fixable' };
		const stub = buildUnavailableWorkflowTool(descriptor, context);

		await expect(stub.handler?.({}, {})).rejects.toThrow(
			"needs a 'When Executed by Another Workflow' trigger",
		);
		await expect(stub.handler?.({}, {})).resolves.toMatchObject({
			executionId: 'exec-1',
			status: 'success',
		});
	});

	it('loads the current workflow for every invocation', async () => {
		const initial = makeWorkflow({ id: 'wf-current', name: 'Current Workflow' });
		const secondVersion = makeWorkflow({
			id: 'wf-current',
			name: 'Current Workflow',
			versionId: 'version-2',
			nodes: [
				makeExecuteWorkflowTriggerNode(),
				{ ...makeRespondToWebhookNode(), name: 'Version 2' },
			],
		});
		const thirdVersion = makeWorkflow({
			id: 'wf-current',
			name: 'Current Workflow',
			versionId: 'version-3',
			nodes: [
				makeExecuteWorkflowTriggerNode(),
				{ ...makeRespondToWebhookNode(), name: 'Version 3' },
			],
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
		expect(loadWorkflow).toHaveBeenNthCalledWith(
			1,
			'project-1',
			expectedReference,
			BUILD_LOAD_OPTIONS,
		);
		expect(loadWorkflow).toHaveBeenNthCalledWith(2, 'project-1', expectedReference, {
			usePublishedVersion: false,
		});
		expect(loadWorkflow).toHaveBeenNthCalledWith(3, 'project-1', expectedReference, {
			usePublishedVersion: false,
		});
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
			makeExecuteWorkflowTriggerNode({ type: 'n8n-nodes-base.scheduleTrigger' }),
		);

		expect(() => detectTriggerNode(workflow)).toThrow(
			"needs a 'When Executed by Another Workflow' trigger",
		);
	});

	it('allows Respond to Webhook nodes in workflow tools', () => {
		const workflow = makeWorkflow({
			nodes: [makeExecuteWorkflowTriggerNode(), makeRespondToWebhookNode()],
		});

		expect(() => validateCompatibility(workflow)).not.toThrow();
	});

	// A Wait node parks the sub-execution, which the tool hands off to HITL.
	it('allows a reachable Wait node in workflow tools', () => {
		const workflow = makeWorkflow({
			nodes: [
				makeExecuteWorkflowTriggerNode(),
				{
					id: 'wait-node-id',
					name: 'Wait',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1.1,
					position: [0, 0],
					parameters: { resume: 'webhook' },
				},
			],
			connections: { [TRIGGER_NAME]: { main: [[{ node: 'Wait', type: 'main', index: 0 }]] } },
		});

		expect(() => validateCompatibility(workflow)).not.toThrow();
	});

	// The Form node has no equivalent path — it needs an interactive browser
	// session part-way through the execution.
	it('rejects a reachable Form node in workflow tools', () => {
		const workflow = makeWorkflow({
			nodes: [
				makeExecuteWorkflowTriggerNode(),
				{
					id: 'form-node-id',
					name: 'Form',
					type: 'n8n-nodes-base.form',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: { [TRIGGER_NAME]: { main: [[{ node: 'Form', type: 'main', index: 0 }]] } },
		});

		expect(() => validateCompatibility(workflow)).toThrow("aren't supported as agent tools");
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
