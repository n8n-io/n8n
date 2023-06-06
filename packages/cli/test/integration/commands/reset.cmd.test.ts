import * as Db from '@/Db';
import { Reset } from '@/commands/user-management/reset';
import * as testDb from '../shared/testDb';
import { mockInstance } from '../shared/utils';
import { InternalHooks } from '@/InternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import { ROLES } from '@/constants';

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
	await testDb.createUser({ role: ROLES.GLOBAL_OWNER });

	await Reset.run();

	const user = await Db.collections.User.findOneBy({ role: ROLES.GLOBAL_OWNER });

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
