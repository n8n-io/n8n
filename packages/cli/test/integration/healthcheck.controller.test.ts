import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { setupTestServer } from '@test-integration/utils';

const originalHealthEndpoint = Container.get(GlobalConfig).endpoints.health;

// Use custom test value to prove configuration is respected
Container.get(GlobalConfig).endpoints.health = 'internal/health';

const testServer = setupTestServer({ endpointGroups: ['health'] });

describe('HealthcheckController', () => {
	afterAll(() => {
		Container.get(GlobalConfig).endpoints.health = originalHealthEndpoint;
	});

	it('should return ok when DB is connected and migrated', async () => {
		const response = await testServer.restlessAgent.get('/internal/health/readiness');

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it('should return error when DB is not connected', async () => {
		await testDb.terminate();

		const response = await testServer.restlessAgent.get('/internal/health/readiness');

		expect(response.statusCode).toBe(503);
		expect(response.body).toEqual({ status: 'error' });
	});
});
