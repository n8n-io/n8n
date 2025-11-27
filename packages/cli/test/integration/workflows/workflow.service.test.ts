import {
	createWorkflowWithHistory,
	createActiveWorkflow,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SharedWorkflowRepository, type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';

let globalConfig: GlobalConfig;
let workflowService: WorkflowService;
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
const workflowHistoryService = mockInstance(WorkflowHistoryService);
mockInstance(MessageEventBus);
mockInstance(Telemetry);

beforeAll(async () => {
	await testDb.init();

	globalConfig = Container.get(GlobalConfig);
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
		globalConfig,
		mock(),
		Container.get(WorkflowFinderService),
	);
});

afterEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowHistory']);
	jest.restoreAllMocks();

	globalConfig.workflows.draftPublishEnabled = false;
});

describe('update()', () => {
	test('should remove and re-add to active workflows on `active: true` payload', async () => {
		const owner = await createOwner();
		const workflow = await createActiveWorkflow({}, owner);

		const removeSpy = jest.spyOn(activeWorkflowManager, 'remove');
		const addSpy = jest.spyOn(activeWorkflowManager, 'add');

		const updateData = {
			active: true,
			versionId: workflow.versionId,
		};

		await workflowService.update(owner, updateData as WorkflowEntity, workflow.id);

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
		const workflow = await createActiveWorkflow({}, owner);

		const removeSpy = jest.spyOn(activeWorkflowManager, 'remove');
		const addSpy = jest.spyOn(activeWorkflowManager, 'add');

		const updateData = {
			active: false,
			versionId: workflow.versionId,
		};

		await workflowService.update(owner, updateData as WorkflowEntity, workflow.id);

		expect(removeSpy).toHaveBeenCalledTimes(1);
		const [removedWorkflowId] = removeSpy.mock.calls[0];
		expect(removedWorkflowId).toBe(workflow.id);

		expect(addSpy).not.toHaveBeenCalled();
	});

	test('should fetch missing connections from DB when updating nodes', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const updateData = {
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
		const workflow = await createWorkflowWithHistory({}, owner);

		const saveVersionSpy = jest.spyOn(workflowHistoryService, 'saveVersion');

		const updateData = {
			active: true,
			versionId: workflow.versionId,
		};

		await workflowService.update(owner, updateData as WorkflowEntity, workflow.id);

		expect(saveVersionSpy).not.toHaveBeenCalled();
	});

	test('should save workflow history version with backfilled data when versionId changes', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const saveVersionSpy = jest.spyOn(workflowHistoryService, 'saveVersion');

		const newVersionId = 'new-version-id-123';
		const updateData = {
			versionId: newVersionId,
		};

		await workflowService.update(owner, updateData as WorkflowEntity, workflow.id, {
			forceSave: true,
		});

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

describe('activateWorkflow()', () => {
	test('should activate current workflow version', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const updatedWorkflow = await workflowService.activateWorkflow(owner, workflow.id);

		expect(updatedWorkflow.active).toBe(true);
		expect(updatedWorkflow.activeVersionId).toBe(workflow.versionId);
	});

	test('should ignore provided workflow versionId', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const newVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

		const updatedWorkflow = await workflowService.activateWorkflow(owner, workflow.id, {
			versionId: newVersionId,
		});

		expect(updatedWorkflow.active).toBe(true);
		expect(updatedWorkflow.activeVersionId).toBe(workflow.versionId);
		expect(updatedWorkflow.versionId).toBe(workflow.versionId);
	});

	test('with draft/publish enabled: should activate the provided workflow version', async () => {
		globalConfig.workflows.draftPublishEnabled = true;

		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const newVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

		const updatedWorkflow = await workflowService.activateWorkflow(owner, workflow.id, {
			versionId: newVersionId,
		});

		expect(updatedWorkflow.active).toBe(true);
		expect(updatedWorkflow.activeVersionId).toBe(newVersionId);
		expect(updatedWorkflow.versionId).toBe(workflow.versionId);
	});
});
