import {
	createWorkflow,
	createWorkflowWithHistory,
	createActiveWorkflow,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { LicenseState } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	ExecutionRepository,
	SharedWorkflowRepository,
	type WorkflowEntity,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Workflow } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { Telemetry } from '@/telemetry';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createMember, createOwner } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';

let globalConfig: GlobalConfig;
let workflowService: WorkflowService;
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
const workflowHistoryService = mockInstance(WorkflowHistoryService);
const workflowPublishHistoryRepository = mockInstance(WorkflowPublishHistoryRepository);
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
		Container.get(OwnershipService),
		mock(),
		workflowHistoryService,
		mock(),
		activeWorkflowManager,
		mock(),
		mock(),
		mock(),
		Container.get(ExecutionRepository),
		mock(),
		globalConfig,
		mock(),
		Container.get(WorkflowFinderService),
		workflowPublishHistoryRepository,
		mock<LicenseState>(),
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

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');
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

		expect(addRecordSpy).toBeCalledWith({
			event: 'activated',
			workflowId: workflow.id,
			versionId: workflow.versionId,
			userId: owner.id,
		});
	});

	test('should remove from active workflows on `active: false` payload', async () => {
		const owner = await createOwner();
		const workflow = await createActiveWorkflow({}, owner);

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');
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
		expect(addRecordSpy).toBeCalledWith({
			event: 'deactivated',
			workflowId: workflow.id,
			versionId: workflow.versionId,
			userId: owner.id,
		});
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

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');
		const saveVersionSpy = jest.spyOn(workflowHistoryService, 'saveVersion');

		const updateData = {
			active: true,
			versionId: workflow.versionId,
		};

		await workflowService.update(owner, updateData as WorkflowEntity, workflow.id);

		expect(saveVersionSpy).not.toHaveBeenCalled();
		expect(addRecordSpy).toBeCalledWith({
			event: 'activated',
			workflowId: workflow.id,
			versionId: workflow.versionId,
			userId: owner.id,
		});
	});

	test('should save workflow history version with backfilled data when versionId changes', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');
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
		expect(addRecordSpy).not.toBeCalled();
	});
});

describe('activateWorkflow()', () => {
	test('should activate current workflow version', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');

		const updatedWorkflow = await workflowService.activateWorkflow(owner, workflow.id);

		expect(updatedWorkflow.active).toBe(true);
		expect(updatedWorkflow.activeVersionId).toBe(workflow.versionId);
		expect(addRecordSpy).toBeCalledWith({
			event: 'activated',
			workflowId: workflow.id,
			versionId: workflow.versionId,
			userId: owner.id,
		});
	});

	test('should ignore provided workflow versionId', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflowWithHistory({}, owner);

		const addRecordSpy = jest.spyOn(workflowPublishHistoryRepository, 'addRecord');

		const newVersionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

		const updatedWorkflow = await workflowService.activateWorkflow(owner, workflow.id, {
			versionId: newVersionId,
		});

		expect(updatedWorkflow.active).toBe(true);
		expect(updatedWorkflow.activeVersionId).toBe(workflow.versionId);
		expect(updatedWorkflow.versionId).toBe(workflow.versionId);

		expect(addRecordSpy).toBeCalledWith({
			event: 'activated',
			workflowId: workflow.id,
			versionId: workflow.versionId,
			userId: owner.id,
		});
	});

	test('with draft/publish enabled: should activate the provided workflow version', async () => {
		globalConfig.workflows.draftPublishEnabled = true;

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

		expect(addRecordSpy).toBeCalledWith({
			event: 'activated',
			workflowId: workflow.id,
			versionId: newVersionId,
			userId: owner.id,
		});
	});
});

