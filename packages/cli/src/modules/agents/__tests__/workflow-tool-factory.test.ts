import type { WorkflowRepository, WorkflowEntity } from '@n8n/db';
import { In } from '@n8n/typeorm';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { WorkflowRunner } from '@/workflow-runner';

import {
	detectTriggerNode,
	normalizeTriggerInput,
	resolveWorkflowTool,
	validateCompatibility,
} from '../tools/workflow-tool-factory';
import type { WorkflowToolContext } from '../tools/workflow-tool-factory';
import { findWorkflowToolWorkflows } from '../tools/workflow-tool-workflow-resolver';

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
	const workflowRepository = mock<WorkflowRepository>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();

	workflowRepository.findOne.mockResolvedValue(foundWorkflow);

	return {
		workflowRepository,
		workflowRunner,
		activeExecutions,
		projectId: 'project-1',
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveWorkflowTool() — metadata attachment', () => {
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

	it('sets workflowId and workflowName from the resolved workflow (not the descriptor)', async () => {
		const workflow = makeWorkflow(
			{ id: 'wf-id-99', name: 'canonical-name' },
			makeManualTriggerNode(),
		);
		const context = makeContext(workflow);

		const tool = await resolveWorkflowTool(
			// descriptor.workflow is the lookup key; the built tool should reflect the resolved entity's name
			{ type: 'workflow', workflow: 'old-lookup-name', name: 'custom_tool_name' },
			context,
		);

		expect(tool.metadata).toMatchObject({
			workflowId: 'wf-id-99',
			workflowName: 'canonical-name',
		});
	});

	it('scopes the workflow lookup to the project', async () => {
		const workflow = makeWorkflow({ id: 'wf-scoped-1', name: 'Scoped Workflow' });
		const context = makeContext(workflow);

		await resolveWorkflowTool({ type: 'workflow', workflow: 'Scoped Workflow' }, context);

		expect(context.workflowRepository.findOne).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { name: 'Scoped Workflow', shared: { projectId: 'project-1' } },
				relations: ['shared'],
			}),
		);
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

describe('findWorkflowToolWorkflows', () => {
	it('returns an empty map without querying when no names are provided, and dedupes workflow names into a project-scoped map otherwise', async () => {
		const workflowRepository = mock<WorkflowRepository>();

		const emptyResult = await findWorkflowToolWorkflows(workflowRepository, [], 'project-1');

		expect(emptyResult).toEqual(new Map());
		expect(workflowRepository.find).not.toHaveBeenCalled();

		const workflow = makeWorkflow({ id: 'wf-a', name: 'Workflow A' });
		workflowRepository.find.mockResolvedValue([workflow]);

		const result = await findWorkflowToolWorkflows(
			workflowRepository,
			['Workflow A', 'Workflow A', 'Workflow B'],
			'project-1',
		);

		expect(workflowRepository.find).toHaveBeenCalledTimes(1);
		expect(workflowRepository.find).toHaveBeenCalledWith({
			where: { name: In(['Workflow A', 'Workflow B']), shared: { projectId: 'project-1' } },
			select: ['id', 'name', 'nodes'],
		});
		expect(result.get('Workflow A')).toBe(workflow);
		expect(result.has('Workflow B')).toBe(false);
	});
});
