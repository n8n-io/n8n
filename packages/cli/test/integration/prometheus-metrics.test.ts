import { Container } from 'typedi';
import { parse as semverParse } from 'semver';
import request, { type Response } from 'supertest';

import config from '@/config';
import { N8N_VERSION } from '@/constants';
import { PrometheusMetricsService } from '@/metrics/prometheus-metrics.service';
import { setupTestServer } from './shared/utils';

jest.unmock('@/eventbus/MessageEventBus/MessageEventBus');

const toLines = (response: Response) => response.text.trim().split('\n');

config.set('endpoints.metrics.enable', true);
config.set('endpoints.metrics.prefix', 'n8n_test_');

const server = setupTestServer({ endpointGroups: ['metrics'] });
const agent = request.agent(server.app);

let prometheusService: PrometheusMetricsService;

describe('Metrics', () => {
	beforeAll(() => {
		prometheusService = Container.get(PrometheusMetricsService);
	});

	beforeEach(() => {
		prometheusService.disableAllMetrics();
		prometheusService.disableAllLabels();
	});

	it('should return n8n version', async () => {
		/**
		 * Arrange
		 */
		await prometheusService.init(server.app);

		/**
		 * Act
		 */
		const response = await agent.get('/metrics');

		/**
		 * Assert
		 */
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		const n8nVersion = semverParse(N8N_VERSION);

		if (!n8nVersion) fail('Failed to parse n8n version');

		const { version, major, minor, patch } = n8nVersion;

		const lines = toLines(response);

		expect(lines).toContain(
			`n8n_test_version_info{version="v${version}",major="${major}",minor="${minor}",patch="${patch}"} 1`,
		);
	});

	it('should return default metrics if enabled', async () => {
		/**
		 * Arrange
		 */
		prometheusService.enableMetric('default');
		await prometheusService.init(server.app);

		/**
		 * Act
		 */
		const response = await agent.get('/metrics');

		/**
		 * Assert
		 */
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		const lines = toLines(response);

		expect(lines).toContain('n8n_test_nodejs_heap_space_size_total_bytes{space="read_only"} 0');
	});

	it('should not return default metrics if disabled', async () => {
		/**
		 * Arrange
		 */
		prometheusService.disableMetric('default');
		await prometheusService.init(server.app);

		/**
		 * Act
		 */
		const response = await agent.get('/metrics');

		/**
		 * Assert
		 */
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');
		expect(toLines(response)).not.toContain(
			'nodejs_heap_space_size_total_bytes{space="read_only"} 0',
		);
	});

	it('should return cache metrics if enabled', async () => {
		/**
		 * Arrange
		 */
		prometheusService.enableMetric('cache');
		await prometheusService.init(server.app);

		/**
		 * Act
		 */
		const response = await agent.get('/metrics');

		/**
		 * Assert
		 */
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		const lines = toLines(response);

		expect(lines).toContain('n8n_test_cache_hits_total 0');
		expect(lines).toContain('n8n_test_cache_misses_total 0');
		expect(lines).toContain('n8n_test_cache_updates_total 0');
	});

	it('should not return cache metrics if disabled', async () => {
		/**
		 * Arrange
		 */
		await prometheusService.init(server.app);

		/**
		 * Act
		 */
		const response = await agent.get('/metrics');

		/**
		 * Assert
		 */
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		const lines = toLines(response);

		expect(lines).not.toContain('n8n_test_cache_hits_total 0');
		expect(lines).not.toContain('n8n_test_cache_misses_total 0');
		expect(lines).not.toContain('n8n_test_cache_updates_total 0');
	});

	it('should return route metrics if enabled', async () => {
		/**
		 * Arrange
		 */
		prometheusService.enableMetric('routes');
		await prometheusService.init(server.app);
		await agent.get('/api/v1/workflows');

		/**
		 * Act
		 */
		const response = await agent.get('/metrics');

		/**
		 * Assert
		 */
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		const lines = toLines(response);

		expect(lines).toContain('n8n_test_http_request_duration_seconds_count 1');
		expect(lines).toContainEqual(
			expect.stringContaining('n8n_test_http_request_duration_seconds_sum'),
		);
		expect(lines).toContainEqual(
			expect.stringContaining('n8n_test_http_request_duration_seconds_bucket'),
		);
	});

	it('should return labels in route metrics if enabled', async () => {
		/**
		 * ARrange
		 */
		prometheusService.enableMetric('routes');
		prometheusService.enableLabels(['apiMethod', 'apiPath', 'apiStatusCode']);
		await prometheusService.init(server.app);
		await agent.get('/webhook-test/some-uuid');

		/**
		 * Act
		 */
		const response = await agent.get('/metrics');

		/**
		 * Assert
		 */
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		const lines = toLines(response);

		expect(lines).toContainEqual(expect.stringContaining('method="GET"'));
		expect(lines).toContainEqual(expect.stringContaining('path="/webhook-test/some-uuid"'));
		expect(lines).toContainEqual(expect.stringContaining('status_code="404"'));
	});
});
