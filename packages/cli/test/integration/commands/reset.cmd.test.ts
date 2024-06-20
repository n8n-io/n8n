import { Container } from 'typedi';

import { Reset } from '@/commands/user-management/reset';
import { InternalHooks } from '@/InternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { SettingsRepository } from '@db/repositories/settings.repository';
import { UserRepository } from '@db/repositories/user.repository';

import { setupTestCommand } from '@test-integration/utils/testCommand';
import { mockInstance } from '../../shared/mocking';
import * as testDb from '../shared/testDb';
import { createMember, createUser } from '../shared/db/users';
import { createWorkflow } from '../shared/db/workflows';
import { getPersonalProject } from '../shared/db/projects';
import { encryptCredentialData, saveCredential } from '../shared/db/credentials';
import { randomCredentialPayload } from '../shared/random';

mockInstance(InternalHooks);
mockInstance(LoadNodesAndCredentials);
mockInstance(NodeTypes);
const command = setupTestCommand(Reset);

beforeEach(async () => {
	await testDb.truncate(['User']);
});

// eslint-disable-next-line n8n-local-rules/no-skipped-tests
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
