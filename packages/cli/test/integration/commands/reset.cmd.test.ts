import { execSync } from 'child_process';

import express from 'express';
import path from 'path';

import { Db } from '../../../src';
import * as utils from '../shared/utils';
import type { Role } from '../../../src/databases/entities/Role';
import * as testDb from '../shared/testDb';
import { randomEmail, randomName, randomValidPassword } from '../shared/random';

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;

beforeAll(async () => {
	app = utils.initTestServer({ endpointGroups: ['owner'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('user-management:reset should reset DB to default user state', async () => {
	await testDb.createUser({ globalRole: globalOwnerRole });

	const command = [path.join('bin', 'n8n'), 'user-management:reset'].join(' ');

	execSync(command);

	const user = await Db.collections.User.findOne();

	expect(user?.email).toBeNull();
	expect(user?.firstName).toBeNull();
	expect(user?.lastName).toBeNull();
	expect(user?.password).toBeNull();
	expect(user?.resetPasswordToken).toBeNull();
	expect(user?.resetPasswordTokenExpiration).toBeNull();
	expect(user?.personalizationAnswers).toBeNull();
});
