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
	test('reports editor_ui when the caller sends the editor UI marker header', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		const response = await authOwnerAgent.get('/discover').set('x-n8n-client', 'editor-ui');

		expect(response.statusCode).toBe(200);
		expect(emit).toHaveBeenCalledWith(
			'public-api-invoked',
			expect.objectContaining({ userId: owner.id, client: 'editor_ui' }),
		);
	});

	test('reports other when the caller sends no marker header', async () => {
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		const response = await authOwnerAgent.get('/discover');

		expect(response.statusCode).toBe(200);
		expect(emit).toHaveBeenCalledWith(
			'public-api-invoked',
			expect.objectContaining({ userId: owner.id, client: 'other' }),
		);
	});
});
