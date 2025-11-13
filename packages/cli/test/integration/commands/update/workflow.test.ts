import {
	mockInstance,
	testDb,
	createWorkflowWithTrigger,
	createWorkflowWithTriggerAndHistory,
	createActiveWorkflow,
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

test('update:workflow can activate all workflows', async () => {
	//
	// ARRANGE
	//
	const workflows = await Promise.all([
		createWorkflowWithTriggerAndHistory({}),
		createWorkflowWithTriggerAndHistory({}),
	]);
	expect(workflows).toMatchObject([{ active: false }, { active: false }]);
	expect(workflows[0].activeVersionId).toBeNull();
	expect(workflows[1].activeVersionId).toBeNull();

	//
	// ACT
	//
	await command.run(['--all', '--active=true']);

	//
	// ASSERT
	//
	const after = await getAllWorkflows();
	expect(after).toMatchObject([{ active: true }, { active: true }]);

	// Verify activeVersionId is now set to the current versionId
	const workflowRepo = Container.get(WorkflowRepository);
	const workflow1 = await workflowRepo.findOne({
		where: { id: workflows[0].id },
		relations: ['activeVersion'],
	});
	const workflow2 = await workflowRepo.findOne({
		where: { id: workflows[1].id },
		relations: ['activeVersion'],
	});

	expect(workflow1?.activeVersionId).toBe(workflows[0].versionId);
	expect(workflow1?.activeVersion?.versionId).toBe(workflows[0].versionId);
	expect(workflow2?.activeVersionId).toBe(workflows[1].versionId);
	expect(workflow2?.activeVersion?.versionId).toBe(workflows[1].versionId);
});

test('update:workflow can deactivate all workflows', async () => {
	//
	// ARRANGE
	//
	const workflows = await Promise.all([createActiveWorkflow({}), createActiveWorkflow({})]);
	expect(workflows).toMatchObject([{ active: true }, { active: true }]);

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
	const after = await getAllWorkflows();
	expect(after).toMatchObject([{ active: false }, { active: false }]);

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

test('update:workflow can activate a specific workflow', async () => {
	//
	// ARRANGE
	//
	const workflows = (
		await Promise.all([
			createWorkflowWithTrigger({ active: false }),
			createWorkflowWithTrigger({ active: false }),
		])
	).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(workflows).toMatchObject([{ active: false }, { active: false }]);

	//
	// ACT
	//
	await command.run([`--id=${workflows[0].id}`, '--active=true']);

	//
	// ASSERT
	//
	const after = (await getAllWorkflows()).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(after).toMatchObject([{ active: true }, { active: false }]);
});

test('update:workflow can deactivate a specific workflow', async () => {
	//
	// ARRANGE
	//
	const workflows = (
		await Promise.all([
			createWorkflowWithTrigger({ active: true }),
			createWorkflowWithTrigger({ active: true }),
		])
	).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(workflows).toMatchObject([{ active: true }, { active: true }]);

	//
	// ACT
	//
	await command.run([`--id=${workflows[0].id}`, '--active=false']);

	//
	// ASSERT
	//
	const after = (await getAllWorkflows()).sort((wf1, wf2) => wf1.id.localeCompare(wf2.id));
	expect(after).toMatchObject([{ active: false }, { active: true }]);
});
