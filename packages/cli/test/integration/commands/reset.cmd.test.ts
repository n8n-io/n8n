import * as Db from '@/Db';
import { Reset } from '@/commands/user-management/reset';
import type { Role } from '@db/entities/Role';
import * as testDb from '../shared/testDb';
import { mockInstance } from '../shared/utils';
import { InternalHooks } from '@/InternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';

let globalOwnerRole: Role;

beforeAll(async () => {
	mockInstance(InternalHooks);
	mockInstance(LoadNodesAndCredentials);
	mockInstance(NodeTypes);
	await testDb.init();

	globalOwnerRole = await testDb.getGlobalOwnerRole();
});

beforeEach(async () => {
	await testDb.truncate(['User']);
});

afterAll(async () => {
	await testDb.terminate();
});

test.skip('user-management:reset should reset DB to default user state', async () => {
	await testDb.createUser({ globalRole: globalOwnerRole });

	await Reset.run();

	const user = await Db.collections.User.findOneBy({ globalRoleId: globalOwnerRole.id });

	if (!user) {
		fail('No owner found after DB reset to default user state');
	}

	expect(user.email).toBeNull();
	expect(user.firstName).toBeNull();
	expect(user.lastName).toBeNull();
	expect(user.password).toBeNull();
	expect(user.resetPasswordToken).toBeNull();
	expect(user.resetPasswordTokenExpiration).toBeNull();
	expect(user.personalizationAnswers).toBeNull();
});
