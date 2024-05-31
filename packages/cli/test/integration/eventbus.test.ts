import type { User } from '@db/entities/User';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { ExecutionDataRecoveryService } from '@/eventbus/executionDataRecovery.service';

import * as utils from './shared/utils/';
import { createUser } from './shared/db/users';
import { mockInstance } from '../shared/mocking';
import type { SuperAgentTest } from './shared/types';

/**
 * NOTE: due to issues with mocking the MessageEventBus in multiple tests running in parallel,
 * the event bus tests are run in the eventbus.ee.test.ts file
 * The tests in this file are only checking endpoint permissions.
 */

let owner: User;
let authOwnerAgent: SuperAgentTest;

mockInstance(MessageEventBus);
mockInstance(ExecutionDataRecoveryService);
const testServer = utils.setupTestServer({
	endpointGroups: ['eventBus'],
	enabledFeatures: [], // do not enable logstreaming
});

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	authOwnerAgent = testServer.authAgentFor(owner);
});

describe('GET /eventbus/destination', () => {
	test('should fail due to missing authentication', async () => {
		const response = await testServer.authlessAgent.get('/eventbus/destination');
		expect(response.statusCode).toBe(401);
	});

	test('should fail due to missing license when authenticated', async () => {
		const response = await authOwnerAgent.get('/eventbus/destination');
		expect(response.statusCode).toBe(403);
	});
});

describe('POST /eventbus/destination', () => {
	test('should fail due to missing authentication', async () => {
		const response = await testServer.authlessAgent.post('/eventbus/destination');
		expect(response.statusCode).toBe(401);
	});

	test('should fail due to missing license when authenticated', async () => {
		const response = await authOwnerAgent.post('/eventbus/destination');
		expect(response.statusCode).toBe(403);
	});
});

describe('DELETE /eventbus/destination', () => {
	test('should fail due to missing authentication', async () => {
		const response = await testServer.authlessAgent.del('/eventbus/destination');
		expect(response.statusCode).toBe(401);
	});

	test('should fail due to missing license when authenticated', async () => {
		const response = await authOwnerAgent.del('/eventbus/destination');
		expect(response.statusCode).toBe(403);
	});
});
