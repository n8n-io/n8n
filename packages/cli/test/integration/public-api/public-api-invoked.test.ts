import { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { Telemetry } from '@/telemetry';

import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(Telemetry);

let owner: User;
let authOwnerAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
});

beforeEach(() => {
	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('public-api-invoked event', () => {
	test('reports api_key when the caller sends an API key', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		const response = await authOwnerAgent.get('/discover');

		expect(response.statusCode).toBe(200);
		expect(emit).toHaveBeenCalledWith(
			'public-api-invoked',
			expect.objectContaining({ userId: owner.id, authType: 'api_key' }),
		);
	});

	test('reports session_cookie when the caller sends the browser session cookie', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		const response = await testServer.publicApiAgentWithCookie(owner).get('/discover');

		expect(response.statusCode).toBe(200);
		expect(emit).toHaveBeenCalledWith(
			'public-api-invoked',
			expect.objectContaining({ userId: owner.id, authType: 'session_cookie' }),
		);
	});
});
