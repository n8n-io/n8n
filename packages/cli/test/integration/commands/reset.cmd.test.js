'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const reset_1 = require('@/commands/user-management/reset');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const node_types_1 = require('@/node-types');
const test_command_1 = require('@test-integration/utils/test-command');
const credentials_1 = require('../shared/db/credentials');
const users_1 = require('../shared/db/users');
(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials);
(0, backend_test_utils_1.mockInstance)(node_types_1.NodeTypes);
const command = (0, test_command_1.setupTestCommand)(reset_1.Reset);
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['User']);
});
test('user-management:reset should reset DB to default user state', async () => {
	const owner = await (0, users_1.createUser)({ role: 'global:owner' });
	const ownerProject = await (0, backend_test_utils_1.getPersonalProject)(owner);
	const member = await (0, users_1.createMember)();
	const workflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
	const credential = await (0, credentials_1.saveCredential)(
		(0, backend_test_utils_1.randomCredentialPayload)(),
		{
			user: member,
			role: 'credential:owner',
		},
	);
	const danglingCredential = await di_1.Container.get(db_1.CredentialsRepository).save(
		await (0, credentials_1.encryptCredentialData)(
			Object.assign(
				new db_1.CredentialsEntity(),
				(0, backend_test_utils_1.randomCredentialPayload)(),
			),
		),
	);
	await di_1.Container.get(db_1.SettingsRepository).update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: 'true' },
	);
	await command.run();
	await expect(
		di_1.Container.get(db_1.UserRepository).findOneBy({ role: 'global:owner' }),
	).resolves.toMatchObject({
		email: null,
		firstName: null,
		lastName: null,
		password: null,
		personalizationAnswers: null,
	});
	const members = await di_1.Container.get(db_1.UserRepository).findOneBy({
		role: 'global:member',
	});
	expect(members).toBeNull();
	await expect(
		di_1.Container.get(db_1.SharedWorkflowRepository).findBy({ workflowId: workflow.id }),
	).resolves.toMatchObject([{ projectId: ownerProject.id, role: 'workflow:owner' }]);
	await expect(
		di_1.Container.get(db_1.SharedCredentialsRepository).findBy({ credentialsId: credential.id }),
	).resolves.toMatchObject([{ projectId: ownerProject.id, role: 'credential:owner' }]);
	await expect(
		di_1.Container.get(db_1.SharedCredentialsRepository).findBy({
			credentialsId: danglingCredential.id,
		}),
	).resolves.toMatchObject([{ projectId: ownerProject.id, role: 'credential:owner' }]);
	await expect(
		di_1.Container.get(db_1.SettingsRepository).findBy({
			key: 'userManagement.isInstanceOwnerSetUp',
		}),
	).resolves.toMatchObject([{ value: 'false' }]);
});
//# sourceMappingURL=reset.cmd.test.js.map
