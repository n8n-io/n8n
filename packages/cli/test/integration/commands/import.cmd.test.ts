import * as testDb from '../shared/testDb';
import { mockInstance } from '../shared/utils';
import { InternalHooks } from '@/InternalHooks';
import { ImportWorkflowsCommand } from '../../../src/commands/import/workflow';
import * as Config from '@oclif/config';

beforeAll(async () => {
	mockInstance(InternalHooks);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['Workflow']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('import:workflow should import active workflow and deactivate it', async () => {
	const config: Config.IConfig = new Config.Config({ root: __dirname });
	const before = await testDb.getAllWorkflows();
	expect(before.length).toBe(0);
	const importer = new ImportWorkflowsCommand(
		['--separate', '--input=./test/integration/commands/importWorkflows'],
		config,
	);
	const mockExit = jest.spyOn(process, 'exit').mockImplementation((number) => {
		throw new Error('process.exit');
	});

	await importer.init();
	try {
		await importer.run();
	} catch (error) {
		expect(error.message).toBe('process.exit');
	}
	const after = await testDb.getAllWorkflows();
	expect(after.length).toBe(1);
	expect(after[0].name).toBe('active-workflow');
	expect(after[0].active).toBe(false);
	mockExit.mockRestore();
});
