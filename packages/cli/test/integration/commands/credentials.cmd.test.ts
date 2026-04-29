import { getPersonalProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import * as fs from 'fs';
import { jsonParse } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import * as path from 'path';

import '@/zod-alias-support';
import { ImportCredentialsCommand } from '@/commands/import/credentials';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { getAllCredentials, getAllSharedCredentials } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';

type CredentialFixture = {
	createdAt: string;
	updatedAt: string;
};

const credentialsFixturePath = path.resolve(__dirname, 'import-credentials/credentials.json');
const [credentialsFixture] = jsonParse<CredentialFixture[]>(
	fs.readFileSync(credentialsFixturePath, { encoding: 'utf8' }),
);

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(ImportCredentialsCommand);

beforeEach(async () => {
	await testDb.truncate(['CredentialsEntity', 'SharedCredentials', 'User']);
});

test('import:credentials should import a credential', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	await command.run(['--input=./test/integration/commands/import-credentials/credentials.json']);

	//
	// ASSERT
	//
	const after = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};
	expect(after).toMatchObject({
		credentials: [expect.objectContaining({ id: '123', name: 'cred-aws-test' })],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: ownerProject.id,
				role: 'credential:owner',
			}),
		],
	});
});

test('import:credentials should import a credential from separated files', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	//
	// ACT
	//
	// import credential the first time, assigning it to the owner
	await command.run([
		'--separate',
		'--input=./test/integration/commands/import-credentials/separate',
	]);

	//
	// ASSERT
	//
	const after = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};

	expect(after).toMatchObject({
		credentials: [
			expect.objectContaining({
				id: '123',
				name: 'cred-aws-test',
			}),
		],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: ownerProject.id,
				role: 'credential:owner',
			}),
		],
	});
});

test('import:credentials should normalize Windows paths', async () => {
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const originalPlatform = process.platform;

	Object.defineProperty(process, 'platform', { value: 'win32' });

	try {
		await command.run([
			'--input=.\\test\\integration\\commands\\import-credentials\\credentials.json',
		]);
	} finally {
		Object.defineProperty(process, 'platform', { value: originalPlatform });
	}

	const after = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};

	expect(after).toMatchObject({
		credentials: [expect.objectContaining({ id: '123', name: 'cred-aws-test' })],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: ownerProject.id,
				role: 'credential:owner',
			}),
		],
	});
});

test('import:credentials should fail when input file does not contain an array', async () => {
	await expect(
		command.run(['--input=./test/integration/commands/import-credentials/credentials-object.json']),
	).rejects.toThrowError(
		'File does not seem to contain credentials. Make sure the credentials are contained in an array.',
	);
});

test('import:credentials should include only selected credential properties', async () => {
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		'--include=id,name,type,data',
	]);

	const after = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};

	expect(after).toMatchObject({
		credentials: [expect.objectContaining({ id: '123', name: 'cred-aws-test' })],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: ownerProject.id,
				role: 'credential:owner',
			}),
		],
	});
	expect(after.credentials[0].createdAt.toISOString()).not.toBe(credentialsFixture.createdAt);
	expect(after.credentials[0].updatedAt.toISOString()).not.toBe(credentialsFixture.updatedAt);
});

test('import:credentials should exclude selected credential properties', async () => {
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);

	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		'--exclude=createdAt,updatedAt',
	]);

	const after = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};

	expect(after).toMatchObject({
		credentials: [expect.objectContaining({ id: '123', name: 'cred-aws-test' })],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: ownerProject.id,
				role: 'credential:owner',
			}),
		],
	});
	expect(after.credentials[0].createdAt.toISOString()).not.toBe(credentialsFixture.createdAt);
	expect(after.credentials[0].updatedAt.toISOString()).not.toBe(credentialsFixture.updatedAt);
});

