import type { Logger } from '@n8n/backend-common';
import {
	createWorkflowWithHistory,
	testDb,
	mockInstance,
	createActiveWorkflow,
	createTeamProject,
	linkUserToProject,
	createWorkflow,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	SharedWorkflowRepository,
	type WorkflowEntity,
	WorkflowPublishedVersionRepository,
	WorkflowPublishHistoryRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowRepository,
	ProjectRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { NodeTypes } from '@/node-types';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { Telemetry } from '@/telemetry';
import { WebhookService } from '@/webhooks/webhook.service';
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
let workflowPublishedVersionRepository: WorkflowPublishedVersionRepository;
let workflowPublishHistoryRepository: WorkflowPublishHistoryRepository;
let outboxRepository: WorkflowPublicationOutboxRepository;
let workflowHistoryService: WorkflowHistoryService;
const loggerMock = mock<Logger>();
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
const workflowValidationService = mockInstance(WorkflowValidationService);
const nodeTypes = mockInstance(NodeTypes);
const webhookServiceMock = mockInstance(WebhookService);
mockInstance(MessageEventBus);
mockInstance(Telemetry);

beforeAll(async () => {
	await testDb.init();

	globalConfig = Container.get(GlobalConfig);
	workflowRepository = Container.get(WorkflowRepository);
	workflowPublishedVersionRepository = Container.get(WorkflowPublishedVersionRepository);
	workflowPublishHistoryRepository = Container.get(WorkflowPublishHistoryRepository);
	outboxRepository = Container.get(WorkflowPublicationOutboxRepository);
	workflowHistoryService = Container.get(WorkflowHistoryService);
	workflowService = new WorkflowService(
		loggerMock,
		Container.get(SharedWorkflowRepository),
		workflowRepository,
		mock(),
		mock(),
		Container.get(OwnershipService), // ownershipService
		mock(),
		workflowHistoryService,
		mock(),
		activeWorkflowManager,
		Container.get(RoleService), // roleService
		Container.get(ProjectService), // projectService
		mock(), // executionRepository
		mock(), // eventService
		globalConfig,
		mock(),
		Container.get(WorkflowFinderService),
		workflowPublishHistoryRepository,
		outboxRepository,
		workflowValidationService,
		nodeTypes,
		webhookServiceMock,
		mock(), // licenseState
		Container.get(ProjectRepository), // projectRepository
		mock(), // redactionEnforcementService
		mock(), // workflowPublicationNotifier
		mock(), // scheduleTriggerJobRegistrar
	);
});

beforeEach(() => {
	workflowValidationService.validateForActivation.mockReturnValue({ isValid: true });
	workflowValidationService.validateDynamicCredentials.mockResolvedValue({ isValid: true });
	workflowValidationService.validateSubWorkflowReferences.mockResolvedValue({ isValid: true });
	workflowValidationService.validateCredentialNodeRestrictions.mockReturnValue({ isValid: true });
	webhookServiceMock.findWebhookConflicts.mockReset();
	webhookServiceMock.findWebhookConflicts.mockResolvedValue([]);
});

afterEach(async () => {
	await testDb.truncate([
		'SharedWorkflow',
		'ProjectRelation',
		'WorkflowPublishedVersion',
		'WorkflowPublicationOutbox',
		'WorkflowEntity',
		'WorkflowHistory',
		'WorkflowPublishHistory',
		'Project',
		'User',
	]);
	await cleanupRolesAndScopes();
	vi.restoreAllMocks();
});

describe('update()', () => {
	test('should save workflow history version with backfilled data when nodes change', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const addRecordSpy = vi.spyOn(workflowPublishHistoryRepository, 'addRecord');
		const saveVersionSpy = vi.spyOn(workflowHistoryService, 'saveVersion');

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
		const workflow = await createWorkflowWithHistory(
			{
				nodes: [
					{
						id: 'uuid-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [240, 300],
						parameters: {},
					},
					{
						id: 'uuid-2',
						name: 'Code Node',
						type: 'n8n-nodes-base.code',
						typeVersion: 1,
						position: [500, 300],
						parameters: {},
					},
				],
			},
			owner,
		);

		const addRecordSpy = vi.spyOn(workflowPublishHistoryRepository, 'addRecord');
		const saveVersionSpy = vi.spyOn(workflowHistoryService, 'saveVersion');

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

		const addRecordSpy = vi.spyOn(workflowPublishHistoryRepository, 'addRecord');

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

		const addRecordSpy = vi.spyOn(workflowPublishHistoryRepository, 'addRecord');

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

	test('should throw an error when webhook conflicts were found', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);
		const newVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

		webhookServiceMock.findWebhookConflicts.mockResolvedValue([
			{
				trigger: {
					id: '',
					name: '',
					typeVersion: 0,
					type: '',
					position: [1, 2],
					parameters: {},
				},
				conflict: {
					webhookId: 'some-id',
					webhookPath: 'some-path',
					workflowId: 'workflow-123',
					method: 'GET',
				},
			},
		]);

		await expect(
			workflowService.activateWorkflow(owner, workflow.id, {
				versionId: newVersionId,
			}),
		).rejects.toThrow('There is a conflict with one of the webhooks.');
	});

	test('should use nodes from correct workflow version when checking conflicts and versionId is passed', async () => {
		const owner = await createOwner();
		const oldVersionId = uuid();
		const oldNodes: INode[] = [
			{
				id: '123',
				webhookId: 'version1',
				name: 'test',
				typeVersion: 0,
				type: 'n8n-nodes-base.webhook',
				position: [1, 2],
				parameters: {},
			},
			{
				id: '345',
				webhookId: 'version1-2',
				name: 'test2',
				typeVersion: 0,
				type: 'n8n-nodes-base.webhook',
				position: [1, 2],
				parameters: {},
			},
		];
		const workflow = await createWorkflowWithHistory(
			{
				nodes: oldNodes,
				versionId: oldVersionId,
			},
			owner,
		);

		const newVersionId = uuid();
		const newNodes: INode[] = [
			{
				id: '123',
				webhookId: 'version2',
				name: 'updatedNode',
				typeVersion: 0,
				type: 'n8n-nodes-base.webhook',
				position: [1, 2],
				parameters: {},
			},
		];
		await workflowService.update(
			owner,
			{
				nodes: newNodes,
			} as WorkflowEntity,
			workflow.id,
		);
		await createWorkflowHistoryItem(workflow.id, {
			versionId: newVersionId,
			nodes: [
				{
					id: '123',
					webhookId: 'version2',
					name: 'newNode',
					typeVersion: 0,
					type: 'n8n-nodes-base.webhook',
					position: [1, 2],
					parameters: {},
				},
			],
		});

		await workflowService.activateWorkflow(owner, workflow.id, {
			versionId: oldVersionId,
		});

		expect(webhookServiceMock.findWebhookConflicts.mock.calls[0][0].nodes).toEqual(
			oldNodes.reduce((res, node) => ({ ...res, [node.name]: node }), {}),
		);
	});

	test('should use nodes from latest workflow version when checking conflicts and no versionId is passed', async () => {
		const owner = await createOwner();
		const oldNodes: INode[] = [
			{
				id: '123',
				webhookId: 'version1',
				name: 'test',
				typeVersion: 0,
				type: 'n8n-nodes-base.webhook',
				position: [1, 2],
				parameters: {},
			},
			{
				id: '345',
				webhookId: 'version1-2',
				name: 'test2',
				typeVersion: 0,
				type: 'n8n-nodes-base.webhook',
				position: [1, 2],
				parameters: {},
			},
		];
		const workflow = await createWorkflowWithHistory(
			{
				nodes: oldNodes,
				versionId: uuid(),
			},
			owner,
		);

		const newNodes: INode[] = [
			{
				id: '123',
				webhookId: 'version2',
				name: 'newNode',
				typeVersion: 0,
				type: 'n8n-nodes-base.webhook',
				position: [1, 2],
				parameters: {},
			},
		];
		await workflowService.update(
			owner,
			{
				nodes: newNodes,
			} as WorkflowEntity,
			workflow.id,
		);

		await workflowService.activateWorkflow(owner, workflow.id, {});

		expect(webhookServiceMock.findWebhookConflicts.mock.calls[0][0].nodes).toEqual(
			newNodes.reduce((res, node) => ({ ...res, [node.name]: node }), {}),
		);
	});

	test('should not activate workflow if validation fails and keep old active version', async () => {
		const owner = await createOwner();
		const workflow = await createActiveWorkflow({}, owner);

		const oldActiveVersionId = workflow.activeVersionId;

		const addRecordSpy = vi.spyOn(workflowPublishHistoryRepository, 'addRecord');

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
	test('should not deactivate workflow without workflow:unpublish permission', async () => {
		const owner = await createOwner();
		const member = await createMember();

		// custom role with workflow:update but not workflow:unpublish
		const customRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update'], {
			roleType: 'project',
			displayName: 'Custom Workflow Updater',
			description: 'Can update workflows but not unpublish them',
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

describe('workflow publication outbox', () => {
	describe('when feature flag is enabled', () => {
		beforeEach(() => {
			globalConfig.workflows.useWorkflowPublicationService = true;
		});

		afterEach(() => {
			globalConfig.workflows.useWorkflowPublicationService = false;
		});

		test('should set the active version and enqueue a pending outbox record on activation', async () => {
			const owner = await createOwner();
			const workflow = await createWorkflowWithHistory({}, owner);

			await workflowService.activateWorkflow(owner, workflow.id);

			const updated = await workflowRepository.findOne({ where: { id: workflow.id } });
			expect(updated?.active).toBe(true);
			expect(updated?.activeVersionId).toBe(workflow.versionId);

			const outboxRecord = await outboxRepository.findOne({
				where: { workflowId: workflow.id },
			});
			expect(outboxRecord?.publishedVersionId).toBe(workflow.versionId);
			expect(outboxRecord?.status).toBe('pending');

			// Publication is async: the published version is advanced by the
			// outbox consumer, not synchronously by the service.
			const publishedVersion = await workflowPublishedVersionRepository.findOne({
				where: { workflowId: workflow.id },
			});
			expect(publishedVersion).toBeNull();
		});

		test('should supersede the pending outbox record when activating a new version', async () => {
			const owner = await createOwner();
			const workflow = await createWorkflowWithHistory({}, owner);

			await workflowService.activateWorkflow(owner, workflow.id);

			const newVersionId = uuid();
			await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

			await workflowService.activateWorkflow(owner, workflow.id, {
				versionId: newVersionId,
			});

			const outboxRecords = await outboxRepository.find({ where: { workflowId: workflow.id } });
			expect(outboxRecords).toHaveLength(1);
			expect(outboxRecords[0].publishedVersionId).toBe(newVersionId);
			expect(outboxRecords[0].status).toBe('pending');

			const updated = await workflowRepository.findOne({ where: { id: workflow.id } });
			expect(updated?.activeVersionId).toBe(newVersionId);
		});

		test('should enqueue an unpublish record and defer mapping removal on deactivation', async () => {
			const owner = await createOwner();
			const workflow = await createWorkflowWithHistory({}, owner);

			await workflowService.activateWorkflow(owner, workflow.id);
			// Simulate the outbox consumer having advanced the published version.
			await workflowPublishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);

			await workflowService.deactivateWorkflow(owner, workflow.id);

			// The active version is cleared so the consumer treats the record as an unpublish.
			const updated = await workflowRepository.findOne({ where: { id: workflow.id } });
			expect(updated?.active).toBe(false);
			expect(updated?.activeVersionId).toBeNull();

			// A single pending outbox record is enqueued at the deactivated version.
			const outboxRecord = await outboxRepository.findOne({
				where: { workflowId: workflow.id },
			});
			expect(outboxRecord?.publishedVersionId).toBe(workflow.versionId);
			expect(outboxRecord?.status).toBe('pending');

			// Mapping removal and trigger teardown are deferred to the consumer, so the
			// mapping is still present synchronously after the service call.
			const publishedVersion = await workflowPublishedVersionRepository.findOne({
				where: { workflowId: workflow.id },
			});
			expect(publishedVersion).not.toBeNull();
		});

		test('should enqueue an unpublish record and defer mapping removal on archive', async () => {
			const owner = await createOwner();
			const workflow = await createWorkflowWithHistory({}, owner);

			await workflowService.activateWorkflow(owner, workflow.id);
			// Simulate the outbox consumer having advanced the published version.
			await workflowPublishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);

			await workflowService.archive(owner, workflow.id);

			const updated = await workflowRepository.findOne({ where: { id: workflow.id } });
			expect(updated?.isArchived).toBe(true);
			expect(updated?.activeVersionId).toBeNull();

			const outboxRecord = await outboxRepository.findOne({
				where: { workflowId: workflow.id },
			});
			expect(outboxRecord?.publishedVersionId).toBe(workflow.versionId);
			expect(outboxRecord?.status).toBe('pending');

			// Mapping removal is deferred to the consumer.
			const publishedVersionAfter = await workflowPublishedVersionRepository.findOne({
				where: { workflowId: workflow.id },
			});
			expect(publishedVersionAfter).not.toBeNull();
		});
	});

	describe('when feature flag is disabled', () => {
		test('should not enqueue an outbox record on activation', async () => {
			const owner = await createOwner();
			const workflow = await createWorkflowWithHistory({}, owner);

			await workflowService.activateWorkflow(owner, workflow.id);

			const outboxCount = await outboxRepository.count();
			expect(outboxCount).toBe(0);

			const publishedVersion = await workflowPublishedVersionRepository.findOne({
				where: { workflowId: workflow.id },
			});
			expect(publishedVersion).toBeNull();
		});

		test('should not write to workflow_published_version on deactivation', async () => {
			const owner = await createOwner();
			const workflow = await createWorkflowWithHistory({}, owner);

			await workflowService.activateWorkflow(owner, workflow.id);
			await workflowService.deactivateWorkflow(owner, workflow.id);

			const count = await workflowPublishedVersionRepository.count();
			expect(count).toBe(0);
		});
	});
});

describe('activateWorkflow trigger cleanup', () => {
	test('should tear down triggers before the rollback and surface the original activation error', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		// Capture state at the moment cleanup runs. The rollback must happen
		// after remove(), so the workflow is still active here; that ordering is what
		// lets clearWebhooks resolve the active version before it becomes null
		let activeWhenRemoved: boolean | undefined;
		activeWorkflowManager.remove.mockImplementationOnce(async () => {
			activeWhenRemoved = (await workflowRepository.findById(workflow.id))?.active;
		});
		activeWorkflowManager.add.mockRejectedValueOnce(
			new Error('activation failed mid registration'),
		);

		await expect(workflowService.activateWorkflow(owner, workflow.id)).rejects.toThrow(
			'activation failed mid registration',
		);

		expect(activeWorkflowManager.remove).toHaveBeenCalledWith(workflow.id);
		expect(activeWhenRemoved).toBe(true);
		expect(loggerMock.warn).toHaveBeenCalledWith(
			expect.stringContaining('Rolled back partial activation'),
			{ workflowId: workflow.id },
		);

		const reloaded = await workflowRepository.findById(workflow.id);
		expect(reloaded?.active).toBe(false);
		expect(reloaded?.activeVersionId).toBeNull();
	});

	test('should rollback and surface the original error when cleanup itself fails', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		activeWorkflowManager.add.mockRejectedValueOnce(
			new Error('activation failed mid registration'),
		);
		activeWorkflowManager.remove.mockRejectedValueOnce(new Error('cleanup blew up'));

		// A failing cleanup is logged but must not hide the original error
		// nor block the rollback
		await expect(workflowService.activateWorkflow(owner, workflow.id)).rejects.toThrow(
			'activation failed mid registration',
		);

		expect(loggerMock.error).toHaveBeenCalledWith(
			expect.stringContaining('Failed to roll back partial activation'),
			expect.objectContaining({ workflowId: workflow.id }),
		);

		const reloaded = await workflowRepository.findById(workflow.id);
		expect(reloaded?.active).toBe(false);
		expect(reloaded?.activeVersionId).toBeNull();
	});
});

describe('getMany()', () => {
	describe('filtering by personal project', () => {
		test('should return empty when regular user queries another users personal project', async () => {
			const member1 = await createMember();
			const member2 = await createMember();

			const projectRepository = Container.get(ProjectRepository);
			const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
				member2.id,
			);

			// member2 owns some workflows in their personal project
			await createWorkflow({ name: 'Member2 Private Workflow 1' }, member2);
			await createWorkflow({ name: 'Member2 Private Workflow 2' }, member2);

			// member1 (who has NO relation to member2's personal project) tries to query member2's personal project
			const result = await workflowService.getMany(
				member1,
				{ filter: { projectId: member2PersonalProject.id } },
				false,
				false,
				false,
			);

			// SECURITY: member1 should NOT see any of member2's workflows
			expect(result.workflows).toHaveLength(0);
			expect(result.count).toBe(0);
		});

		test('should allow admin with global workflow:read to query another users personal project', async () => {
			const owner = await createOwner(); // Owner has global workflow:read scope
			const member = await createMember();

			const projectRepository = Container.get(ProjectRepository);
			const memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
				member.id,
			);

			// member owns some workflows in their personal project
			const workflow1 = await createWorkflow({ name: 'Member Private Workflow 1' }, member);
			const workflow2 = await createWorkflow({ name: 'Member Private Workflow 2' }, member);

			// owner (with global workflow:read) can query member's personal project
			const result = await workflowService.getMany(
				owner,
				{ filter: { projectId: memberPersonalProject.id } },
				false,
				false,
				false,
			);

			// Admin with global scope CAN see the workflows
			expect(result.workflows).toHaveLength(2);
			expect(result.count).toBe(2);
			const workflowIds = result.workflows.map((w) => w.id).sort();
			expect(workflowIds).toEqual([workflow1.id, workflow2.id].sort());
		});

		test('should return only workflows owned by user in their personal project', async () => {
			const owner = await createOwner();
			const member = await createMember();

			const projectRepository = Container.get(ProjectRepository);
			const memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
				member.id,
			);

			const memberOwnedWorkflow = await createWorkflow({ name: 'Member Owned Workflow' }, member);
			const sharedWorkflow = await createWorkflow({ name: 'Shared Workflow' }, owner);
			await Container.get(SharedWorkflowRepository).save(
				Container.get(SharedWorkflowRepository).create({
					projectId: memberPersonalProject.id,
					workflowId: sharedWorkflow.id,
					role: 'workflow:editor',
				}),
			);

			const result = await workflowService.getMany(
				owner,
				{ filter: { projectId: memberPersonalProject.id } },
				false,
				false,
				false,
			);

			expect(result.workflows).toHaveLength(1);
			expect(result.workflows[0].id).toBe(memberOwnedWorkflow.id);
			expect(result.workflows[0].name).toBe('Member Owned Workflow');
			expect(result.count).toBe(1);
		});

		test('should return empty when filtering by personal project of user with no owned workflows', async () => {
			const owner = await createOwner();
			const member = await createMember();

			const projectRepository = Container.get(ProjectRepository);
			const memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
				member.id,
			);

			const sharedWorkflow = await createWorkflow({ name: 'Shared Workflow' }, owner);
			await Container.get(SharedWorkflowRepository).save(
				Container.get(SharedWorkflowRepository).create({
					projectId: memberPersonalProject.id,
					workflowId: sharedWorkflow.id,
					role: 'workflow:editor',
				}),
			);

			const result = await workflowService.getMany(
				owner,
				{ filter: { projectId: memberPersonalProject.id } },
				false,
				false,
				false,
			);

			expect(result.workflows).toHaveLength(0);
			expect(result.count).toBe(0);
		});

		test('should return empty when filtering by non-existent project', async () => {
			const owner = await createOwner();

			const result = await workflowService.getMany(
				owner,
				{ filter: { projectId: 'non-existent-project-id' } },
				false,
				false,
				false,
			);

			expect(result.workflows).toHaveLength(0);
			expect(result.count).toBe(0);
		});

		test('should return user owned workflows when user queries their own personal project', async () => {
			const member = await createMember();

			const projectRepository = Container.get(ProjectRepository);
			const memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
				member.id,
			);

			const workflow1 = await createWorkflow({ name: 'Workflow 1' }, member);
			const workflow2 = await createWorkflow({ name: 'Workflow 2' }, member);

			const result = await workflowService.getMany(
				member,
				{ filter: { projectId: memberPersonalProject.id } },
				false,
				false,
				false,
			);

			expect(result.workflows).toHaveLength(2);
			expect(result.count).toBe(2);
			const workflowIds = result.workflows.map((w) => w.id).sort();
			expect(workflowIds).toEqual([workflow1.id, workflow2.id].sort());
		});

		test('should handle team project filtering correctly', async () => {
			const owner = await createOwner();
			const member = await createMember();

			const teamProject = await createTeamProject('Team Project', owner);
			await linkUserToProject(member, teamProject, 'project:editor');

			const teamWorkflow1 = await createWorkflow({ name: 'Team Workflow 1' }, teamProject);
			const teamWorkflow2 = await createWorkflow({ name: 'Team Workflow 2' }, teamProject);

			const result = await workflowService.getMany(
				member,
				{ filter: { projectId: teamProject.id } },
				false,
				false,
				false,
			);

			expect(result.workflows).toHaveLength(2);
			expect(result.count).toBe(2);
			const workflowIds = result.workflows.map((w) => w.id).sort();
			expect(workflowIds).toEqual([teamWorkflow1.id, teamWorkflow2.id].sort());
		});
	});
});
