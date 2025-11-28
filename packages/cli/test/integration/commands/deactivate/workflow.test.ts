import {
	mockInstance,
	testDb,
	createManyActiveWorkflows,
	getWorkflowById,
} from '@n8n/backend-test-utils';

import { DeactivateWorkflowCommand } from '@/commands/deactivate/workflow';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(DeactivateWorkflowCommand);

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowHistory']);
});

test('deactivate:workflow can deactivate all workflows', async () => {
	//
	// ARRANGE
	//
	const workflows = await createManyActiveWorkflows(2);

	//
	// ACT
	//
	await command.run(['--all']);

	//
	// ASSERT
	//
	const workflow1 = await getWorkflowById(workflows[0].id);
	const workflow2 = await getWorkflowById(workflows[1].id);

	expect(workflow1).toMatchObject({
		activeVersionId: null,
		active: false,
	});

	expect(workflow2).toMatchObject({
		activeVersionId: null,
		active: false,
	});
});

test('deactivate:workflow can deactivate a specific workflow', async () => {
	//
	// ARRANGE
	//
	const workflows = await createManyActiveWorkflows(2);

	//
	// ACT
	//
	await command.run([`--id=${workflows[0].id}`]);

	//
	// ASSERT
	//
	const deactivatedWorkflow = await getWorkflowById(workflows[0].id);
	const activeWorkflow = await getWorkflowById(workflows[1].id);

	expect(deactivatedWorkflow).toMatchObject({
		activeVersionId: null,
		active: false,
	});
	expect(activeWorkflow).toMatchObject({
		activeVersionId: workflows[1].versionId,
		active: true,
	});
});

test('deactivate:workflow shows error when neither --all nor --id is provided', async () => {
	//
	// ARRANGE
	//
	const workflows = await createManyActiveWorkflows(2);

	//
	// ACT
	//
	await command.run([]);

	//
	// ASSERT
	//
	// Verify workflows are still active
	const workflow1 = await getWorkflowById(workflows[0].id);
	const workflow2 = await getWorkflowById(workflows[1].id);

	expect(workflow1).toMatchObject({
		activeVersionId: workflows[0].versionId,
		active: true,
	});

	expect(workflow2).toMatchObject({
		activeVersionId: workflows[1].versionId,
		active: true,
	});
});

test('deactivate:workflow shows error when both --all and --id are provided', async () => {
	//
	// ARRANGE
	//
	const workflows = await createManyActiveWorkflows(2);

	//
	// ACT
	//
	await command.run(['--all', '--id=123']);

	//
	// ASSERT
	//
	// Verify workflows are still active
	const workflow1 = await getWorkflowById(workflows[0].id);
	const workflow2 = await getWorkflowById(workflows[1].id);

	expect(workflow1).toMatchObject({
		activeVersionId: workflows[0].versionId,
		active: true,
	});

	expect(workflow2).toMatchObject({
		activeVersionId: workflows[1].versionId,
		active: true,
	});
});
