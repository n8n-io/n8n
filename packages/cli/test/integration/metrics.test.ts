import { setupTestServer } from './shared/utils';
import config from '@/config';
import request from 'supertest';

config.set('endpoints.metrics.enable', true);
config.set('endpoints.metrics.includeDefaultMetrics', true);
const testServer = setupTestServer({ endpointGroups: ['metrics'] });

let testAgent = request.agent(testServer.app);

describe('Metrics', () => {
	it('should return metrics', async () => {
		const response = await testAgent.get('/metrics');
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		const lines = response.text.trim().split('\n');
		expect(lines).toContain('nodejs_heap_space_size_total_bytes{space="read_only"} 0');
	});
});
