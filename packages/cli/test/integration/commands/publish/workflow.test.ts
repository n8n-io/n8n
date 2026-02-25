import {
	mockInstance,
	testDb,
	createWorkflowWithTriggerAndHistory,
	getWorkflowById,
} from '@n8n/backend-test-utils';

import { PublishWorkflowCommand } from '@/commands/publish/workflow';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(PublishWorkflowCommand);

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowHistory']);
});

test('publish:workflow can publish a specific workflow version', async () => {
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

test('publish:workflow does not publish when --all flag is used', async () => {
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
	// Verify the workflow was not published (--all flag prevents publishing)
	const unchangedWorkflow = await getWorkflowById(workflow.id);
	expect(unchangedWorkflow).toMatchObject({
		activeVersionId: null,
		active: false,
	});
});

test('publish:workflow publishes current version when --versionId is missing', async () => {
	//
	// ARRANGE
	//
	const workflow = await createWorkflowWithTriggerAndHistory();

	//
	// ACT
	//
	await command.run([`--id=${workflow.id}`]);

	//
	// ASSERT
	//
	const updatedWorkflow = await getWorkflowById(workflow.id);
	expect(updatedWorkflow).toMatchObject({
		activeVersionId: workflow.versionId,
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

test('publish:workflow throws error when version does not exist', async () => {
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
	).rejects.toThrow(`Version "${nonExistentVersionId}" not found for workflow "${workflow.id}".`);
});
