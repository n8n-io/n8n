import { createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { SharedWorkflowRepository, type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';

let workflowService: WorkflowService;
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
const workflowHistoryService = mockInstance(WorkflowHistoryService);
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
		workflowHistoryService,
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

	test('should fetch missing connections from DB when updating nodes', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflow({}, owner);

		const updateData: Partial<WorkflowEntity> = {
			nodes: [
				{
					id: 'new-node',
					name: 'New Node',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [250, 300],
					parameters: {},
				},
			],
			versionId: workflow.versionId,
		};

		const updatedWorkflow = await workflowService.update(
			owner,
			updateData as WorkflowEntity,
			workflow.id,
		);

		expect(updatedWorkflow.nodes).toHaveLength(1);
		expect(updatedWorkflow.nodes[0].name).toBe('New Node');
		expect(updatedWorkflow.versionId).not.toBe(workflow.versionId);
	});

	test('should not save workflow history version when updating only active status', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflow({ active: false }, owner);

		const saveVersionSpy = jest.spyOn(workflowHistoryService, 'saveVersion');

		const updateData: Partial<WorkflowEntity> = {
			active: true,
			versionId: workflow.versionId,
		};

		await workflowService.update(owner, updateData as WorkflowEntity, workflow.id);

		expect(saveVersionSpy).not.toHaveBeenCalled();
	});

	test('should save workflow history version with backfilled data when versionId changes', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflow({ active: false }, owner);

		const saveVersionSpy = jest.spyOn(workflowHistoryService, 'saveVersion');

		const newVersionId = 'new-version-id-123';
		const updateData: Partial<WorkflowEntity> = {
			active: true,
			versionId: newVersionId,
		};

		await workflowService.update(
			owner,
			updateData as WorkflowEntity,
			workflow.id,
			undefined,
			undefined,
			true, // forceSave
		);

		expect(saveVersionSpy).toHaveBeenCalledTimes(1);
		const [user, workflowData, workflowId] = saveVersionSpy.mock.calls[0];
		expect(user).toBe(owner);
		expect(workflowId).toBe(workflow.id);
		// Verify that nodes and connections were backfilled from the DB
		expect(workflowData.nodes).toEqual(workflow.nodes);
		expect(workflowData.connections).toEqual(workflow.connections);
		expect(workflowData.versionId).toBe(newVersionId);
	});
});
