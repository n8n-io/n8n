import { Config } from '@oclif/core';

import { InternalHooks } from '@/InternalHooks';
import { ImportCredentialsCommand } from '@/commands/import/credentials';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';

import { mockInstance } from '../../shared/mocking';
import * as testDb from '../shared/testDb';
import { getAllCredentials, getAllSharedCredentials } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';

const oclifConfig = new Config({ root: __dirname });

async function importCredential(argv: string[]) {
	const importer = new ImportCredentialsCommand(argv, oclifConfig);
	await importer.init();
	await importer.run();
}

beforeAll(async () => {
	mockInstance(InternalHooks);
	mockInstance(LoadNodesAndCredentials);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['Credentials', 'SharedCredentials', 'User']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('import:credentials should import a credential', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();

	//
	// ACT
	//
	await importCredential([
		'--input=./test/integration/commands/importCredentials/credentials.json',
	]);

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
			expect.objectContaining({ credentialsId: '123', userId: owner.id, role: 'credential:owner' }),
		],
	});
});

test('import:credentials should import a credential from separated files', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();

	//
	// ACT
	//
	// import credential the first time, assigning it to the owner
	await importCredential([
		'--separate',
		'--input=./test/integration/commands/importCredentials/separate',
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
				userId: owner.id,
				role: 'credential:owner',
			}),
		],
	});
});

test('`import:credentials --userId ...` should fail if the credential exists already and is owned by somebody else', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const member = await createMember();

	// import credential the first time, assigning it to the owner
	await importCredential([
		'--input=./test/integration/commands/importCredentials/credentials.json',
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
				userId: owner.id,
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
		importCredential([
			'--input=./test/integration/commands/importCredentials/credentials-updated.json',
			`--userId=${member.id}`,
		]),
	).rejects.toThrowError(
		`The credential with id "123" is already owned by the user with the id "${owner.id}". It can't be re-owned by the user with the id "${member.id}"`,
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
				userId: owner.id,
				role: 'credential:owner',
			}),
		],
	});
});

test("only update credential, don't create or update owner if `--userId` is not passed", async () => {
	//
	// ARRANGE
	//
	await createOwner();
	const member = await createMember();

	// import credential the first time, assigning it to a member
	await importCredential([
		'--input=./test/integration/commands/importCredentials/credentials.json',
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
				userId: member.id,
				role: 'credential:owner',
			}),
		],
	});

	//
	// ACT
	//
	// Import again only updating the name and omitting `--userId`
	await importCredential([
		'--input=./test/integration/commands/importCredentials/credentials-updated.json',
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
				userId: member.id,
				role: 'credential:owner',
			}),
		],
	});
});
