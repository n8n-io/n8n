import type { User } from '@n8n/db';

import { createMemberWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let member: User;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeAll(async () => {
	member = await createMemberWithApiKey();
});

beforeEach(() => {
	authMemberAgent = testServer.publicApiAgentFor(member);
});

describe('paths and methods the public API does not serve', () => {
	test('returns 404 for an unknown path with a valid API key', async () => {
		const response = await authMemberAgent.get('/this-path-does-not-exist');

		expect(response.statusCode).toBe(404);
		expect(response.body).toEqual({ message: 'not found' });
	});

	test('returns 404 for an unknown path without an API key', async () => {
		const response = await testServer
			.publicApiAgentWithoutApiKey()
			.get('/this-path-does-not-exist');

		expect(response.statusCode).toBe(404);
		expect(response.body).toEqual({ message: 'not found' });
	});

	test('returns 405 for a known path with a method it does not serve', async () => {
		const response = await authMemberAgent.put('/tags');

		expect(response.statusCode).toBe(405);
		expect(response.body).toEqual({ message: 'PUT method not allowed' });
	});

	test('returns 405 before authentication for a known path with an unserved method', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().put('/tags');

		expect(response.statusCode).toBe(405);
		expect(response.body).toEqual({ message: 'PUT method not allowed' });
	});

	test('returns 401 for a served route without an API key', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().get('/tags');

		expect(response.statusCode).toBe(401);
	});
});
