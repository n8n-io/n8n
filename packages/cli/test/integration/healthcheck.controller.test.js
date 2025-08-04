'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const utils_1 = require('@test-integration/utils');
const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['health'] });
describe('HealthcheckController', () => {
	it('should return ok when DB is connected and migrated', async () => {
		const response = await testServer.restlessAgent.get('/healthz/readiness');
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});
	it('should return error when DB is not connected', async () => {
		await backend_test_utils_1.testDb.terminate();
		const response = await testServer.restlessAgent.get('/healthz/readiness');
		expect(response.statusCode).toBe(503);
		expect(response.body).toEqual({ status: 'error' });
	});
});
//# sourceMappingURL=healthcheck.controller.test.js.map
