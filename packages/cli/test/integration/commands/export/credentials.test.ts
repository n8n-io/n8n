import { CREDENTIAL_DESCRIPTIONS_FLAG } from '@n8n/api-types';
import { createTeamProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ExportCredentialsCommand } from '@/commands/export/credentials';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createCredentials, encryptCredentialData } from '../../shared/db/credentials';

mockInstance(LoadNodesAndCredentials);

const command = setupTestCommand(ExportCredentialsCommand);

let testOutputDir: string;

beforeEach(async () => {
	await testDb.truncate(['CredentialsEntity', 'SharedCredentials']);
	testOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-export-credentials-test-'));
});

afterEach(() => {
	delete Container.get(GlobalConfig).featureFlags.override[CREDENTIAL_DESCRIPTIONS_FLAG];
	if (fs.existsSync(testOutputDir)) {
		fs.rmSync(testOutputDir, { recursive: true, force: true });
	}
});

describe.each([true, false])('credential exports with decrypted=%s', (decrypted) => {
	test.each([true, false, undefined])('gates descriptions when the flag is %s', async (enabled) => {
		if (enabled !== undefined) {
			Container.get(GlobalConfig).featureFlags.override[CREDENTIAL_DESCRIPTIONS_FLAG] = enabled;
		}
		const credential = await createCredentials({
			...(await encryptCredentialData(
				Object.assign(new CredentialsEntity(), {
					name: 'Reporting account',
					type: 'test',
					data: { apiKey: 'test-key' },
				}),
			)),
			description: 'Read-only reporting account',
		});
		const outputFile = path.join(testOutputDir, 'output.json');

		await command.run(['--all', `--output=${outputFile}`, ...(decrypted ? ['--decrypted'] : [])]);

		const exported: Array<{ id: string; description?: string }> = JSON.parse(
			fs.readFileSync(outputFile, 'utf-8'),
		);
		expect(exported).toHaveLength(1);
		expect(exported[0].id).toBe(credential.id);
		if (enabled) {
			expect(exported[0].description).toBe('Read-only reporting account');
		} else {
			expect(exported[0]).not.toHaveProperty('description');
		}
		const stored = await Container.get(CredentialsRepository).findOneByOrFail({
			id: credential.id,
		});
		expect(stored.description).toBe('Read-only reporting account');
	});
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
