import { createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';

let workflowService: WorkflowService;
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
mockInstance(MessageEventBus);
mockInstance(Telemetry);

beforeAll(async () => {
	await testDb.init();

	workflowService = new WorkflowService(
		mock(),
		Container.get(SharedWorkflowRepository),
		Container.get(WorkflowRepository),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		activeWorkflowManager,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		Container.get(WorkflowFinderService),
	);
});

afterEach(async () => {
	await testDb.truncate(['WorkflowEntity']);
	jest.restoreAllMocks();
});

describe('update()', () => {
	test('should remove and re-add to active workflows on `active: true` payload', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflow({ active: true }, owner);

		const removeSpy = jest.spyOn(activeWorkflowManager, 'remove');
		const addSpy = jest.spyOn(activeWorkflowManager, 'add');

		await workflowService.update(owner, workflow, workflow.id);

		expect(removeSpy).toHaveBeenCalledTimes(1);
		const [removedWorkflowId] = removeSpy.mock.calls[0];
		expect(removedWorkflowId).toBe(workflow.id);

		expect(addSpy).toHaveBeenCalledTimes(1);
		const [addedWorkflowId, activationMode] = addSpy.mock.calls[0];
		expect(addedWorkflowId).toBe(workflow.id);
		expect(activationMode).toBe('update');
	});

	test('should remove from active workflows on `active: false` payload', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflow({ active: true }, owner);

		const removeSpy = jest.spyOn(activeWorkflowManager, 'remove');
		const addSpy = jest.spyOn(activeWorkflowManager, 'add');

		workflow.active = false;
		await workflowService.update(owner, workflow, workflow.id);

		expect(removeSpy).toHaveBeenCalledTimes(1);
		const [removedWorkflowId] = removeSpy.mock.calls[0];
		expect(removedWorkflowId).toBe(workflow.id);

		expect(addSpy).not.toHaveBeenCalled();
	});

	test('should allow name-only updates without nodes/connections', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflow({}, owner);

		const updateData = {
			name: 'New Name',
			versionCounter: workflow.versionCounter,
		} as any;

		const updatedWorkflow = await workflowService.update(owner, updateData, workflow.id);

		expect(updatedWorkflow.name).toBe('New Name');
		// versionId should NOT change since nodes/connections weren't updated
		expect(updatedWorkflow.versionId).toBe(workflow.versionId);
	});

	test('should fetch both nodes and connections from DB when missing', async () => {
		const owner = await createOwner();

		const startNodeId = 'start-node-id';
		const startNodeName = "When clicking 'Execute workflow'";
		const endNodeId = 'end-node-id';
		const endNodeName = 'Edit Fields';
		const connections = {
			[`${startNodeName}`]: {
				main: [
					[
						{
							node: `${endNodeName}`,
							type: 'main' as const,
							index: 0,
						},
					],
				],
			},
		};

		const workflow = await createWorkflow(
			{
				nodes: [
					{
						position: [288, 112],
						id: startNodeId,
						name: startNodeName,
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						parameters: {},
					},
					{
						position: [512, 112],
						id: endNodeId,
						name: endNodeName,
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						parameters: {},
					},
				],
				connections,
			},
			owner,
		);

		const updateData = {
			name: 'Updated Workflow Name',
			versionCounter: workflow.versionCounter,
		} as any;

		const updatedWorkflow = await workflowService.update(owner, updateData, workflow.id);

		expect(updatedWorkflow.name).toBe('Updated Workflow Name');
		expect(updatedWorkflow.nodes).toHaveLength(2);
		expect(updatedWorkflow.nodes[0].id).toBe(startNodeId);
		expect(updatedWorkflow.nodes[1].id).toBe(endNodeId);
		expect(updatedWorkflow.connections).toEqual(connections);
	});
});
