require('leaked-handles');
import express = require('express');


import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import { InternalHooksClass } from '../../src/InternalHooks';
import { IDiagnosticInfo, InternalHooksManager } from '../../src';
import * as os from 'os';

let app: express.Application;
let testDbName = '';

beforeAll(async () => {
	app = utils.initTestServer({ endpointGroups: [], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	utils.initTestLogger();
	// utils.initTestTelemetry();

	// await InternalHooksManager.getInstance().onServerStarted({});
	// console.log(InternalHooksManager.getInstance());
});

beforeEach(async () => {
	// await testDb.createOwnerShell();
});

afterEach(async () => {
	// await testDb.truncate(['User'], testDbName);
});

afterAll(async () => {
	console.log('Stopping...');
	// await InternalHooksManager.getInstance().onN8nStop();
	// console.log(InternalHooksManager.getInstance());
	await testDb.terminate(testDbName);
});

test('Dummy test', async () => {
	expect(true).toBe(true);
});
