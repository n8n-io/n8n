import { Reset } from '@/commands/user-management/reset';
import { InternalHooks } from '@/InternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import Container from 'typedi';
import { UserRepository } from '@db/repositories/user.repository';

import { mockInstance } from '../../shared/mocking';
import * as testDb from '../shared/testDb';
import { createUser } from '../shared/db/users';

beforeAll(async () => {
	mockInstance(InternalHooks);
	mockInstance(LoadNodesAndCredentials);
	mockInstance(NodeTypes);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['User']);
});

afterAll(async () => {
	await testDb.terminate();
});

// eslint-disable-next-line n8n-local-rules/no-skipped-tests
test.skip('user-management:reset should reset DB to default user state', async () => {
	await createUser({ role: 'global:owner' });

	await Reset.run();

	const user = await Container.get(UserRepository).findOneBy({ role: 'global:owner' });

	if (!user) {
		fail('No owner found after DB reset to default user state');
	}

	expect(user.email).toBeNull();
	expect(user.firstName).toBeNull();
	expect(user.lastName).toBeNull();
	expect(user.password).toBeNull();
	expect(user.personalizationAnswers).toBeNull();
});
