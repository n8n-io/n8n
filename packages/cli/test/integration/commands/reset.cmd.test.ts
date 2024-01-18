import { Reset } from '@/commands/user-management/reset';
import type { Role } from '@db/entities/Role';
import { InternalHooks } from '@/InternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import Container from 'typedi';
import { UserRepository } from '@db/repositories/user.repository';

import { mockInstance } from '../../shared/mocking';
import * as testDb from '../shared/testDb';
import { getGlobalOwnerRole } from '../shared/db/roles';
import { createUser } from '../shared/db/users';

let globalOwnerRole: Role;

beforeAll(async () => {
	mockInstance(InternalHooks);
	mockInstance(LoadNodesAndCredentials);
	mockInstance(NodeTypes);
	await testDb.init();

	globalOwnerRole = await getGlobalOwnerRole();
});

beforeEach(async () => {
	await testDb.truncate(['User']);
});

afterAll(async () => {
	await testDb.terminate();
});

// eslint-disable-next-line n8n-local-rules/no-skipped-tests
test.skip('user-management:reset should reset DB to default user state', async () => {
	await createUser({ globalRole: globalOwnerRole });

	await Reset.run();

	const user = await Container.get(UserRepository).findOneBy({ globalRoleId: globalOwnerRole.id });

	if (!user) {
		fail('No owner found after DB reset to default user state');
	}

	expect(user.email).toBeNull();
	expect(user.firstName).toBeNull();
	expect(user.lastName).toBeNull();
	expect(user.password).toBeNull();
	expect(user.personalizationAnswers).toBeNull();
});
