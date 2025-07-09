import {
	getPersonalProject,
	mockInstance,
	createWorkflow,
	testDb,
	randomCredentialPayload,
} from '@n8n/backend-test-utils';
import {
	CredentialsEntity,
	SettingsRepository,
	CredentialsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { Reset } from '@/commands/user-management/reset';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { encryptCredentialData, saveCredential } from '../shared/db/credentials';
import { createMember, createUser } from '../shared/db/users';

mockInstance(LoadNodesAndCredentials);
mockInstance(NodeTypes);
const command = setupTestCommand(Reset);

beforeEach(async () => {
	await testDb.truncate(['User']);
});

test('user-management:reset should reset DB to default user state', async () => {
	//
	// ARRANGE
	//
	const owner = await createUser({ role: 'global:owner' });
	const ownerProject = await getPersonalProject(owner);

	// should be deleted
	const member = await createMember();

	// should be re-owned
	const workflow = await createWorkflow({}, member);
	const credential = await saveCredential(randomCredentialPayload(), {
		user: member,
		role: 'credential:owner',
	});

	// dangling credentials should also be re-owned
	const danglingCredential = await Container.get(CredentialsRepository).save(
		await encryptCredentialData(Object.assign(new CredentialsEntity(), randomCredentialPayload())),
	);

	// mark instance as set up
	await Container.get(SettingsRepository).update(
		{ key: 'userManagement.isInstanceOwnerSetUp' },
		{ value: 'true' },
	);

	//
	// ACT
	//
	await command.run();

	//
	// ASSERT
	//

	// check if the owner account was reset:
	await expect(
		Container.get(UserRepository).findOneBy({ role: 'global:owner' }),
	).resolves.toMatchObject({
		email: null,
		firstName: null,
		lastName: null,
		password: null,
		personalizationAnswers: null,
	});

	// all members were deleted:
	const members = await Container.get(UserRepository).findOneBy({ role: 'global:member' });
	expect(members).toBeNull();

	// all workflows are owned by the owner:
	await expect(
		Container.get(SharedWorkflowRepository).findBy({ workflowId: workflow.id }),
	).resolves.toMatchObject([{ projectId: ownerProject.id, role: 'workflow:owner' }]);

	// all credentials are owned by the owner
	await expect(
		Container.get(SharedCredentialsRepository).findBy({ credentialsId: credential.id }),
	).resolves.toMatchObject([{ projectId: ownerProject.id, role: 'credential:owner' }]);

	// all dangling credentials are owned by the owner
	await expect(
		Container.get(SharedCredentialsRepository).findBy({ credentialsId: danglingCredential.id }),
	).resolves.toMatchObject([{ projectId: ownerProject.id, role: 'credential:owner' }]);

	// the instance is marked as not set up:
	await expect(
		Container.get(SettingsRepository).findBy({ key: 'userManagement.isInstanceOwnerSetUp' }),
	).resolves.toMatchObject([{ value: 'false' }]);
});