test('`import:credentials --include ...` should fail when no importable properties remain after filtering', async () => {
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials.json',
			'--include=unknownProperty',
		]),
	).rejects.toThrowError('No importable properties found. Please check the --include flag.');
});

test('`import:credentials --include ... --exclude ...` should fail explaining that only one option can be used', async () => {
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials.json',
			'--include=id,name,type,data',
			'--exclude=createdAt,updatedAt',
		]),
	).rejects.toThrowError(
		'You cannot use `--include` and `--exclude` together. Use one or the other.',
	);
});

test('`import:credentials --userId ...` should fail if the credential exists already and is owned by somebody else', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const member = await createMember();

	// import credential the first time, assigning it to the owner
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		`--userId=${owner.id}`,
	]);

	// making sure the import worked
	const before = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};
	expect(before).toMatchObject({
		credentials: [expect.objectContaining({ id: '123', name: 'cred-aws-test' })],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: ownerProject.id,
				role: 'credential:owner',
			}),
		],
	});

	//
	// ACT
	//

	// Import again while updating the name we try to assign the
	// credential to another user.
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials-updated.json',
			`--userId=${member.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "123" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the user with the ID "${member.id}"`,
	);

	//
	// ASSERT
	//
	const after = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};

	expect(after).toMatchObject({
		credentials: [
			expect.objectContaining({
				id: '123',
				// only the name was updated
				name: 'cred-aws-test',
			}),
		],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: ownerProject.id,
				role: 'credential:owner',
			}),
		],
	});
});

test("only update credential, don't create or update owner if neither `--userId` nor `--projectId` is passed", async () => {
	//
	// ARRANGE
	//
	await createOwner();
	const member = await createMember();
	const memberProject = await getPersonalProject(member);

	// import credential the first time, assigning it to a member
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		`--userId=${member.id}`,
	]);

	// making sure the import worked
	const before = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};
	expect(before).toMatchObject({
		credentials: [expect.objectContaining({ id: '123', name: 'cred-aws-test' })],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: memberProject.id,
				role: 'credential:owner',
			}),
		],
	});

	//
	// ACT
	//
	// Import again only updating the name and omitting `--userId`
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials-updated.json',
	]);

	//
	// ASSERT
	//
	const after = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};

	expect(after).toMatchObject({
		credentials: [
			expect.objectContaining({
				id: '123',
				// only the name was updated
				name: 'cred-aws-prod',
			}),
		],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: memberProject.id,
				role: 'credential:owner',
			}),
		],
	});
});

test('`import:credential --projectId ...` should fail if the credential already exists and is owned by another project', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const member = await createMember();
	const memberProject = await getPersonalProject(member);

	// import credential the first time, assigning it to the owner
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		`--userId=${owner.id}`,
	]);

	// making sure the import worked
	const before = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};
	expect(before).toMatchObject({
		credentials: [expect.objectContaining({ id: '123', name: 'cred-aws-test' })],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: ownerProject.id,
				role: 'credential:owner',
			}),
		],
	});

	//
	// ACT
	//

	// Import again while updating the name we try to assign the
	// credential to another user.
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials-updated.json',
			`--projectId=${memberProject.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "123" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the project with the ID "${memberProject.id}".`,
	);

	//
	// ASSERT
	//
	const after = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};

	expect(after).toMatchObject({
		credentials: [
			expect.objectContaining({
				id: '123',
				// only the name was updated
				name: 'cred-aws-test',
			}),
		],
		sharings: [
			expect.objectContaining({
				credentialsId: '123',
				projectId: ownerProject.id,
				role: 'credential:owner',
			}),
		],
	});
});

test('`import:credential --projectId ... --userId ...` fails explaining that only one of the options can be used at a time', async () => {
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials-updated.json',
			`--projectId=${nanoid()}`,
			`--userId=${nanoid()}`,
		]),
	).rejects.toThrowError(
		'You cannot use `--userId` and `--projectId` together. Use one or the other.',
	);
});
