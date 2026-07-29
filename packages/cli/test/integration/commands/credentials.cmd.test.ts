import { getPersonalProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import { CredentialsEntity, DbLock, DbLockService, InstanceCredentialAssignment } from '@n8n/db';
import { Container } from '@n8n/di';
import * as fs from 'fs';
import { jsonParse } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import * as os from 'os';
import * as path from 'path';

import '@/zod-alias-support';
import { ImportCredentialsCommand } from '@/commands/import/credentials';
import { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
import type { InstanceCredentialUse } from '@/credentials/instance-credential-use.registry';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import {
	createCredentials,
	encryptCredentialData,
	getAllCredentials,
	getAllSharedCredentials,
} from '../shared/db/credentials';
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
const IMPORT_CREDENTIAL_USE = {
	id: 'test:credential-import',
	credentialTypes: ['aws'],
	validate: ({ data }) => {
		if (data.region !== 'us-east-1') throw new Error('Invalid imported provider connection');
	},
} satisfies InstanceCredentialUse;

beforeAll(() => {
	Container.get(InstanceCredentialBroker).registerUse(IMPORT_CREDENTIAL_USE);
});

beforeEach(async () => {
	await testDb.truncate([
		'InstanceCredentialAssignment',
		'CredentialsEntity',
		'SharedCredentials',
		'User',
	]);
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

test('import:credentials should preserve the usage scope of existing instance credentials', async () => {
	await createOwner();
	await createCredentials({
		id: '123',
		name: 'instance-model-cred',
		type: 'aws',
		data: 'encrypted',
		usageScope: 'instance',
	});
	await command.run(['--input=./test/integration/commands/import-credentials/credentials.json']);

	const after = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};
	expect(after.credentials).toEqual([
		expect.objectContaining({ id: '123', usageScope: 'instance' }),
	]);
	expect(after.sharings).toEqual([]);
});

test('import:credentials should reject changing an existing provider connection type', async () => {
	await createOwner();
	await createCredentials({
		id: '123',
		name: 'instance-model-cred',
		type: 'apiKey',
		data: 'encrypted',
		usageScope: 'instance',
	});

	await expect(
		command.run(['--input=./test/integration/commands/import-credentials/credentials.json']),
	).rejects.toThrow('Provider connection type cannot be changed');
});

test('import:credentials should validate an assigned provider connection', async () => {
	await createOwner();
	const entity = new CredentialsEntity();
	Object.assign(entity, {
		id: '123',
		name: 'instance-model-cred',
		type: 'aws',
		data: { region: 'us-east-1' },
		usageScope: 'instance',
	});
	await encryptCredentialData(entity);
	entity.id = '123';
	const credential = await createCredentials(entity);
	const dbLockService = Container.get(DbLockService);
	await dbLockService.withLock(DbLock.INSTANCE_AI_SETTINGS, async (transactionManager) => {
		await transactionManager.insert(InstanceCredentialAssignment, {
			credentialUseId: IMPORT_CREDENTIAL_USE.id,
			credentialId: credential.id,
		});
	});

	let importSettled = false;
	let importPromise: ReturnType<typeof command.run> | undefined;
	const withLockSpy = vi.spyOn(dbLockService, 'withLock');
	try {
		await dbLockService.withLock(DbLock.INSTANCE_AI_SETTINGS, async () => {
			importPromise = command.run([
				'--input=./test/integration/commands/import-credentials/credentials.json',
			]);
			void importPromise.then(
				() => {
					importSettled = true;
				},
				() => {
					importSettled = true;
				},
			);
			await vi.waitFor(() => expect(withLockSpy).toHaveBeenCalledTimes(2));
			expect(importSettled).toBe(false);
		});
	} finally {
		withLockSpy.mockRestore();
	}

	if (!importPromise) throw new Error('Expected credential import to start');
	const importError: unknown = await importPromise.then(
		() => undefined,
		(error: unknown) => error,
	);
	expect(importError).toBeInstanceOf(Error);
	if (!(importError instanceof Error)) throw new Error('Expected credential import to fail');
	expect(importError.message).toContain('Invalid imported provider connection');
	await expect(getAllCredentials()).resolves.toEqual([
		expect.objectContaining({
			id: credential.id,
			name: 'instance-model-cred',
			data: credential.data,
		}),
	]);
});

test.each([
	['null', null],
	['empty', ''],
	['invalid', 'not-encrypted'],
])('import:credentials should reject %s provider connection data', async (_label, data) => {
	await createOwner();
	const entity = new CredentialsEntity();
	Object.assign(entity, {
		id: '123',
		name: 'instance-model-cred',
		type: 'aws',
		data: { region: 'us-east-1' },
		usageScope: 'instance',
	});
	await encryptCredentialData(entity);
	const credential = await createCredentials(entity);
	const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-credential-import-'));
	const inputPath = path.join(temporaryDirectory, 'credentials.json');
	fs.writeFileSync(
		inputPath,
		JSON.stringify([{ id: credential.id, name: 'changed', type: credential.type, data }]),
	);

	try {
		await expect(command.run([`--input=${inputPath}`])).rejects.toThrow();
	} finally {
		fs.rmSync(temporaryDirectory, { recursive: true, force: true });
	}
	await expect(getAllCredentials()).resolves.toEqual([
		expect.objectContaining({
			id: credential.id,
			name: 'instance-model-cred',
			data: credential.data,
		}),
	]);
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
