import { isZodSchema, type BuiltTool, type InterruptibleToolContext } from '@n8n/agents';
import type { WorkflowRepository, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import type { WorkflowRunner } from '@/workflow-runner';

import { buildFromJson } from '../json-config/from-json-config';
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

function makeExecuteWorkflowTriggerNode(
	values: Array<{ name: string; type?: string }> = [],
	overrides: Partial<INode> = {},
): INode {
	return {
		id: 'execute-workflow-trigger-node-id',
		name: 'Execute Workflow Trigger',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: { workflowInputs: { values } },
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
		pinData: undefined,
		...overrides,
	} as unknown as WorkflowEntity;
}

type TestWorkflowToolContext = WorkflowToolContext & {
	workflowLoader: ReturnType<typeof mock<WorkflowToolWorkflowLoader>>;
	workflowRunner: ReturnType<typeof mock<WorkflowRunner>>;
};

function makeContext(
	foundWorkflow: WorkflowEntity | null,
	publishedVersionId = 'published-version-1',
): TestWorkflowToolContext {
	const workflowLoader = mock<WorkflowToolWorkflowLoader>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();

	workflowLoader.loadPublishedWorkflow.mockResolvedValue(
		foundWorkflow ? { workflow: foundWorkflow, publishedVersionId } : null,
	);
	workflowRunner.run.mockResolvedValue('execution-1');
	activeExecutions.has.mockReturnValue(false);

	return {
		workflowLoader,
		workflowRunner,
		activeExecutions,
		projectId: 'project-1',
		runType: 'test',
	} as unknown as TestWorkflowToolContext;
}

async function invokeTool(tool: BuiltTool, input: Record<string, unknown>): Promise<unknown> {
	if (!tool.handler) throw new Error('Expected workflow tool to have a handler');
	return await tool.handler(input, {} as never);
}

async function wrapWorkflowToolForApproval(
	tool: BuiltTool,
	workflowName: string,
): Promise<BuiltTool> {
	const agent = await buildFromJson(
		{
			name: 'approval-test-agent',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'credential-1',
			instructions: 'Test workflow approval.',
			tools: [
				{
					type: 'workflow',
					workflow: workflowName,
					name: tool.name,
					requireApproval: true,
				},
			],
		},
		{},
		{
			toolExecutor: { executeTool: vi.fn() },
			credentialProvider: {
				resolve: vi.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
				list: vi.fn().mockResolvedValue([]),
			},
			memoryFactory: () => {
				throw new Error('Memory is not configured for this test');
			},
			resolveTool: vi.fn().mockResolvedValue(tool),
		},
	);
	const wrapped = agent.declaredTools.find((candidate) => candidate.name === tool.name);
	if (!wrapped) throw new Error('Expected workflow tool to be approval wrapped');
	return wrapped;
}

function makeApprovalContext(resumeData?: unknown) {
	const suspend = vi.fn<InterruptibleToolContext['suspend']>(
		async () => await Promise.resolve({ suspended: true } as never),
	);
	const context: InterruptibleToolContext = {
		suspend,
		resumeData,
	};
	return { context, suspend };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveWorkflowTool() — metadata attachment', () => {
	it('keeps the compiled input schema while deferring validation to the current handler', async () => {
		const workflow = makeWorkflow(
			{ id: 'wf-dynamic-schema', name: 'Dynamic Schema Workflow' },
			makeExecuteWorkflowTriggerNode([{ name: 'oldField' }]),
		);
		const context = makeContext(workflow);

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Dynamic Schema Workflow' },
			context,
		);

		expect(tool.handlerValidatesInput).toBe(true);
		expect(isZodSchema(tool.inputSchema)).toBe(true);
		if (!isZodSchema(tool.inputSchema)) throw new Error('Expected a Zod input schema');
		expect(tool.inputSchema.safeParse({ oldField: 'compiled value' }).success).toBe(true);
		expect(tool.inputSchema.safeParse({ currentField: 'new value' }).success).toBe(false);
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
			workflowVersionId: 'published-version-1',
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
			workflowVersionId: 'published-version-1',
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

		expect(context.workflowLoader.loadPublishedWorkflow).toHaveBeenCalledWith('project-1', {
			workflowName: 'Scoped Workflow',
		});
	});

	it('does not fall back to the cached name when an id is present', async () => {
		const context = makeContext(null);

		await expect(
			resolveWorkflowTool(
				{ type: 'workflow', workflowId: 'missing-id', workflow: 'Existing Workflow' },
				context,
			),
		).rejects.toThrow('Workflow "Existing Workflow" not found');

		expect(context.workflowLoader.loadPublishedWorkflow).toHaveBeenCalledWith('project-1', {
			workflowId: 'missing-id',
			workflowName: 'Existing Workflow',
		});
	});

	it('throws when the workflow is not shared with the project', async () => {
		const context = makeContext(null);

		await expect(
			resolveWorkflowTool({ type: 'workflow', workflow: 'Missing Workflow' }, context),
		).rejects.toThrow('Workflow "Missing Workflow" not found');
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
			workflowVersionId: 'published-version-1',
			workflowName: 'Webhook Workflow',
			triggerType: 'webhook',
		});
	});

	it('normalizes webhook tool input into the webhook trigger output shape', () => {
		const triggerNode = makeWebhookTriggerNode();
		const pinData = normalizeTriggerInput(triggerNode, 'webhook', {
			customerId: '123',
			priority: 'high',
		});

		expect(pinData).toEqual({
			Webhook: [
				{
					json: {
						headers: {},
						params: {},
						query: {},
						body: { customerId: '123', priority: 'high' },
						webhookUrl: '',
						executionMode: 'agent',
					},
				},
			],
		});
	});
});

