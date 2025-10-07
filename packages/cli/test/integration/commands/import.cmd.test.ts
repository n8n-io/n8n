import {
	mockInstance,
	testDb,
	getPersonalProject,
	getAllSharedWorkflows,
	getAllWorkflows,
} from '@n8n/backend-test-utils';
import { nanoid } from 'nanoid';

import '@/zod-alias-support';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ImportWorkflowsCommand } from '@/commands/import/workflow';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createMember, createOwner } from '../shared/db/users';

mockInstance(LoadNodesAndCredentials);
mockInstance(ActiveWorkflowManager);

const command = setupTestCommand(ImportWorkflowsCommand);

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'User']);
});

test('import:workflow should import active workflow and deactivate it', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run([
		'--separate',
		'--input=./test/integration/commands/import-workflows/separate',
	]);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	expect(after).toMatchObject({
		workflows: [
			expect.objectContaining({ name: 'active-workflow', active: false }),
			expect.objectContaining({ name: 'inactive-workflow', active: false }),
		],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
			expect.objectContaining({
				workflowId: '999',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});

test('import:workflow should import active workflow from combined file and deactivate it', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined/combined.json',
	]);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	expect(after).toMatchObject({
		workflows: [
			expect.objectContaining({ name: 'active-workflow', active: false }),
			expect.objectContaining({ name: 'inactive-workflow', active: false }),
		],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
			expect.objectContaining({
				workflowId: '999',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});

test('import:workflow can import a single workflow object', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run(['--input=./test/integration/commands/import-workflows/combined/single.json']);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	expect(after).toMatchObject({
		workflows: [expect.objectContaining({ name: 'active-workflow', active: false })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});

test('`import:workflow --userId ...` should fail if the workflow exists already and is owned by somebody else', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const member = await createMember();

	// Import workflow the first time, assigning it to a member.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${owner.id}`,
	]);

	const before = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure the workflow and sharing have been created.
	expect(before).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});

	//
	// ACT
	//
	// Import the same workflow again, with another name but the same ID, and try
	// to assign it to the member.
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--userId=${member.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "998" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the user with the ID "${member.id}"`,
	);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure there is no new sharing and that the name DID NOT change.
	expect(after).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});

test("only update the workflow, don't create or update the owner if `--userId` is not passed", async () => {
	//
	// ARRANGE
	//
	await createOwner();
	const member = await createMember();
	const memberProject = await getPersonalProject(member);

	// Import workflow the first time, assigning it to a member.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${member.id}`,
	]);

	const before = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure the workflow and sharing have been created.
	expect(before).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: memberProject.id,
				role: 'workflow:owner',
			}),
		],
	});

	//
	// ACT
	//
	// Import the same workflow again, with another name but the same ID.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
	]);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure there is no new sharing and that the name changed.
	expect(after).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow updated' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: memberProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});

test('`import:workflow --projectId ...` should fail if the credential already exists and is owned by another project', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const member = await createMember();
	const memberProject = await getPersonalProject(member);

	// Import workflow the first time, assigning it to a member.
	await command.run([
		'--input=./test/integration/commands/import-workflows/combined-with-update/original.json',
		`--userId=${owner.id}`,
	]);

	const before = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure the workflow and sharing have been created.
	expect(before).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});

	//
	// ACT
	//
	// Import the same workflow again, with another name but the same ID, and try
	// to assign it to the member.
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--projectId=${memberProject.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "998" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the project with the ID "${memberProject.id}"`,
	);

	//
	// ASSERT
	//
	const after = {
		workflows: await getAllWorkflows(),
		sharings: await getAllSharedWorkflows(),
	};
	// Make sure there is no new sharing and that the name DID NOT change.
	expect(after).toMatchObject({
		workflows: [expect.objectContaining({ id: '998', name: 'active-workflow' })],
		sharings: [
			expect.objectContaining({
				workflowId: '998',
				projectId: ownerProject.id,
				role: 'workflow:owner',
			}),
		],
	});
});

test('`import:workflow --projectId ... --userId ...` fails explaining that only one of the options can be used at a time', async () => {
	await expect(
		command.run([
			'--input=./test/integration/commands/import-workflows/combined-with-update/updated.json',
			`--userId=${nanoid()}`,
			`--projectId=${nanoid()}`,
		]),
	).rejects.toThrowError(
		'You cannot use `--userId` and `--projectId` together. Use one or the other.',
	);
});
