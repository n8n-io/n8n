import { createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import {
	SharedWorkflowRepository,
	WorkflowRepository,
	FolderRepository,
	ProjectRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createOwner } from '../shared/db/users';
import { createFolder } from '../shared/db/folders';
import { ReadOnlyInstanceChecker } from '@/environments.ee/source-control/read-only-instance-checker.service';

let workflowService: WorkflowService;
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
const readOnlyInstanceChecker = mockInstance(ReadOnlyInstanceChecker);
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
		Container.get(FolderRepository),
		Container.get(WorkflowFinderService),
		readOnlyInstanceChecker,
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

	it('should throw a BadRequest error when changing the parent folder of a workflow in a protected instance', async () => {
		jest.spyOn(readOnlyInstanceChecker, 'isEnvironmentReadOnly').mockReturnValue(true);
		const owner = await createOwner();
		const workflow = await createWorkflow({}, owner);

		const newParentFolderId = 'different-folder-id';

		await expect(
			workflowService.update(owner, workflow, workflow.id, undefined, newParentFolderId),
		).rejects.toThrow(
			'Environments: Cannot move workflow to a different folder on protected instance.',
		);
	});

	it('updates workflow folder', async () => {
		jest.spyOn(readOnlyInstanceChecker, 'isEnvironmentReadOnly').mockReturnValue(false);
		const owner = await createOwner();
		const workflow = await createWorkflow({}, owner);
		const folder = await createFolder(
			await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id),
			{ name: 'Test Folder' },
		);

		const updatedWorkflow = await workflowService.update(
			owner,
			workflow,
			workflow.id,
			undefined,
			folder.id,
		);

		expect(updatedWorkflow.parentFolder?.id).toEqual(folder.id);
	});
});
