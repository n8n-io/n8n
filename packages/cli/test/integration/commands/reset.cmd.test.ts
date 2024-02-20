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

let userRepository: UserRepository;
let settingsRepository: SettingsRepository;

beforeAll(async () => {
	mockInstance(InternalHooks);
	mockInstance(LoadNodesAndCredentials);
	mockInstance(NodeTypes);
	await testDb.init();
	userRepository = Container.get(UserRepository);
	settingsRepository = Container.get(SettingsRepository);
});

beforeEach(async () => {
	await testDb.truncate(['User']);
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
