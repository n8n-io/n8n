import { createWorkflowWithHistory, testDb, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	SharedWorkflowRepository,
	type WorkflowEntity,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
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
let workflowPublishHistoryRepository: WorkflowPublishHistoryRepository;
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
const workflowHistoryService = mockInstance(WorkflowHistoryService);
mockInstance(MessageEventBus);
mockInstance(Telemetry);

beforeAll(async () => {
	await testDb.init();

	globalConfig = Container.get(GlobalConfig);
	workflowPublishHistoryRepository = Container.get(WorkflowPublishHistoryRepository);
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
		workflowPublishHistoryRepository,
	);
});

afterEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowHistory', 'WorkflowPublishHistory']);
	jest.restoreAllMocks();
});

describe('update()', () => {
	test('should save workflow history version with backfilled data when nodes change', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');
		const saveVersionSpy = jest.spyOn(workflowHistoryService, 'saveVersion');

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
		};

		await workflowService.update(owner, updateData as WorkflowEntity, workflow.id, {
			forceSave: true,
		});

		expect(saveVersionSpy).toHaveBeenCalledTimes(1);
		const [user, workflowData, workflowId] = saveVersionSpy.mock.calls[0];
		expect(user).toBe(owner);
		expect(workflowId).toBe(workflow.id);
		expect(workflowData.nodes).toEqual(updateData.nodes);
		// Verify that connections were backfilled from the DB
		expect(workflowData.connections).toEqual(workflow.connections);
		expect(workflowData.versionId).not.toBe(workflow.versionId);
		expect(addRecordSpy).not.toBeCalled();
	});

	test('should save workflow history version with backfilled data when connection change', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');
		const saveVersionSpy = jest.spyOn(workflowHistoryService, 'saveVersion');

		const updateData = {
			connections: {
				'Manual Trigger': {
					main: [
						[
							{
								node: 'Code Node',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			},
		};

		await workflowService.update(owner, updateData as unknown as WorkflowEntity, workflow.id, {
			forceSave: true,
		});

		expect(saveVersionSpy).toHaveBeenCalledTimes(1);
		const [user, workflowData, workflowId] = saveVersionSpy.mock.calls[0];
		expect(user).toBe(owner);
		expect(workflowId).toBe(workflow.id);
		expect(workflowData.connections).toEqual(updateData.connections);
		// Verify that nodes were backfilled from the DB
		expect(workflowData.nodes).toEqual(workflow.nodes);
		expect(workflowData.versionId).not.toBe(workflow.versionId);
		expect(addRecordSpy).not.toBeCalled();
	});
});

describe('activateWorkflow()', () => {
	test('should activate current workflow version if no version provided', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');

		const updatedWorkflow = await workflowService.activateWorkflow(owner, workflow.id);

		expect(updatedWorkflow.active).toBe(true);
		expect(updatedWorkflow.activeVersionId).toBe(workflow.versionId);
		expect(updatedWorkflow.activeVersion).toBeDefined();
		expect(updatedWorkflow.activeVersion?.workflowPublishHistory).toHaveLength(1);
		expect(updatedWorkflow.activeVersion?.workflowPublishHistory[0]).toMatchObject({
			event: 'activated',
			versionId: workflow.versionId,
		});
		expect(addRecordSpy).toBeCalledWith({
			event: 'activated',
			workflowId: workflow.id,
			versionId: workflow.versionId,
			userId: owner.id,
		});
	});

	test('should activate the provided workflow version', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');

		const newVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

		const updatedWorkflow = await workflowService.activateWorkflow(owner, workflow.id, {
			versionId: newVersionId,
		});

		expect(updatedWorkflow.active).toBe(true);
		expect(updatedWorkflow.activeVersionId).toBe(newVersionId);
		expect(updatedWorkflow.versionId).toBe(workflow.versionId);
		expect(updatedWorkflow.activeVersion?.workflowPublishHistory).toHaveLength(1);
		expect(updatedWorkflow.activeVersion?.workflowPublishHistory[0]).toMatchObject({
			event: 'activated',
			versionId: newVersionId,
		});

		expect(addRecordSpy).toBeCalledWith({
			event: 'activated',
			workflowId: workflow.id,
			versionId: newVersionId,
			userId: owner.id,
		});
	});
});
