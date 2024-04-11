import { Config } from '@oclif/core';

import { InternalHooks } from '@/InternalHooks';
import { ImportWorkflowsCommand } from '@/commands/import/workflow';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';

import { mockInstance } from '../../shared/mocking';
import * as testDb from '../shared/testDb';
import { getAllSharedWorkflows, getAllWorkflows } from '../shared/db/workflows';
import { createMember, createOwner } from '../shared/db/users';

const oclifConfig = new Config({ root: __dirname });

beforeAll(async () => {
	mockInstance(InternalHooks);
	mockInstance(LoadNodesAndCredentials);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['Workflow']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('import:workflow should import active workflow and deactivate it', async () => {
	const before = await getAllWorkflows();
	expect(before.length).toBe(0);
	const importer = new ImportWorkflowsCommand(
		['--separate', '--input=./test/integration/commands/importWorkflows/separate'],
		oclifConfig,
	);
	const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
		throw new Error('process.exit');
	});

	await importer.init();
	try {
		await importer.run();
	} catch (error) {
		expect(error.message).toBe('process.exit');
	}
	const after = await getAllWorkflows();
	expect(after.length).toBe(2);
	expect(after[0].name).toBe('active-workflow');
	expect(after[0].active).toBe(false);
	expect(after[1].name).toBe('inactive-workflow');
	expect(after[1].active).toBe(false);
	mockExit.mockRestore();
});

test('import:workflow should import active workflow from combined file and deactivate it', async () => {
	const before = await getAllWorkflows();
	expect(before.length).toBe(0);
	const importer = new ImportWorkflowsCommand(
		['--input=./test/integration/commands/importWorkflows/combined/combined.json'],
		oclifConfig,
	);
	const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
		throw new Error('process.exit');
	});

	await importer.init();
	try {
		await importer.run();
	} catch (error) {
		expect(error.message).toBe('process.exit');
	}
	const after = await getAllWorkflows();
	expect(after.length).toBe(2);
	expect(after[0].name).toBe('active-workflow');
	expect(after[0].active).toBe(false);
	expect(after[1].name).toBe('inactive-workflow');
	expect(after[1].active).toBe(false);
	mockExit.mockRestore();
});

async function importWorkflow(argv: string[]) {
	const importer = new ImportWorkflowsCommand(argv, oclifConfig);
	await importer.init();
	await importer.run();
}

test('`import:workflow --userId ...` should fail if the workflow exists already and is owned by somebody else', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const member = await createMember();

	// Import workflow the first time, assigning it to a member.
	await importWorkflow([
		'--input=./test/integration/commands/importWorkflows/combined-with-update/original.json',
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
				userId: owner.id,
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
		importWorkflow([
			'--input=./test/integration/commands/importWorkflows/combined-with-update/updated.json',
			`--userId=${member.id}`,
		]),
	).rejects.toThrowError(
		`The credential with id "998" is already owned by the user with the id "${owner.id}". It can't be re-owned by the user with the id "${member.id}"`,
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
				userId: owner.id,
				role: 'workflow:owner',
			}),
		],
	});
});

test("only update the workflow, don't create or update the owner if `--userId` is not passed", async () => {
	//
	// ARRANGE
	//
	const member = await createMember();

	// Import workflow the first time, assigning it to a member.
	await importWorkflow([
		'--input=./test/integration/commands/importWorkflows/combined-with-update/original.json',
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
				userId: member.id,
				role: 'workflow:owner',
			}),
		],
	});

	//
	// ACT
	//
	// Import the same workflow again, with another name but the same ID.
	await importWorkflow([
		'--input=./test/integration/commands/importWorkflows/combined-with-update/updated.json',
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
				userId: member.id,
				role: 'workflow:owner',
			}),
		],
	});
});
