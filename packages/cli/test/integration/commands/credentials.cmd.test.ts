import { Config } from '@oclif/core';

import { InternalHooks } from '@/InternalHooks';
import { ImportCredentialsCommand } from '@/commands/import/credentials';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';

import { mockInstance } from '../../shared/mocking';
import * as testDb from '../shared/testDb';
import { getAllCredentials, getAllSharedCredentials } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';

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
	mockExit.mockRestore();
});

test('`import:credentials --userId ...` should fail if the credential exists already and is owned by somebody else', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const member = await createMember();

	// import credential the first time, assigning it to the owner
	const importer1 = new ImportCredentialsCommand(
		[
			'--input=./test/integration/commands/importCredentials/credentials.json',
			`--userId=${owner.id}`,
		],
		oclifConfig,
	);
	await importer1.init();
	await importer1.run();

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

	// Prepare the second import, while updating the name we try to assign the
	// credential to another user.
	const importer2 = new ImportCredentialsCommand(
		[
			'--input=./test/integration/commands/importCredentials/credentials-updated.json',
			`--userId=${member.id}`,
		],
		oclifConfig,
	);
	await importer2.init();

	//
	// ACT
	//
	await expect(importer2.run()).rejects.toThrowError(
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

test('`import:credentials --separate --userId ...` should fail if the credential exists already and is owned by somebody else', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const member = await createMember();

	// import credential the first time, assigning it to the owner
	const importer1 = new ImportCredentialsCommand(
		[
			'--separate',
			'--input=./test/integration/commands/importCredentials/separate',
			`--userId=${owner.id}`,
		],
		oclifConfig,
	);
	await importer1.init();
	await importer1.run();

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

	// Prepare the second import, while updating the name we try to assign the
	// credential to another user.
	const importer2 = new ImportCredentialsCommand(
		[
			'--separate',
			'--input=./test/integration/commands/importCredentials/separate-updated',
			`--userId=${member.id}`,
		],
		oclifConfig,
	);
	await importer2.init();

	//
	// ACT
	//
	await expect(importer2.run()).rejects.toThrowError(
		`The credential with id "123" is already owned by the user with the id "${owner.id}". It can't be re-owned by the user with the id "${member.id}"`,
	);

	//
	// ASSERT
	//
	const after = {
		credentials: await getAllCredentials(),
		sharings: await getAllSharedCredentials(),
	};

	// nothing should have changed
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

test("only update the credential, don't create or update the owner if `--userId` is not passed, while using `--separate`", async () => {
	//
	// ARRANGE
	//
	const member = await createMember();

	// import credential the first time, assigning it to a member
	const importer1 = new ImportCredentialsCommand(
		[
			'--separate',
			'--input=./test/integration/commands/importCredentials/separate',
			`--userId=${member.id}`,
		],
		oclifConfig,
	);
	await importer1.init();
	await importer1.run();

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

	// prepare the second import, trying to assign the same credential to another user
	const importer2 = new ImportCredentialsCommand(
		['--separate', '--input=./test/integration/commands/importCredentials/separate-updated'],
		oclifConfig,
	);
	await importer2.init();

	//
	// ACT
	//
	await importer2.run();

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

test("only update credential, don't create or update owner if `--userId` is not passed", async () => {
	//
	// ARRANGE
	//
	const member = await createMember();

	// import credential the first time, assigning it to a member
	const importer1 = new ImportCredentialsCommand(
		[
			'--input=./test/integration/commands/importCredentials/credentials.json',
			`--userId=${member.id}`,
		],
		oclifConfig,
	);
	await importer1.init();
	await importer1.run();

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

	// prepare the second import, only updating the name and omitting `--userId`
	const importer2 = new ImportCredentialsCommand(
		['--input=./test/integration/commands/importCredentials/credentials-updated.json'],
		oclifConfig,
	);
	await importer2.init();

	//
	// ACT
	//
	await importer2.run();

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