describe('resolveWorkflowTool() — published snapshot freshness', () => {
	beforeEach(() => {
		Container.set(ExecutionPersistence, {
			findSingleExecution: vi
				.fn()
				.mockResolvedValue({ status: 'success', data: { resultData: { runData: {} } } }),
		} as unknown as ExecutionPersistence);
	});

	afterEach(() => {
		Container.reset();
	});

	it('executes the latest published workflow instead of the build-time snapshot', async () => {
		const initial = makeWorkflow(
			{ id: 'wf-fresh', name: 'Fresh Workflow' },
			makeManualTriggerNode({ name: 'Initial Trigger' }),
		);
		const latest = makeWorkflow(
			{ id: 'wf-fresh', name: 'Fresh Workflow' },
			makeExecuteWorkflowTriggerNode([{ name: 'customerId' }], { name: 'Latest Trigger' }),
		);
		const context = makeContext(initial, 'version-1');
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: initial, publishedVersionId: 'version-1' })
			.mockResolvedValue({ workflow: latest, publishedVersionId: 'version-2' });

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Fresh Workflow' },
			context,
		);
		await invokeTool(tool, { customerId: 'customer-1' });

		const runData = context.workflowRunner.run.mock.calls[0][0];
		expect(runData.workflowData).toBe(latest);
		expect(runData.startNodes).toEqual([{ name: 'Latest Trigger', sourceData: null }]);
		expect(context.workflowLoader.loadPublishedWorkflow).toHaveBeenNthCalledWith(2, 'project-1', {
			workflowId: 'wf-fresh',
			workflowName: 'Fresh Workflow',
		});
	});

	it('reloads the published workflow for every call to the same built handler', async () => {
		const initial = makeWorkflow({ id: 'wf-repeat', name: 'Repeat Workflow' });
		const second = makeWorkflow(
			{ id: 'wf-repeat', name: 'Repeat Workflow' },
			makeManualTriggerNode({ name: 'Second Trigger' }),
		);
		const third = makeWorkflow(
			{ id: 'wf-repeat', name: 'Repeat Workflow' },
			makeManualTriggerNode({ name: 'Third Trigger' }),
		);
		const context = makeContext(initial);
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: initial, publishedVersionId: 'version-1' })
			.mockResolvedValueOnce({ workflow: second, publishedVersionId: 'version-2' })
			.mockResolvedValueOnce({ workflow: third, publishedVersionId: 'version-3' });

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Repeat Workflow' },
			context,
		);
		await invokeTool(tool, {});
		await invokeTool(tool, {});

		expect(context.workflowLoader.loadPublishedWorkflow).toHaveBeenCalledTimes(3);
		expect(context.workflowRunner.run.mock.calls[0][0].startNodes?.[0]?.name).toBe(
			'Second Trigger',
		);
		expect(context.workflowRunner.run.mock.calls[1][0].startNodes?.[0]?.name).toBe('Third Trigger');
	});

	it('keeps using the resolved workflow id after the workflow is renamed', async () => {
		const initial = makeWorkflow({ id: 'wf-rename', name: 'Original Name' });
		const renamed = makeWorkflow({ id: 'wf-rename', name: 'Renamed Workflow' });
		const context = makeContext(initial);
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: initial, publishedVersionId: 'version-1' })
			.mockResolvedValueOnce({ workflow: renamed, publishedVersionId: 'version-2' });

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Original Name' },
			context,
		);
		await invokeTool(tool, {});

		expect(context.workflowLoader.loadPublishedWorkflow).toHaveBeenNthCalledWith(2, 'project-1', {
			workflowId: 'wf-rename',
			workflowName: 'Original Name',
		});
		expect(context.workflowRunner.run.mock.calls[0][0].workflowData).toBe(renamed);
	});

	it('returns and renders the form URL from the latest published workflow', async () => {
		const initial = makeWorkflow(
			{ id: 'wf-form-current', name: 'Current Form' },
			makeFormTriggerNode({ parameters: { path: 'initial-path' } }),
		);
		const latest = makeWorkflow(
			{ id: 'wf-form-current', name: 'Current Form' },
			makeFormTriggerNode({ parameters: { path: 'latest-path' } }),
		);
		const context = makeContext(initial);
		context.webhookBaseUrl = 'https://example.test/';
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: initial, publishedVersionId: 'version-1' })
			.mockResolvedValueOnce({ workflow: latest, publishedVersionId: 'version-2' });

		const tool = await resolveWorkflowTool({ type: 'workflow', workflow: 'Current Form' }, context);
		const result = await invokeTool(tool, { reason: 'Please complete it' });

		expect(result).toEqual({
			status: 'form_link_sent',
			formUrl: 'https://example.test/form/latest-path',
			message: 'Please complete it',
		});
		expect(tool.toMessage?.(result)).toEqual({
			type: 'custom',
			components: [
				{
					type: 'section',
					text: '📋 *<https://example.test/form/latest-path|Click here to open the form>*',
				},
			],
		});
	});

	it('switches from a form link to execution when the latest publication changes trigger type', async () => {
		const initial = makeWorkflow(
			{ id: 'wf-form-to-run', name: 'Changing Workflow' },
			makeFormTriggerNode(),
		);
		const latest = makeWorkflow(
			{ id: 'wf-form-to-run', name: 'Changing Workflow' },
			makeManualTriggerNode({ name: 'Latest Manual Trigger' }),
		);
		const context = makeContext(initial);
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: initial, publishedVersionId: 'version-1' })
			.mockResolvedValueOnce({ workflow: latest, publishedVersionId: 'version-2' });

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Changing Workflow' },
			context,
		);
		const result = await invokeTool(tool, { input: 'run now' });

		expect(context.workflowRunner.run).toHaveBeenCalledOnce();
		expect(tool.toMessage?.(result)).toBeUndefined();
	});

	it('switches from execution to a form link when the latest publication changes trigger type', async () => {
		const initial = makeWorkflow({ id: 'wf-run-to-form', name: 'Changing Workflow' });
		const latest = makeWorkflow(
			{ id: 'wf-run-to-form', name: 'Changing Workflow' },
			makeFormTriggerNode({ parameters: { path: 'new-form' } }),
		);
		const context = makeContext(initial);
		context.webhookBaseUrl = 'https://example.test';
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: initial, publishedVersionId: 'version-1' })
			.mockResolvedValueOnce({ workflow: latest, publishedVersionId: 'version-2' });

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Changing Workflow' },
			context,
		);
		const result = await invokeTool(tool, { reason: 'Fill this in' });

		expect(result).toMatchObject({
			status: 'form_link_sent',
			formUrl: 'https://example.test/form/new-form',
		});
		expect(context.workflowRunner.run).not.toHaveBeenCalled();
	});

	it('rejects an unavailable latest publication without calling the runner', async () => {
		const initial = makeWorkflow({ id: 'wf-unavailable', name: 'Unavailable Workflow' });
		const context = makeContext(initial);
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: initial, publishedVersionId: 'version-1' })
			.mockResolvedValueOnce(null);

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Unavailable Workflow' },
			context,
		);

		await expect(invokeTool(tool, {})).rejects.toThrow(
			'no longer available as a published workflow',
		);
		expect(context.workflowRunner.run).not.toHaveBeenCalled();
	});

	it('rejects an incompatible latest publication without calling the runner', async () => {
		const initial = makeWorkflow({ id: 'wf-incompatible', name: 'Compatible Workflow' });
		const incompatible = makeWorkflow({
			id: 'wf-incompatible',
			name: 'Compatible Workflow',
			nodes: [
				makeManualTriggerNode(),
				{
					id: 'wait-node-id',
					name: 'Wait',
					type: 'n8n-nodes-base.wait',
					typeVersion: 1,
					position: [100, 0],
					parameters: {},
				},
			],
		});
		const context = makeContext(initial);
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: initial, publishedVersionId: 'version-1' })
			.mockResolvedValueOnce({ workflow: incompatible, publishedVersionId: 'version-2' });

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Compatible Workflow' },
			context,
		);

		await expect(invokeTool(tool, {})).rejects.toThrow('contains incompatible nodes');
		expect(context.workflowRunner.run).not.toHaveBeenCalled();
	});

	it('parses handler input against the latest published trigger schema', async () => {
		const initial = makeWorkflow(
			{ id: 'wf-schema', name: 'Schema Workflow' },
			makeExecuteWorkflowTriggerNode([{ name: 'oldField' }]),
		);
		const latest = makeWorkflow(
			{ id: 'wf-schema', name: 'Schema Workflow' },
			makeExecuteWorkflowTriggerNode([{ name: 'currentCount', type: 'number' }]),
		);
		const context = makeContext(initial);
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: initial, publishedVersionId: 'version-1' })
			.mockResolvedValue({ workflow: latest, publishedVersionId: 'version-2' });

		const tool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Schema Workflow' },
			context,
		);

		await expect(invokeTool(tool, { currentCount: 'not-a-number' })).rejects.toThrow();
		expect(context.workflowRunner.run).not.toHaveBeenCalled();
	});

	it('rejects invalid current input before requesting workflow approval', async () => {
		const initial = makeWorkflow(
			{ id: 'wf-approval-schema', name: 'Approval Schema Workflow' },
			makeExecuteWorkflowTriggerNode([{ name: 'oldField' }]),
		);
		const current = makeWorkflow(
			{ id: 'wf-approval-schema', name: 'Approval Schema Workflow' },
			makeExecuteWorkflowTriggerNode([{ name: 'currentCount', type: 'number' }]),
		);
		const context = makeContext(initial, 'version-1');
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: initial, publishedVersionId: 'version-1' })
			.mockResolvedValueOnce({ workflow: current, publishedVersionId: 'version-2' });
		const workflowTool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Approval Schema Workflow' },
			context,
		);
		const wrapped = await wrapWorkflowToolForApproval(workflowTool, 'Approval Schema Workflow');
		const initialCall = makeApprovalContext();

		await expect(
			wrapped.handler!({ currentCount: 'not-a-number' }, initialCall.context),
		).rejects.toThrow();

		expect(initialCall.suspend).not.toHaveBeenCalled();
		expect(context.workflowRunner.run).not.toHaveBeenCalled();
	});

	it('does not execute a workflow publication that changed after approval', async () => {
		const approved = makeWorkflow(
			{ id: 'wf-approval-version', name: 'Approval Version Workflow' },
			makeManualTriggerNode({ name: 'Approved Trigger' }),
		);
		const republished = makeWorkflow(
			{ id: 'wf-approval-version', name: 'Approval Version Workflow' },
			makeManualTriggerNode({ name: 'Republished Trigger' }),
		);
		const context = makeContext(approved, 'version-1');
		context.workflowLoader.loadPublishedWorkflow
			.mockReset()
			.mockResolvedValueOnce({ workflow: approved, publishedVersionId: 'version-1' })
			.mockResolvedValueOnce({ workflow: approved, publishedVersionId: 'version-1' })
			.mockResolvedValueOnce({ workflow: republished, publishedVersionId: 'version-2' });
		const workflowTool = await resolveWorkflowTool(
			{ type: 'workflow', workflow: 'Approval Version Workflow' },
			context,
		);
		const wrapped = await wrapWorkflowToolForApproval(workflowTool, 'Approval Version Workflow');
		const input = { input: 'run approved workflow' };
		const initialCall = makeApprovalContext();

		await wrapped.handler!(input, initialCall.context);

		const [suspendPayload, suspendOptions] = initialCall.suspend.mock.calls[0] ?? [];
		const approvedCall = makeApprovalContext({ approved: true });
		approvedCall.context.suspendPayload = suspendPayload;
		approvedCall.context.continuation = suspendOptions?.continuation;

		await expect(wrapped.handler!(input, approvedCall.context)).rejects.toThrow(
			'changed after approval',
		);
		expect(context.workflowLoader.loadPublishedWorkflow).toHaveBeenCalledTimes(3);
		expect(context.workflowRunner.run).not.toHaveBeenCalled();
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
