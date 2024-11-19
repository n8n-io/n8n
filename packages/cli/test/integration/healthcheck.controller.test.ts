import { setupTestServer } from '@test-integration/utils';

import * as testDb from './shared/test-db';

const testServer = setupTestServer({ endpointGroups: ['health'] });

describe('HealthcheckController', () => {
	it('should return ok when DB is connected and migrated', async () => {
		const response = await testServer.restlessAgent.get('/healthz/readiness');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it('should return error when DB is not connected', async () => {
		await testDb.terminate();

		const response = await testServer.restlessAgent.get('/healthz/readiness');

		expect(response.statusCode).toBe(503);
		expect(response.body).toEqual({ status: 'error' });
	});
});
