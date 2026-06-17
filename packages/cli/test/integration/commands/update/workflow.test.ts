import {
	mockInstance,
	testDb,
	createWorkflowWithTriggerAndHistory,
	createManyActiveWorkflows,
	getAllWorkflows,
} from '@n8n/backend-test-utils';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { UpdateWorkflowCommand } from '@/commands/update/workflow';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(UpdateWorkflowCommand);

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowHistory']);
});

test('update:workflow does not publish when trying to publish all workflows', async () => {
	//
	// ARRANGE
	//
	const workflows = await Promise.all([
		createWorkflowWithTriggerAndHistory({}),
		createWorkflowWithTriggerAndHistory({}),
	]);

	//
	// ACT
	//
	await command.run(['--all', '--active=true']);

	//
	// ASSERT
	//
	// Verify workflows were NOT published (publishing all is no longer supported)
	const workflowRepo = Container.get(WorkflowRepository);
	const workflow1 = await workflowRepo.findOneBy({ id: workflows[0].id });
	const workflow2 = await workflowRepo.findOneBy({ id: workflows[1].id });

	expect(workflow1?.activeVersionId).toBeNull();
	expect(workflow2?.activeVersionId).toBeNull();
});

test('update:workflow can unpublish all workflows', async () => {
	//
	// ARRANGE
	//
	const workflows = await createManyActiveWorkflows(2);

	// Verify activeVersionId is set
	const workflowRepo = Container.get(WorkflowRepository);
	let workflow1 = await workflowRepo.findOneBy({ id: workflows[0].id });
	let workflow2 = await workflowRepo.findOneBy({ id: workflows[1].id });
	expect(workflow1?.activeVersionId).toBe(workflows[0].versionId);
	expect(workflow2?.activeVersionId).toBe(workflows[1].versionId);

	//
	// ACT
	//
	await command.run(['--all', '--active=false']);

	//
	// ASSERT
	//
	// Verify activeVersionId is cleared
	workflow1 = await workflowRepo.findOne({
		where: { id: workflows[0].id },
		relations: ['activeVersion'],
	});
	workflow2 = await workflowRepo.findOne({
		where: { id: workflows[1].id },
		relations: ['activeVersion'],
	});

	expect(workflow1?.activeVersionId).toBeNull();
	expect(workflow1?.activeVersion).toBeNull();
	expect(workflow2?.activeVersionId).toBeNull();
	expect(workflow2?.activeVersion).toBeNull();
});

test('update:workflow publishes current version when --active=true (backwards compatibility)', async () => {
	//
	// ARRANGE
	//
	const workflow = await createWorkflowWithTriggerAndHistory();

	//
	// ACT
	//
	await command.run([`--id=${workflow.id}`, '--active=true']);

	//
	// ASSERT
	//
	// Verify workflow was published with current version
	const workflowRepo = Container.get(WorkflowRepository);
	const updatedWorkflow = await workflowRepo.findOneBy({ id: workflow.id });

	expect(updatedWorkflow?.activeVersionId).toBe(workflow.versionId);
	expect(updatedWorkflow?.active).toBe(true);
});

test('update:workflow can unpublish a specific workflow', async () => {
	//
	// ARRANGE
	//
	const workflows = (await createManyActiveWorkflows(2)).sort((wf1, wf2) =>
		wf1.id.localeCompare(wf2.id),
	);

	//
	// ACT
	//
	await command.run([`--id=${workflows[0].id}`, '--active=false']);

	//
	// ASSERT
	//
	const after = (await getAllWorkflows()).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(after).toMatchObject([
		{ activeVersionId: null },
		{ activeVersionId: workflows[1].versionId },
	]);
});
