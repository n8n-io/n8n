'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const credentials_helper_1 = require('@/credentials-helper');
const credentials_1 = require('./shared/db/credentials');
const users_1 = require('./shared/db/users');
let credentialHelper;
let owner;
let admin;
let member;
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	credentialHelper = di_1.Container.get(credentials_helper_1.CredentialsHelper);
	owner = await (0, users_1.createOwner)();
	admin = await (0, users_1.createAdmin)();
	member = await (0, users_1.createMember)();
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('CredentialsHelper', () => {
	describe('credentialOwnedBySuperUsers', () => {
		test.each([
			{
				testName: 'owners are super users',
				user: () => owner,
				credentialRole: 'credential:owner',
				expectedResult: true,
			},
			{
				testName: 'admins are super users',
				user: () => admin,
				credentialRole: 'credential:owner',
				expectedResult: true,
			},
			{
				testName: 'owners need to own the credential',
				user: () => owner,
				credentialRole: 'credential:user',
				expectedResult: false,
			},
			{
				testName: 'admins need to own the credential',
				user: () => admin,
				credentialRole: 'credential:user',
				expectedResult: false,
			},
			{
				testName: 'members are no super users',
				user: () => member,
				credentialRole: 'credential:owner',
				expectedResult: false,
			},
		])('$testName', async ({ user, credentialRole, expectedResult }) => {
			const credential = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{
					user: user(),
					role: credentialRole,
				},
			);
			const result = await credentialHelper.credentialCanUseExternalSecrets(credential);
			expect(result).toBe(expectedResult);
		});
		test('credential in team project with instance owner as an admin can use external secrets', async () => {
			const teamProject = await (0, backend_test_utils_1.createTeamProject)();
			const [credential] = await Promise.all([
				await (0, credentials_1.saveCredential)(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{
						project: teamProject,
						role: 'credential:owner',
					},
				),
				await (0, backend_test_utils_1.linkUserToProject)(owner, teamProject, 'project:admin'),
				await (0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:admin'),
			]);
			const result = await credentialHelper.credentialCanUseExternalSecrets(credential);
			expect(result).toBe(true);
		});
		test('credential in team project with instance admin as an admin can use external secrets', async () => {
			const teamProject = await (0, backend_test_utils_1.createTeamProject)();
			const [credential] = await Promise.all([
				await (0, credentials_1.saveCredential)(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{
						project: teamProject,
						role: 'credential:owner',
					},
				),
				await (0, backend_test_utils_1.linkUserToProject)(admin, teamProject, 'project:admin'),
				await (0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:admin'),
			]);
			const result = await credentialHelper.credentialCanUseExternalSecrets(credential);
			expect(result).toBe(true);
		});
		test('credential in team project with instance owner as an editor cannot use external secrets', async () => {
			const teamProject = await (0, backend_test_utils_1.createTeamProject)();
			const [credential] = await Promise.all([
				await (0, credentials_1.saveCredential)(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{
						project: teamProject,
						role: 'credential:owner',
					},
				),
				await (0, backend_test_utils_1.linkUserToProject)(owner, teamProject, 'project:editor'),
				await (0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:admin'),
			]);
			const result = await credentialHelper.credentialCanUseExternalSecrets(credential);
			expect(result).toBe(false);
		});
		test('credential in team project with instance admin as an editor cannot use external secrets', async () => {
			const teamProject = await (0, backend_test_utils_1.createTeamProject)();
			const [credential] = await Promise.all([
				await (0, credentials_1.saveCredential)(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{
						project: teamProject,
						role: 'credential:owner',
					},
				),
				await (0, backend_test_utils_1.linkUserToProject)(admin, teamProject, 'project:editor'),
				await (0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:admin'),
			]);
			const result = await credentialHelper.credentialCanUseExternalSecrets(credential);
			expect(result).toBe(false);
		});
		test('credential in team project with no instance admin or owner as part of the project cannot use external secrets', async () => {
			const teamProject = await (0, backend_test_utils_1.createTeamProject)();
			const [credential] = await Promise.all([
				await (0, credentials_1.saveCredential)(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{
						project: teamProject,
						role: 'credential:owner',
					},
				),
				await (0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:admin'),
			]);
			const result = await credentialHelper.credentialCanUseExternalSecrets(credential);
			expect(result).toBe(false);
		});
	});
});
//# sourceMappingURL=credentials-helper.test.js.map
