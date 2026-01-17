import {
	createWorkflowWithHistory,
	testDb,
	mockInstance,
	createActiveWorkflow,
	createTeamProject,
	linkUserToProject,
} from '@n8n/backend-test-utils';
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
import { NodeTypes } from '@/node-types';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createCustomRoleWithScopeSlugs, cleanupRolesAndScopes } from '../shared/db/roles';
import { createOwner, createMember } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';

let globalConfig: GlobalConfig;
let workflowRepository: WorkflowRepository;
let workflowService: WorkflowService;
let workflowPublishHistoryRepository: WorkflowPublishHistoryRepository;
let workflowHistoryService: WorkflowHistoryService;
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
const workflowValidationService = mockInstance(WorkflowValidationService);
const nodeTypes = mockInstance(NodeTypes);
mockInstance(MessageEventBus);
mockInstance(Telemetry);

beforeAll(async () => {
	await testDb.init();

	globalConfig = Container.get(GlobalConfig);
	workflowRepository = Container.get(WorkflowRepository);
	workflowPublishHistoryRepository = Container.get(WorkflowPublishHistoryRepository);
	workflowHistoryService = Container.get(WorkflowHistoryService);
	workflowService = new WorkflowService(
		mock(),
		Container.get(SharedWorkflowRepository),
		workflowRepository,
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
		workflowValidationService,
		nodeTypes,
	);
});

beforeEach(() => {
	workflowValidationService.validateForActivation.mockReturnValue({ isValid: true });
	workflowValidationService.validateSubWorkflowReferences.mockResolvedValue({ isValid: true });
});

afterEach(async () => {
	await testDb.truncate([
		'SharedWorkflow',
		'ProjectRelation',
		'WorkflowEntity',
		'WorkflowHistory',
		'WorkflowPublishHistory',
		'Project',
		'User',
	]);
	await cleanupRolesAndScopes();
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
					type: 'n8n-nodes-base.manualTrigger',
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

	test('should not activate workflow if validation fails and keep old active version', async () => {
		const owner = await createOwner();
		const workflow = await createActiveWorkflow({}, owner);

		const oldActiveVersionId = workflow.activeVersionId;

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');

		// Create a new version to try to activate
		const newVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

		// Mock validation to fail
		workflowValidationService.validateForActivation.mockReturnValue({
			isValid: false,
			error: 'Workflow cannot be activated because it has no trigger node.',
		});

		await expect(
			workflowService.activateWorkflow(owner, workflow.id, {
				versionId: newVersionId,
			}),
		).rejects.toThrow('Workflow cannot be activated because it has no trigger node.');

		// Verify no publish history was added
		expect(addRecordSpy).not.toBeCalled();

		// Verify the workflow still has the old active version
		const workflowAfter = await workflowRepository.findOne({ where: { id: workflow.id } });
		expect(workflowAfter?.activeVersionId).toBe(oldActiveVersionId);
		expect(workflowAfter?.active).toBe(true);
	});

	test('should not activate workflow without workflow:publish permission', async () => {
		const owner = await createOwner();
		const member = await createMember();

		// custom role with workflow:update but not workflow:publish
		const customRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update'], {
			roleType: 'project',
			displayName: 'Custom Workflow Updater',
			description: 'Can update workflows but not publish them',
		});

		const project = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, project, customRole.slug);

		const workflow = await createWorkflowWithHistory({}, project);

		await expect(workflowService.activateWorkflow(member, workflow.id)).rejects.toThrow(
			'You do not have permission to activate this workflow. Ask the owner to share it with you.',
		);

		const workflowAfter = await workflowRepository.findOne({ where: { id: workflow.id } });
		expect(workflowAfter?.active).toBe(false);
		expect(workflowAfter?.activeVersionId).toBeNull();
	});
});

describe('deactivateWorkflow()', () => {
	test('should not deactivate workflow without workflow:publish permission', async () => {
		const owner = await createOwner();
		const member = await createMember();

		// custom role with workflow:update but not workflow:publish
		const customRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update'], {
			roleType: 'project',
			displayName: 'Custom Workflow Updater',
			description: 'Can update workflows but not publish them',
		});

		const project = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, project, customRole.slug);

		const workflow = await createActiveWorkflow({}, project);

		await expect(workflowService.deactivateWorkflow(member, workflow.id)).rejects.toThrow(
			'You do not have permission to deactivate this workflow. Ask the owner to share it with you.',
		);

		// Verify workflow is still active
		const workflowAfter = await workflowRepository.findOne({ where: { id: workflow.id } });
		expect(workflowAfter?.active).toBe(true);
		expect(workflowAfter?.activeVersionId).toBe(workflow.activeVersionId);
	});
});

