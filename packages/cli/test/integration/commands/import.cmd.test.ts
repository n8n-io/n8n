import { Config } from '@oclif/core';

import { InternalHooks } from '@/InternalHooks';
import { ImportWorkflowsCommand } from '@/commands/import/workflow';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';

import { mockInstance } from '../../shared/mocking';
import * as testDb from '../shared/testDb';
import { getAllWorkflows } from '../shared/db/workflows';

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
