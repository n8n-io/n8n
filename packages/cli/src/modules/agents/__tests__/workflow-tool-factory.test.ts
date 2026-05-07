import { mock } from 'jest-mock-extended';
import type { WorkflowRepository, UserRepository } from '@n8n/db';
import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowRunner } from '@/workflow-runner';
import type { ActiveExecutions } from '@/active-executions';
import type { ExecutionRepository } from '@n8n/db';

import { resolveWorkflowTool } from '../tools/workflow-tool-factory';
import type { WorkflowToolContext } from '../tools/workflow-tool-factory';

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

function makeContext(workflowForUser: WorkflowEntity | null): WorkflowToolContext {
	const workflowRepository = mock<WorkflowRepository>();
	const userRepository = mock<UserRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	const executionRepository = mock<ExecutionRepository>();

	// findOne returns a candidate workflow
	workflowRepository.findOne.mockResolvedValue(workflowForUser ?? makeWorkflow());

	// userRepository returns a dummy user
	userRepository.findOne.mockResolvedValue({ id: 'user-1' } as never);

	// workflowFinderService returns the full workflow for the user
	workflowFinderService.findWorkflowForUser.mockResolvedValue(workflowForUser);

	return {
		workflowRepository,
		workflowRunner,
		activeExecutions,
		executionRepository,
		workflowFinderService,
		userRepository,
		userId: 'user-1',
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
});
