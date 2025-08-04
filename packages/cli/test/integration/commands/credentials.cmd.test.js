'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const nanoid_1 = require('nanoid');
require('@/zod-alias-support');
const credentials_1 = require('@/commands/import/credentials');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const test_command_1 = require('@test-integration/utils/test-command');
const credentials_2 = require('../shared/db/credentials');
const users_1 = require('../shared/db/users');
(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials);
const command = (0, test_command_1.setupTestCommand)(credentials_1.ImportCredentialsCommand);
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['CredentialsEntity', 'SharedCredentials', 'User']);
});
test('import:credentials should import a credential', async () => {
	const owner = await (0, users_1.createOwner)();
	const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	await command.run(['--input=./test/integration/commands/import-credentials/credentials.json']);
	const after = {
		credentials: await (0, credentials_2.getAllCredentials)(),
		sharings: await (0, credentials_2.getAllSharedCredentials)(),
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
	const owner = await (0, users_1.createOwner)();
	const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	await command.run([
		'--separate',
		'--input=./test/integration/commands/import-credentials/separate',
	]);
	const after = {
		credentials: await (0, credentials_2.getAllCredentials)(),
		sharings: await (0, credentials_2.getAllSharedCredentials)(),
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
test('`import:credentials --userId ...` should fail if the credential exists already and is owned by somebody else', async () => {
	const owner = await (0, users_1.createOwner)();
	const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	const member = await (0, users_1.createMember)();
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		`--userId=${owner.id}`,
	]);
	const before = {
		credentials: await (0, credentials_2.getAllCredentials)(),
		sharings: await (0, credentials_2.getAllSharedCredentials)(),
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
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials-updated.json',
			`--userId=${member.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "123" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the user with the ID "${member.id}"`,
	);
	const after = {
		credentials: await (0, credentials_2.getAllCredentials)(),
		sharings: await (0, credentials_2.getAllSharedCredentials)(),
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
test("only update credential, don't create or update owner if neither `--userId` nor `--projectId` is passed", async () => {
	await (0, users_1.createOwner)();
	const member = await (0, users_1.createMember)();
	const memberProject = await (0, backend_test_utils_1.getPersonalProject)(member);
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		`--userId=${member.id}`,
	]);
	const before = {
		credentials: await (0, credentials_2.getAllCredentials)(),
		sharings: await (0, credentials_2.getAllSharedCredentials)(),
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
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials-updated.json',
	]);
	const after = {
		credentials: await (0, credentials_2.getAllCredentials)(),
		sharings: await (0, credentials_2.getAllSharedCredentials)(),
	};
	expect(after).toMatchObject({
		credentials: [
			expect.objectContaining({
				id: '123',
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
	const owner = await (0, users_1.createOwner)();
	const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	const member = await (0, users_1.createMember)();
	const memberProject = await (0, backend_test_utils_1.getPersonalProject)(member);
	await command.run([
		'--input=./test/integration/commands/import-credentials/credentials.json',
		`--userId=${owner.id}`,
	]);
	const before = {
		credentials: await (0, credentials_2.getAllCredentials)(),
		sharings: await (0, credentials_2.getAllSharedCredentials)(),
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
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials-updated.json',
			`--projectId=${memberProject.id}`,
		]),
	).rejects.toThrowError(
		`The credential with ID "123" is already owned by the user with the ID "${owner.id}". It can't be re-owned by the project with the ID "${memberProject.id}".`,
	);
	const after = {
		credentials: await (0, credentials_2.getAllCredentials)(),
		sharings: await (0, credentials_2.getAllSharedCredentials)(),
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
test('`import:credential --projectId ... --userId ...` fails explaining that only one of the options can be used at a time', async () => {
	await expect(
		command.run([
			'--input=./test/integration/commands/import-credentials/credentials-updated.json',
			`--projectId=${(0, nanoid_1.nanoid)()}`,
			`--userId=${(0, nanoid_1.nanoid)()}`,
		]),
	).rejects.toThrowError(
		'You cannot use `--userId` and `--projectId` together. Use one or the other.',
	);
});
//# sourceMappingURL=credentials.cmd.test.js.map