describe('saveNamedVersion()', () => {
	test('should save a named version using current versionId', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const saveVersionSpy = jest.spyOn(workflowHistoryService, 'saveVersion');
		const updateVersionSpy = jest.spyOn(workflowHistoryService, 'updateVersion');

		const updatedWorkflow = await workflowService.saveNamedVersion(owner, workflow.id, {
			name: 'My Named Version',
			description: 'A test description',
		});

		// Verify saveVersion was called with autosaved = false
		expect(saveVersionSpy).toHaveBeenCalledTimes(1);
		expect(saveVersionSpy).toHaveBeenCalledWith(
			owner,
			expect.objectContaining({ versionId: workflow.versionId }),
			workflow.id,
			false,
		);

		// Verify updateVersion was called with name and description
		expect(updateVersionSpy).toHaveBeenCalledTimes(1);
		expect(updateVersionSpy).toHaveBeenCalledWith(workflow.versionId, workflow.id, {
			name: 'My Named Version',
			description: 'A test description',
		});

		// Verify workflow versionId is unchanged (uses existing version)
		expect(updatedWorkflow.versionId).toBe(workflow.versionId);

		// Verify activeVersionId is NOT changed
		expect(updatedWorkflow.activeVersionId).toBe(workflow.activeVersionId);

		// Verify workflow is NOT activated
		expect(updatedWorkflow.active).toBe(false);
	});

	test('should save a named version using provided versionId', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		// Create another version in history
		const specificVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: specificVersionId });

		const saveVersionSpy = jest.spyOn(workflowHistoryService, 'saveVersion');
		const updateVersionSpy = jest.spyOn(workflowHistoryService, 'updateVersion');

		const updatedWorkflow = await workflowService.saveNamedVersion(owner, workflow.id, {
			name: 'Specific Version',
			versionId: specificVersionId,
		});

		// Verify saveVersion was called with the specific versionId
		expect(saveVersionSpy).toHaveBeenCalledWith(
			owner,
			expect.objectContaining({ versionId: specificVersionId }),
			workflow.id,
			false,
		);

		// Verify updateVersion was called with the specific versionId
		expect(updateVersionSpy).toHaveBeenCalledWith(specificVersionId, workflow.id, {
			name: 'Specific Version',
		});

		// Verify workflow versionId is updated to specific version
		expect(updatedWorkflow.versionId).toBe(specificVersionId);
	});

	test('should save a named version with only name (no description)', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const updateVersionSpy = jest.spyOn(workflowHistoryService, 'updateVersion');

		await workflowService.saveNamedVersion(owner, workflow.id, {
			name: 'Version Without Description',
		});

		// Verify updateVersion was called with only name (no description field)
		expect(updateVersionSpy).toHaveBeenCalledWith(workflow.versionId, workflow.id, {
			name: 'Version Without Description',
		});
	});

	test('should not save named version without workflow:update permission', async () => {
		const owner = await createOwner();
		const member = await createMember();

		// custom role with workflow:read but not workflow:update
		const customRole = await createCustomRoleWithScopeSlugs(['workflow:read'], {
			roleType: 'project',
			displayName: 'Custom Workflow Reader',
			description: 'Can read workflows but not update them',
		});

		const project = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, project, customRole.slug);

		const workflow = await createWorkflowWithHistory({}, project);

		const saveVersionSpy = jest.spyOn(workflowHistoryService, 'saveVersion');

		await expect(
			workflowService.saveNamedVersion(member, workflow.id, {
				name: 'Unauthorized Version',
			}),
		).rejects.toThrow('Workflow not found');

		// Verify no version was saved
		expect(saveVersionSpy).not.toHaveBeenCalled();

		// Verify workflow is unchanged
		const workflowAfter = await workflowRepository.findOne({ where: { id: workflow.id } });
		expect(workflowAfter?.versionId).toBe(workflow.versionId);
	});

	test('should not change activeVersionId when saving a named version', async () => {
		const owner = await createOwner();
		const workflow = await createActiveWorkflow({}, owner);

		const originalActiveVersionId = workflow.activeVersionId;

		const updatedWorkflow = await workflowService.saveNamedVersion(owner, workflow.id, {
			name: 'Named Version on Active Workflow',
		});

		// Verify activeVersionId is unchanged
		expect(updatedWorkflow.activeVersionId).toBe(originalActiveVersionId);

		// Verify workflow remains active
		expect(updatedWorkflow.active).toBe(true);
	});
});
