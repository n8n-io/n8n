import {
	mockInstance,
	testDb,
	createWorkflowWithTriggerAndHistory,
	createManyActiveWorkflows,
	getAllWorkflows,
} from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import { WorkflowPublishHistoryRepository, WorkflowRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { type INodeType, UserError } from 'n8n-workflow';

import { UpdateWorkflowCommand } from '@/commands/update/workflow';
import { ExternalHooks } from '@/external-hooks';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createOwner } from '../../shared/db/users';

mockInstance(LoadNodesAndCredentials);
mockInstance(ExternalHooks);
const nodeTypes = mockInstance(NodeTypes);
const command = setupTestCommand(UpdateWorkflowCommand);

const publishEvents = async (workflowId: string) =>
	(
		await Container.get(WorkflowPublishHistoryRepository).find({
			where: { workflowId },
			order: { id: 'ASC' },
		})
	).map(({ event, versionId, userId }) => ({ event, versionId, userId }));

let owner: User;

beforeEach(() => {
	nodeTypes.getByNameAndVersion.mockReturnValue({
		description: { properties: [] },
		trigger: async () => ({}),
	} as unknown as INodeType);
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'WorkflowPublishHistory',
		'WebhookEntity',
		'WorkflowPublicationOutbox',
		'SharedWorkflow',
		'User',
	]);
	owner = await createOwner();
});

test('update:workflow does not publish when trying to publish all workflows', async () => {
	//
	// ARRANGE
	//
	const workflows = await Promise.all([
		createWorkflowWithTriggerAndHistory({}, owner),
		createWorkflowWithTriggerAndHistory({}, owner),
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
	const workflows = await createManyActiveWorkflows(2, {}, owner);

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
	const workflow = await createWorkflowWithTriggerAndHistory({}, owner);

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
	const workflows = (await createManyActiveWorkflows(2, {}, owner)).sort((wf1, wf2) =>
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

test('update:workflow --id --active=false records deactivated by the owner', async () => {
	const [workflow] = await createManyActiveWorkflows(1, {}, owner);

	await command.run([`--id=${workflow.id}`, '--active=false']);

	expect(await publishEvents(workflow.id)).toEqual([
		{ event: 'activated', versionId: workflow.versionId, userId: owner.id },
		{ event: 'deactivated', versionId: workflow.versionId, userId: owner.id },
	]);
});

test('update:workflow --id --active=true records activated by the owner', async () => {
	const workflow = await createWorkflowWithTriggerAndHistory({}, owner);

	await command.run([`--id=${workflow.id}`, '--active=true']);

	expect(await publishEvents(workflow.id)).toEqual([
		{ event: 'activated', versionId: workflow.versionId, userId: owner.id },
	]);
});

test('update:workflow --all --active=false unpublishes through the service', async () => {
	const workflows = await createManyActiveWorkflows(2, {}, owner);

	await command.run(['--all', '--active=false']);

	for (const workflow of workflows) {
		expect(await publishEvents(workflow.id)).toEqual([
			{ event: 'activated', versionId: workflow.versionId, userId: owner.id },
			{ event: 'deactivated', versionId: workflow.versionId, userId: owner.id },
		]);
	}
});

test('update:workflow prints a refusal once without a stack trace', async () => {
	const logged = vi.spyOn(Container.get(Logger), 'error');
	const refusal = new UserError('Workflow "missing" not found.');
	const failedCommand = new UpdateWorkflowCommand();

	await failedCommand.catch(refusal);
	await failedCommand.finally(refusal);

	expect(logged.mock.calls).toEqual([[refusal.message]]);
});