describe('delete() and the workflowsFromAList caller policy', () => {
	let workflowRepository: WorkflowRepository;

	beforeAll(() => {
		workflowRepository = Container.get(WorkflowRepository);
	});

	test('denies a caller whose allowlist entry no longer refers to a live workflow', async () => {
		const owner = await createOwner();
		const member = await createMember();

		const allowlistedCaller = await createWorkflow({}, owner);
		const subworkflow = await createWorkflow(
			{
				settings: { callerPolicy: 'workflowsFromAList', callerIds: allowlistedCaller.id },
			},
			owner,
		);

		await workflowService.archive(owner, allowlistedCaller.id);
		await workflowService.delete(owner, allowlistedCaller.id);

		const reusedIdWorkflow = await createWorkflow({ id: allowlistedCaller.id }, member);

		const storedSubworkflow = await workflowRepository.findOneByOrFail({ id: subworkflow.id });

		await expect(
			Container.get(SubworkflowPolicyChecker).check(
				mock<Workflow>({ id: storedSubworkflow.id, settings: storedSubworkflow.settings }),
				reusedIdWorkflow.id,
			),
		).rejects.toThrowError(SubworkflowPolicyDenialError);
	});

	test('keeps the allowlist entry while the caller is only archived', async () => {
		const owner = await createOwner();

		const allowlistedCaller = await createWorkflow({}, owner);
		const callerIds = `keepMe,\n${allowlistedCaller.id}`;
		const subworkflow = await createWorkflow(
			{ settings: { callerPolicy: 'workflowsFromAList', callerIds } },
			owner,
		);

		await workflowService.archive(owner, allowlistedCaller.id);

		const afterArchive = await workflowRepository.findOneByOrFail({ id: subworkflow.id });
		expect(afterArchive.settings).toEqual({ callerPolicy: 'workflowsFromAList', callerIds });

		await workflowService.delete(owner, allowlistedCaller.id);

		const afterDelete = await workflowRepository.findOneByOrFail({ id: subworkflow.id });
		expect(afterDelete.settings).toEqual({
			callerPolicy: 'workflowsFromAList',
			callerIds: 'keepMe',
		});
	});

	test('allows a live allowlisted caller owned by another project', async () => {
		const owner = await createOwner();
		const member = await createMember();

		const allowlistedCaller = await createWorkflow({}, member);
		const subworkflow = await createWorkflow(
			{
				settings: { callerPolicy: 'workflowsFromAList', callerIds: allowlistedCaller.id },
			},
			owner,
		);

		const storedSubworkflow = await workflowRepository.findOneByOrFail({ id: subworkflow.id });

		await expect(
			Container.get(SubworkflowPolicyChecker).check(
				mock<Workflow>({ id: storedSubworkflow.id, settings: storedSubworkflow.settings }),
				allowlistedCaller.id,
			),
		).resolves.toBeUndefined();
	});

	test('keeps the other settings of an allowlist it rewrites', async () => {
		const owner = await createOwner();

		const caller = await createWorkflow({}, owner);
		const subworkflow = await createWorkflow(
			{
				settings: {
					callerPolicy: 'workflowsFromAList',
					callerIds: `${caller.id},another-caller`,
					executionOrder: 'v1',
					timezone: 'Europe/Berlin',
				},
			},
			owner,
		);

		await workflowService.archive(owner, caller.id);
		await workflowService.delete(owner, caller.id);

		const after = await workflowRepository.findOneByOrFail({ id: subworkflow.id });
		expect(after.settings).toEqual({
			callerPolicy: 'workflowsFromAList',
			callerIds: 'another-caller',
			executionOrder: 'v1',
			timezone: 'Europe/Berlin',
		});
	});

	test('leaves an allowlist alone when the deleted id only appears inside another entry', async () => {
		const owner = await createOwner();

		const caller = await createWorkflow({}, owner);
		const subworkflow = await createWorkflow(
			{
				settings: {
					callerPolicy: 'workflowsFromAList',
					callerIds: `${caller.id}-suffix, ${caller.id}-other`,
				},
			},
			owner,
		);
		const before = await workflowRepository.findOneByOrFail({ id: subworkflow.id });

		await workflowService.archive(owner, caller.id);
		await workflowService.delete(owner, caller.id);

		const after = await workflowRepository.findOneByOrFail({ id: subworkflow.id });
		expect(after.settings).toEqual(before.settings);
		expect(after.updatedAt).toEqual(before.updatedAt);
	});

	test('takes several deleted ids out of one allowlist', async () => {
		const owner = await createOwner();

		const first = await createWorkflow({}, owner);
		const second = await createWorkflow({}, owner);
		const subworkflow = await createWorkflow(
			{
				settings: {
					callerPolicy: 'workflowsFromAList',
					callerIds: `${first.id},keepMe,${second.id}`,
				},
			},
			owner,
		);

		await workflowRepository.removeFromCallerAllowlists([first.id, second.id]);

		const after = await workflowRepository.findOneByOrFail({ id: subworkflow.id });
		expect(after.settings).toEqual({ callerPolicy: 'workflowsFromAList', callerIds: 'keepMe' });
	});

	test('leaves every allowlist untouched when the deleted workflow is on none of them', async () => {
		const owner = await createOwner();

		const allowlistedCaller = await createWorkflow({}, owner);
		const subworkflow = await createWorkflow(
			{
				settings: {
					callerPolicy: 'workflowsFromAList',
					callerIds: `${allowlistedCaller.id},another-caller`,
				},
			},
			owner,
		);
		const before = await workflowRepository.findOneByOrFail({ id: subworkflow.id });

		const unrelatedWorkflow = await createWorkflow({}, owner);
		await workflowService.archive(owner, unrelatedWorkflow.id);
		await workflowService.delete(owner, unrelatedWorkflow.id);

		const after = await workflowRepository.findOneByOrFail({ id: subworkflow.id });
		expect(after.settings).toEqual(before.settings);
		expect(after.updatedAt).toEqual(before.updatedAt);
	});

	// A character the `json` column keeps but the binary JSON form cannot hold.
	const NO_BINARY_JSON_FORM = String.fromCharCode(0);

	test('deletes a workflow while an allowlist elsewhere holds a value json alone can carry', async () => {
		const owner = await createOwner();

		const subworkflow = await createWorkflow(
			{
				settings: {
					callerPolicy: 'workflowsFromAList',
					callerIds: `another-caller${NO_BINARY_JSON_FORM}`,
				},
			},
			owner,
		);
		const before = await workflowRepository.findOneByOrFail({ id: subworkflow.id });

		const unrelatedWorkflow = await createWorkflow({}, owner);
		await workflowService.archive(owner, unrelatedWorkflow.id);
		await workflowService.delete(owner, unrelatedWorkflow.id);

		await expect(workflowRepository.findOneBy({ id: unrelatedWorkflow.id })).resolves.toBeNull();

		const after = await workflowRepository.findOneByOrFail({ id: subworkflow.id });
		expect(after.settings).toEqual(before.settings);
	});

	test('rewrites an allowlist that holds a value json alone can carry', async () => {
		const owner = await createOwner();

		const caller = await createWorkflow({}, owner);
		const subworkflow = await createWorkflow(
			{
				settings: {
					callerPolicy: 'workflowsFromAList',
					callerIds: `${caller.id},another-caller`,
					errorWorkflow: `error-workflow${NO_BINARY_JSON_FORM}`,
				},
			},
			owner,
		);

		await workflowService.archive(owner, caller.id);
		await workflowService.delete(owner, caller.id);

		const after = await workflowRepository.findOneByOrFail({ id: subworkflow.id });
		expect(after.settings).toEqual({
			callerPolicy: 'workflowsFromAList',
			callerIds: 'another-caller',
			errorWorkflow: `error-workflow${NO_BINARY_JSON_FORM}`,
		});
	});
});
