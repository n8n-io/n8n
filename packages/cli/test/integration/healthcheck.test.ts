import * as testDb from './shared/test-db';
import { setupTestServer } from '@test-integration/utils';

const testServer = setupTestServer({ endpointGroups: ['health'] });

describe('DB health check', () => {
	it('should return ok when DB is connected and migrated', async () => {
		const response = await testServer.restlessAgent.get('/healthz/db');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it('should return error when DB is not connected', async () => {
		await testDb.terminate();

		const response = await testServer.restlessAgent.get('/healthz/db');

		expect(response.statusCode).toBe(500);
		expect(response.body).toEqual({ status: 'error' });
	});
});
