import type { User } from '@n8n/db';

import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let authOwnerAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'], basePath: '/n8n' });

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
});

beforeEach(() => {
	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

describe('Public API base path', () => {
	test('should route requests through the base-path-prefixed OpenAPI server path', async () => {
		const response = await authOwnerAgent.get('/discover');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.resources).toBeDefined();
	});
});
