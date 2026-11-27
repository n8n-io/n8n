/**
 * Contract tests for `HttpApiV1`. See v1-ownership.contract.integration.test.ts.
 *
 * The startup test covers the route plumbing end to end. This test pins what
 * n8n's own middlewares decide for callers that the startup test cannot create.
 */
import type { Person } from '@n8n/db';
import { Container } from '@n8n/di';
import type { HooksApiV1 } from '@n8n/hooks-api';

import { ExternalHooks } from '@/external-hooks';
import { HooksApiService } from '@/hooks-api/hooks-api.service';
import { PublicHttpService } from '@/hooks-api/v1/public-http.service';
import { createMember, createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const testServer = setupTestServer({});

let api: HooksApiV1;
let owner: Person;
let member: Person;

// The test agents prefix every path with `/rest`. The path is arbitrary for the contract.
const PATH = '/hooks-api-test/admin';

beforeAll(async () => {
	Container.get(ExternalHooks).registerFunctions.push(async (hooksApi) => {
		if (!hooksApi.v1) throw new Error('V1 is not offered');
		api = hooksApi.v1;
	});
	await Container.get(HooksApiService).register();

	const http = api.http;
	if (!http) throw new Error('HTTP API is not offered on main');
	http.registerRoute({
		method: 'get',
		path: `/rest${PATH}`,
		middlewares: [
			http.middlewares.sessionAuthentication,
			http.middlewares.requireGlobalScope('user:create'),
		],
		handler: async ({ security }) => ({ status: 200, body: security }),
	});
	testServer.app.use(Container.get(PublicHttpService).router);

	owner = await createOwner();
	member = await createMember();
});

describe('HttpApiV1 contract', () => {
	it('reports version 1', () => {
		expect(api.http?.version).toBe(1);
	});

	describe('sessionAuthentication and requireGlobalScope', () => {
		it('answers 401 without an n8n session', async () => {
			await testServer.authlessAgent.get(PATH).expect(401);
		});

		it('answers 403 for a user without the scope', async () => {
			await testServer.authAgentFor(member).get(PATH).expect(403);
		});

		it('passes a user with the scope as the subject of the security context', async () => {
			const response = await testServer.authAgentFor(owner).get(PATH).expect(200);

			expect(response.body).toEqual({
				subject: {
					id: owner.id,
					type: 'person',
					email: owner.email,
					firstName: owner.firstName,
					lastName: owner.lastName,
				},
				authMethod: 'session-cookie',
			});
		});
	});
});
