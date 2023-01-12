import express from 'express';

import * as Db from '@/Db';
import { Reset } from '@/commands/user-management/reset';
import type { Role } from '@db/entities/Role';
import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';

let app: express.Application;
let globalOwnerRole: Role;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['owner'], applyAuth: true });
	await testDb.init();

	globalOwnerRole = await testDb.getGlobalOwnerRole();
});

beforeEach(async () => {
	await testDb.truncate(['User']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('user-management:reset should reset DB to default user state', async () => {
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
