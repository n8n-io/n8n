import * as testDb from '../shared/testDb';
import { mockInstance } from '../shared/utils';
import { InternalHooks } from '@/InternalHooks';
import { UpdateWorkflowCommand } from '@/commands/update/workflow';
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

test('update:workflow should deactivate active workflow', async () => {
	await testDb.createWorkflow({
		name: 'my-workflow',
		active: true,
	});

	const before = await testDb.getAllWorkflows();
	expect(before.length).toBe(1);
	expect(before[0].name).toBe('my-workflow');
	expect(before[0].active).toBe(true);
	
	const config: Config.IConfig = new Config.Config({ root: __dirname });
	const updater = new UpdateWorkflowCommand(
		['--all', '--active=false'],
		config,
	);
	const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
		throw new Error('process.exit');
	});

	await updater.init();
	try {
		await updater.run();
	} catch (error) {
		expect(error.message).toBe('process.exit');
	}

	const after = await testDb.getAllWorkflows();
	expect(after.length).toBe(1);
	expect(after[0].name).toBe('my-workflow');
	expect(after[0].active).toBe(false);

	mockExit.mockRestore();
});

test('update:workflow should activate inactive workflow', async () => {
	await testDb.createWorkflow({
		name: 'my-workflow',
		active: false,
	});

	const before = await testDb.getAllWorkflows();
	expect(before.length).toBe(1);
	expect(before[0].name).toBe('my-workflow');
	expect(before[0].active).toBe(false);
	
	const config: Config.IConfig = new Config.Config({ root: __dirname });
	const updater = new UpdateWorkflowCommand(
		['--all', '--active=true'],
		config,
	);
	const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
		throw new Error('process.exit');
	});

	await updater.init();
	try {
		await updater.run();
	} catch (error) {
		expect(error.message).toBe('process.exit');
	}

	const after = await testDb.getAllWorkflows();
	expect(after.length).toBe(1);
	expect(after[0].name).toBe('my-workflow');
	expect(after[0].active).toBe(true);

	mockExit.mockRestore();
});
