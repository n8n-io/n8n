import {
	mockInstance,
	testDb,
	createManyActiveWorkflows,
	getWorkflowById,
} from '@n8n/backend-test-utils';

import { UnpublishWorkflowCommand } from '@/commands/unpublish/workflow';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(UnpublishWorkflowCommand);

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowHistory']);
});

test('unpublish:workflow can unpublish all workflows', async () => {
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

test('unpublish:workflow can unpublish a specific workflow', async () => {
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
	const unpublishedWorkflow = await getWorkflowById(workflows[0].id);
	const activeWorkflow = await getWorkflowById(workflows[1].id);

	expect(unpublishedWorkflow).toMatchObject({
		activeVersionId: null,
		active: false,
	});
	expect(activeWorkflow).toMatchObject({
		activeVersionId: workflows[1].versionId,
		active: true,
	});
});

test('unpublish:workflow does nothing when neither --all nor --id is provided', async () => {
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

test('unpublish:workflow does nothing when both --all and --id are provided', async () => {
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

test('unpublish:workflow throws error when workflow does not exist', async () => {
	//
	// ARRANGE
	//
	const nonExistentWorkflowId = 'non-existent-workflow-id';

	//
	// ACT & ASSERT
	//
	await expect(command.run([`--id=${nonExistentWorkflowId}`])).rejects.toThrow(
		`Workflow "${nonExistentWorkflowId}" not found.`,
	);
});
