import { createTeamProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ExportCredentialsCommand } from '@/commands/export/credentials';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createCredentials } from '../../shared/db/credentials';

mockInstance(LoadNodesAndCredentials);

const command = setupTestCommand(ExportCredentialsCommand);

let testOutputDir: string;

beforeEach(async () => {
	await testDb.truncate(['CredentialsEntity', 'SharedCredentials']);
	testOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-export-credentials-test-'));
});

afterEach(() => {
	if (fs.existsSync(testOutputDir)) {
		fs.rmSync(testOutputDir, { recursive: true, force: true });
	}
});

test('should reject --all with --projectId', async () => {
	const project = await createTeamProject();
	const outputFile = path.join(testOutputDir, 'output.json');

	await command.run(['--all', `--projectId=${project.id}`, `--output=${outputFile}`]);

	expect(fs.existsSync(outputFile)).toBe(false);
});

test('should reject --id with --projectId', async () => {
	const project = await createTeamProject();
	const credential = await createCredentials({ name: 'My credential', type: 'test', data: '' });
	const outputFile = path.join(testOutputDir, 'output.json');

	await command.run([
		`--id=${credential.id}`,
		`--projectId=${project.id}`,
		`--output=${outputFile}`,
	]);

	expect(fs.existsSync(outputFile)).toBe(false);
});

test('should export credentials by project with --projectId', async () => {
	const projectA = await createTeamProject();
	const projectB = await createTeamProject();
	const credentialInProjectA = await createCredentials(
		{ name: 'Project A credential', type: 'test', data: '' },
		projectA,
	);
	await createCredentials({ name: 'Project B credential', type: 'test', data: '' }, projectB);

	const outputFile = path.join(testOutputDir, 'output.json');
	await command.run([`--projectId=${projectA.id}`, `--output=${outputFile}`]);

	const exportedData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

	expect(exportedData).toHaveLength(1);
	expect(exportedData[0].id).toBe(credentialInProjectA.id);
	expect(exportedData[0].name).toBe('Project A credential');
});
