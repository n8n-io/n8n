'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const uuid_1 = require('uuid');
const reset_1 = require('@/commands/ldap/reset');
const helpers_ee_1 = require('@/ldap.ee/helpers.ee');
const ldap_service_ee_1 = require('@/ldap.ee/ldap.service.ee');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const push_1 = require('@/push');
const telemetry_1 = require('@/telemetry');
const test_command_1 = require('@test-integration/utils/test-command');
const credentials_1 = require('../../shared/db/credentials');
const users_1 = require('../../shared/db/users');
const ldap_1 = require('../../shared/ldap');
(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
(0, backend_test_utils_1.mockInstance)(push_1.Push);
(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials);
const command = (0, test_command_1.setupTestCommand)(reset_1.Reset);
test('fails if neither `--userId` nor `--projectId` nor `--deleteWorkflowsAndCredentials` is passed', async () => {
	await expect(command.run()).rejects.toThrowError(
		'You must use exactly one of `--userId`, `--projectId` or `--deleteWorkflowsAndCredentials`.',
	);
});
test.each([
	[
		`--userId=${(0, uuid_1.v4)()}`,
		`--projectId=${(0, uuid_1.v4)()}`,
		'--deleteWorkflowsAndCredentials',
	],
	[`--userId=${(0, uuid_1.v4)()}`, `--projectId=${(0, uuid_1.v4)()}`],
	[`--userId=${(0, uuid_1.v4)()}`, '--deleteWorkflowsAndCredentials'],
	['--deleteWorkflowsAndCredentials', `--projectId=${(0, uuid_1.v4)()}`],
])(
	'fails if more than one of `--userId`, `--projectId`, `--deleteWorkflowsAndCredentials` are passed',
	async (...argv) => {
		await expect(command.run(argv)).rejects.toThrowError(
			'You must use exactly one of `--userId`, `--projectId` or `--deleteWorkflowsAndCredentials`.',
		);
	},
);
describe('--deleteWorkflowsAndCredentials', () => {
	test('deletes personal projects, workflows and credentials owned by LDAP managed users', async () => {
		const member = await (0, users_1.createLdapUser)({ role: 'global:member' }, (0, uuid_1.v4)());
		const memberProject = await (0, backend_test_utils_1.getPersonalProject)(member);
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		const normalMember = await (0, users_1.createMember)();
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)({}, normalMember);
		const credential2 = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: normalMember,
				role: 'credential:owner',
			},
		);
		await command.run(['--deleteWorkflowsAndCredentials']);
		await expect((0, users_1.getUserById)(member.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect((0, backend_test_utils_1.findProject)(memberProject.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect(
			di_1.Container.get(db_1.WorkflowRepository).findOneBy({ id: workflow.id }),
		).resolves.toBeNull();
		await expect(
			di_1.Container.get(db_1.CredentialsRepository).findOneBy({ id: credential.id }),
		).resolves.toBeNull();
		await expect((0, users_1.getUserById)(normalMember.id)).resolves.not.toThrowError();
		await expect(
			di_1.Container.get(db_1.WorkflowRepository).findOneBy({ id: workflow2.id }),
		).resolves.not.toBeNull();
		await expect(
			di_1.Container.get(db_1.CredentialsRepository).findOneBy({ id: credential2.id }),
		).resolves.not.toBeNull();
	});
	test('deletes the LDAP sync history', async () => {
		await (0, helpers_ee_1.saveLdapSynchronization)({
			created: 1,
			disabled: 1,
			scanned: 1,
			updated: 1,
			endedAt: new Date(),
			startedAt: new Date(),
			error: '',
			runMode: 'dry',
			status: 'success',
		});
		await command.run(['--deleteWorkflowsAndCredentials']);
		await expect((0, helpers_ee_1.getLdapSynchronizations)(0, 10)).resolves.toHaveLength(0);
	});
	test('resets LDAP settings', async () => {
		await (0, ldap_1.createLdapConfig)();
		await expect(
			di_1.Container.get(ldap_service_ee_1.LdapService).loadConfig(),
		).resolves.toMatchObject({
			loginEnabled: true,
		});
		await command.run(['--deleteWorkflowsAndCredentials']);
		await expect(
			di_1.Container.get(ldap_service_ee_1.LdapService).loadConfig(),
		).resolves.toMatchObject({
			loginEnabled: false,
		});
	});
});
describe('--userId', () => {
	test('fails if the user does not exist', async () => {
		const userId = (0, uuid_1.v4)();
		await expect(command.run([`--userId=${userId}`])).rejects.toThrowError(
			`Could not find the user with the ID ${userId} or their personalProject.`,
		);
	});
	test('fails if the user to migrate to is also an LDAP user', async () => {
		const member = await (0, users_1.createLdapUser)({ role: 'global:member' }, (0, uuid_1.v4)());
		await expect(command.run([`--userId=${member.id}`])).rejects.toThrowError(
			`Can't migrate workflows and credentials to the user with the ID ${member.id}. That user was created via LDAP and will be deleted as well.`,
		);
	});
	test("transfers all workflows and credentials to the user's personal project", async () => {
		const member = await (0, users_1.createLdapUser)({ role: 'global:member' }, (0, uuid_1.v4)());
		const memberProject = await (0, backend_test_utils_1.getPersonalProject)(member);
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		const normalMember = await (0, users_1.createMember)();
		const normalMemberProject = await (0, backend_test_utils_1.getPersonalProject)(normalMember);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)({}, normalMember);
		const credential2 = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: normalMember,
				role: 'credential:owner',
			},
		);
		await command.run([`--userId=${normalMember.id}`]);
		await expect((0, users_1.getUserById)(member.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect((0, backend_test_utils_1.findProject)(memberProject.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect(
			di_1.Container.get(db_1.SharedWorkflowRepository).findOneBy({
				workflowId: workflow.id,
				projectId: normalMemberProject.id,
			}),
		).resolves.not.toBeNull();
		await expect(
			di_1.Container.get(db_1.SharedCredentialsRepository).findOneBy({
				credentialsId: credential.id,
				projectId: normalMemberProject.id,
			}),
		).resolves.not.toBeNull();
		await expect((0, users_1.getUserById)(normalMember.id)).resolves.not.toThrowError();
		await expect(
			di_1.Container.get(db_1.WorkflowRepository).findOneBy({ id: workflow2.id }),
		).resolves.not.toBeNull();
		await expect(
			di_1.Container.get(db_1.CredentialsRepository).findOneBy({ id: credential2.id }),
		).resolves.not.toBeNull();
	});
});
describe('--projectId', () => {
	test('fails if the project does not exist', async () => {
		const projectId = (0, uuid_1.v4)();
		await expect(command.run([`--projectId=${projectId}`])).rejects.toThrowError(
			`Could not find the project with the ID ${projectId}.`,
		);
	});
	test('fails if the user to migrate to is also an LDAP user', async () => {
		const member = await (0, users_1.createLdapUser)({ role: 'global:member' }, (0, uuid_1.v4)());
		const memberProject = await (0, backend_test_utils_1.getPersonalProject)(member);
		await expect(command.run([`--projectId=${memberProject.id}`])).rejects.toThrowError(
			`Can't migrate workflows and credentials to the project with the ID ${memberProject.id}. That project is a personal project belonging to a user that was created via LDAP and will be deleted as well.`,
		);
	});
	test('transfers all workflows and credentials to a personal project', async () => {
		const member = await (0, users_1.createLdapUser)({ role: 'global:member' }, (0, uuid_1.v4)());
		const memberProject = await (0, backend_test_utils_1.getPersonalProject)(member);
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		const normalMember = await (0, users_1.createMember)();
		const normalMemberProject = await (0, backend_test_utils_1.getPersonalProject)(normalMember);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)({}, normalMember);
		const credential2 = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: normalMember,
				role: 'credential:owner',
			},
		);
		await command.run([`--projectId=${normalMemberProject.id}`]);
		await expect((0, users_1.getUserById)(member.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect((0, backend_test_utils_1.findProject)(memberProject.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect(
			di_1.Container.get(db_1.SharedWorkflowRepository).findOneBy({
				workflowId: workflow.id,
				projectId: normalMemberProject.id,
			}),
		).resolves.not.toBeNull();
		await expect(
			di_1.Container.get(db_1.SharedCredentialsRepository).findOneBy({
				credentialsId: credential.id,
				projectId: normalMemberProject.id,
			}),
		).resolves.not.toBeNull();
		await expect((0, users_1.getUserById)(normalMember.id)).resolves.not.toThrowError();
		await expect(
			di_1.Container.get(db_1.WorkflowRepository).findOneBy({ id: workflow2.id }),
		).resolves.not.toBeNull();
		await expect(
			di_1.Container.get(db_1.CredentialsRepository).findOneBy({ id: credential2.id }),
		).resolves.not.toBeNull();
	});
	test('transfers all workflows and credentials to a team project', async () => {
		const member = await (0, users_1.createLdapUser)({ role: 'global:member' }, (0, uuid_1.v4)());
		const memberProject = await (0, backend_test_utils_1.getPersonalProject)(member);
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		const normalMember = await (0, users_1.createMember)();
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)({}, normalMember);
		const credential2 = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: normalMember,
				role: 'credential:owner',
			},
		);
		const teamProject = await (0, backend_test_utils_1.createTeamProject)();
		await command.run([`--projectId=${teamProject.id}`]);
		await expect((0, users_1.getUserById)(member.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect((0, backend_test_utils_1.findProject)(memberProject.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect(
			di_1.Container.get(db_1.SharedWorkflowRepository).findOneBy({
				workflowId: workflow.id,
				projectId: teamProject.id,
			}),
		).resolves.not.toBeNull();
		await expect(
			di_1.Container.get(db_1.SharedCredentialsRepository).findOneBy({
				credentialsId: credential.id,
				projectId: teamProject.id,
			}),
		).resolves.not.toBeNull();
		await expect((0, users_1.getUserById)(normalMember.id)).resolves.not.toThrowError();
		await expect(
			di_1.Container.get(db_1.WorkflowRepository).findOneBy({ id: workflow2.id }),
		).resolves.not.toBeNull();
		await expect(
			di_1.Container.get(db_1.CredentialsRepository).findOneBy({ id: credential2.id }),
		).resolves.not.toBeNull();
	});
});
//# sourceMappingURL=reset.test.js.map
