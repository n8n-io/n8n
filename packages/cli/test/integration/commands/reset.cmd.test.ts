import express from 'express';

import { Db } from '../../../src';
import { Reset } from '../../../commands/user-management/reset';
import * as utils from '../shared/utils';
import * as testDb from '../shared/testDb';
import type { Role } from '../../../src/databases/entities/Role';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['owner'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();
});

beforeEach(async () => {
	await testDb.truncate(['User'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('user-management:reset should reset DB to default user state', async () => {
	await testDb.createUser({ globalRole: globalOwnerRole });

	await Reset.run();

	const user = await Db.collections.User.findOne({ globalRole: globalOwnerRole });

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
