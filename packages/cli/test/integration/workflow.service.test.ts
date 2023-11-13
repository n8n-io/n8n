import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import * as testDb from './shared/testDb';
import { WorkflowsService } from '@/workflows/workflows.services';
import { mockInstance } from '../shared/mocking';
import { Telemetry } from '@/telemetry';
import { createOwner } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';

mockInstance(Telemetry);

const activeWorkflowRunner = mockInstance(ActiveWorkflowRunner);

beforeAll(async () => {
	await testDb.init();
});

afterEach(async () => {
	await testDb.truncate(['Workflow']);
	jest.restoreAllMocks();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('update()', () => {
	test('should remove and re-add to active workflows on `active: true` payload', async () => {
		const owner = await createOwner();
		const workflow = await createWorkflow({ active: true }, owner);

		const removeSpy = jest.spyOn(activeWorkflowRunner, 'remove');
		const addSpy = jest.spyOn(activeWorkflowRunner, 'add');

		await WorkflowsService.update(owner, workflow, workflow.id);

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

		const removeSpy = jest.spyOn(activeWorkflowRunner, 'remove');
		const addSpy = jest.spyOn(activeWorkflowRunner, 'add');

		workflow.active = false;
		await WorkflowsService.update(owner, workflow, workflow.id);

		expect(removeSpy).toHaveBeenCalledTimes(1);
		const [removedWorkflowId] = removeSpy.mock.calls[0];
		expect(removedWorkflowId).toBe(workflow.id);

		expect(addSpy).not.toHaveBeenCalled();
	});
});
