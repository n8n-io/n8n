import {
	mockInstance,
	testDb,
	createWorkflowWithTriggerAndHistory,
	getWorkflowById,
} from '@n8n/backend-test-utils';

import { ActivateWorkflowCommand } from '@/commands/activate/workflow';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(ActivateWorkflowCommand);

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowHistory']);
});

test('activate:workflow can activate a specific workflow version', async () => {
	//
	// ARRANGE
	//
	const workflow = await createWorkflowWithTriggerAndHistory();

	//
	// ACT
	//
	await command.run([`--id=${workflow.id}`, `--versionId=${workflow.versionId}`]);

	//
	// ASSERT
	//
	const updatedWorkflow = await getWorkflowById(workflow.id);

	expect(updatedWorkflow).toMatchObject({
		activeVersionId: workflow.versionId,
		active: true,
	});
});

test('activate:workflow does not activate when --all flag is used', async () => {
	//
	// ARRANGE
	//
	const workflow = await createWorkflowWithTriggerAndHistory();

	//
	// ACT
	//
	await command.run(['--all', `--id=${workflow.id}`, `--versionId=${workflow.versionId}`]);

	//
	// ASSERT
	//
	// Verify the workflow was not activated (--all flag prevents activation)
	const unchangedWorkflow = await getWorkflowById(workflow.id);
	expect(unchangedWorkflow).toMatchObject({
		activeVersionId: null,
		active: false,
	});
});

test('activate:workflow does not activate when --id is missing', async () => {
	//
	// ARRANGE
	//
	const workflow = await createWorkflowWithTriggerAndHistory();

	//
	// ACT
	//
	await command.run(['--versionId=abc']);

	//
	// ASSERT
	//
	// Verify the workflow was not activated
	const unchangedWorkflow = await getWorkflowById(workflow.id);
	expect(unchangedWorkflow).toMatchObject({
		activeVersionId: null,
		active: false,
	});
});

test('activate:workflow does not activate when --versionId is missing', async () => {
	//
	// ARRANGE
	//
	const workflow = await createWorkflowWithTriggerAndHistory();

	//
	// ACT
	//
	await command.run(['--id=123']);

	//
	// ASSERT
	//
	const unchangedWorkflow = await getWorkflowById(workflow.id);
	expect(unchangedWorkflow).toMatchObject({
		activeVersionId: null,
		active: false,
	});
});

test('activate:workflow throws error when version does not exist', async () => {
	//
	// ARRANGE
	//
	const workflow = await createWorkflowWithTriggerAndHistory();
	const nonExistentVersionId = 'non-existent-version';

	//
	// ACT & ASSERT
	//
	await expect(
		command.run([`--id=${workflow.id}`, `--versionId=${nonExistentVersionId}`]),
	).rejects.toThrow(
		`Version "${nonExistentVersionId}" not found for workflow "${workflow.id}". Please verify the version ID is correct.`,
	);
});
