import { Container } from 'typedi';
import { parse as semverParse } from 'semver';
import request from 'supertest';

import config from '@/config';
import { N8N_VERSION } from '@/constants';
import { MetricsService } from '@/services/metrics.service';
import { ExecutionRecoveryService } from '@/executions/execution-recovery.service';

import { setupTestServer } from './shared/utils';
import { mockInstance } from '../shared/mocking';

mockInstance(ExecutionRecoveryService);
jest.unmock('@/eventbus/MessageEventBus/MessageEventBus');
config.set('endpoints.metrics.enable', true);
config.set('endpoints.metrics.includeDefaultMetrics', false);
config.set('endpoints.metrics.prefix', 'n8n_test_');
const testServer = setupTestServer({ endpointGroups: ['metrics'] });

let testAgent = request.agent(testServer.app);

async function getMetricsResponseAsLines() {
	const response = await testAgent.get('/metrics');
	expect(response.status).toEqual(200);
	expect(response.type).toEqual('text/plain');

	const lines = response.text.trim().split('\n');
	return lines;
}

describe('Metrics', () => {
	it('should return n8n version', async () => {
		const n8nVersion = semverParse(N8N_VERSION || '0.0.0');
		expect(n8nVersion).toBeTruthy();
		const lines = await getMetricsResponseAsLines();
		expect(lines).toContain(
			`n8n_test_version_info{version="v${n8nVersion!.version}",major="${
				n8nVersion!.major
			}",minor="${n8nVersion!.minor}",patch="${n8nVersion!.patch}"} 1`,
		);
	});

	it('should return cache metrics when enabled', async () => {
		config.set('endpoints.metrics.includeCacheMetrics', true);
		await Container.get(MetricsService).configureMetrics(testServer.app);
		const lines = await getMetricsResponseAsLines();
		expect(lines).toContain('n8n_test_cache_hits_total 0');
		expect(lines).toContain('n8n_test_cache_misses_total 0');
		expect(lines).toContain('n8n_test_cache_updates_total 0');
	});

	// TODO: Commented out due to flakiness in CI
	// it('should return event metrics when enabled', async () => {
	// 	config.set('endpoints.metrics.includeMessageEventBusMetrics', true);
	// 	await Container.get(MetricsService).configureMetrics(testServer.app);
	// 	await eventBus.initialize();
	// 	await eventBus.send(
	// 		new EventMessageGeneric({
	// 			eventName: 'n8n.destination.test',
	// 		}),
	// 	);
	// 	const lines = await getMetricsResponseAsLines();
	// 	expect(lines).toContain('n8n_test_destination_test_total 1');
	// 	await eventBus.close();
	// 	jest.mock('@/eventbus/MessageEventBus/MessageEventBus');
	// });

	it('should return default metrics', async () => {
		config.set('endpoints.metrics.includeDefaultMetrics', true);
		await Container.get(MetricsService).configureMetrics(testServer.app);
		const lines = await getMetricsResponseAsLines();
		expect(lines).toContain('nodejs_heap_space_size_total_bytes{space="read_only"} 0');
		config.set('endpoints.metrics.includeDefaultMetrics', false);
	});

	it('should not return default metrics only when disabled', async () => {
		config.set('endpoints.metrics.includeDefaultMetrics', false);
		await Container.get(MetricsService).configureMetrics(testServer.app);
		const lines = await getMetricsResponseAsLines();
		expect(lines).not.toContain('nodejs_heap_space_size_total_bytes{space="read_only"} 0');
		config.set('endpoints.metrics.includeDefaultMetrics', true);
	});
});
