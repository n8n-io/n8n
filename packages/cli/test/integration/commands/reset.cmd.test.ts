import { Reset } from '@/commands/user-management/reset';
import { InternalHooks } from '@/InternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import Container from 'typedi';
import { UserRepository } from '@db/repositories/user.repository';

import { mockInstance } from '../../shared/mocking';
import * as testDb from '../shared/testDb';
import { createMember, createOwner } from '../shared/db/users';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { setInstanceOwnerSetUp } from '../shared/utils';
import { createWorkflow } from '../shared/db/workflows';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/sharedWorkflow.repository';
import { createCredential } from '../shared/db/credentials';
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';

let userRepository: UserRepository;
let settingsRepository: SettingsRepository;
let projectRepository: ProjectRepository;
let sharedWorkflowRepository: SharedWorkflowRepository;
let sharedCredentialsRepository: SharedCredentialsRepository;

beforeAll(async () => {
	mockInstance(InternalHooks);
	mockInstance(LoadNodesAndCredentials);
	mockInstance(NodeTypes);
	await testDb.init();
	userRepository = Container.get(UserRepository);
	settingsRepository = Container.get(SettingsRepository);
	projectRepository = Container.get(ProjectRepository);
	sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
	sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
});

beforeEach(async () => {
	await testDb.truncate(['User', 'Credentials', 'Project', 'Workflow']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('user-management:reset should reset DB to default user state', async () => {
	//
	// ARRANGE
	//
	await createOwner();
	await createMember();
	await setInstanceOwnerSetUp(true);

	//
	// ACT
	//
	await Reset.run();

	//
	// ASSERT
	//
	const user = await userRepository.findOneBy({ role: 'global:owner' });
	const numberOfUsers = await userRepository.count();
	const isInstanceOwnerSetUp = await settingsRepository.findOneByOrFail({
		key: 'userManagement.isInstanceOwnerSetUp',
	});

	if (!user) {
		fail('No owner found after DB reset to default user state');
	}

	expect(numberOfUsers).toBe(1);
	expect(isInstanceOwnerSetUp.value).toBe('false');

	expect(user.email).toBeNull();
	expect(user.firstName).toBeNull();
	expect(user.lastName).toBeNull();
	expect(user.password).toBeNull();
	expect(user.personalizationAnswers).toBeNull();
});

test('user-management:reset should reset all workflows', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
	const member = await createMember();
	const workflow = await createWorkflow(undefined, member);

	//
	// ACT
	//
	await Reset.run();

	//
	// ASSERT
	//
	const [sharedWorkflow] = await sharedWorkflowRepository.findByWorkflowIds([workflow.id]);
	expect(sharedWorkflow).toBeDefined();
	expect(sharedWorkflow.projectId).toBe(ownerPersonalProject.id);
});

test('user-management:reset should reset all credentials', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
	const member = await createMember();
	const credential = await createCredential(
		{
			name: 'foobar',
			data: {},
			type: 'foobar',
			nodesAccess: [],
		},
		{ user: member, role: 'credential:owner' },
	);

	//
	// ACT
	//
	await Reset.run();

	//
	// ASSERT
	//
	const sharedCredential = await sharedCredentialsRepository.findOneByOrFail({
		credentialsId: credential.id,
	});
	expect(sharedCredential.projectId).toBe(ownerPersonalProject.id);
});

test('user-management:reset should re-own all orphaned credentials', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
	const credential = await createCredential(
		{
			name: 'foobar',
			data: {},
			type: 'foobar',
			nodesAccess: [],
		},
		{ user: owner, role: 'credential:owner' },
	);
	await sharedCredentialsRepository.delete({ credentialsId: credential.id });

	//
	// ACT
	//
	await Reset.run();

	//
	// ASSERT
	//
	const sharedCredentialAfterReset = await sharedCredentialsRepository.findOneByOrFail({
		credentialsId: credential.id,
	});

	expect(sharedCredentialAfterReset.projectId).toBe(ownerPersonalProject.id);
});

test('user-management:reset should create a personal project if there is none', async () => {
	//
	// ARRANGE
	//
	const owner = await createOwner();
	await projectRepository.delete({});
	await expect(projectRepository.getPersonalProjectForUser(owner.id)).resolves.toBeNull();

	//
	// ACT
	//
	await Reset.run();

	//
	// ASSERT
	//
	await expect(projectRepository.getPersonalProjectForUser(owner.id)).resolves.not.toBeNull();
});

test('user-management:reset should create an owner if there is none', async () => {
	//
	// ARRANGE
	//
	let owner = await userRepository.findOneBy({ role: 'global:owner' });
	expect(owner).toBeNull();

	//
	// ACT
	//
	await Reset.run();

	//
	// ASSERT
	//
	owner = await userRepository.findOneBy({ role: 'global:owner' });

	if (!owner) {
		fail('Expected owner to be defined.');
	}

	expect(owner.role).toBe('global:owner');
});
