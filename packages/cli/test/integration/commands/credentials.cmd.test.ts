import { Config } from '@oclif/core';

import { InternalHooks } from '@/InternalHooks';
import { ImportCredentialsCommand } from '@/commands/import/credentials';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';

import { mockInstance } from '../../shared/mocking';
import * as testDb from '../shared/testDb';
import { getAllCredentials } from '../shared/db/credentials';

const oclifConfig = new Config({ root: __dirname });

beforeAll(async () => {
	mockInstance(InternalHooks);
	mockInstance(LoadNodesAndCredentials);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['Credentials']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('import:credentials should import a credential', async () => {
	const before = await getAllCredentials();
	expect(before.length).toBe(0);
	const importer = new ImportCredentialsCommand(
		['--input=./test/integration/commands/importCredentials/credentials.json'],
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
	const after = await getAllCredentials();
	expect(after.length).toBe(1);
	expect(after[0].name).toBe('cred-aws-test');
	expect(after[0].id).toBe('123');
	expect(after[0].nodesAccess).toStrictEqual([]);
	mockExit.mockRestore();
});
