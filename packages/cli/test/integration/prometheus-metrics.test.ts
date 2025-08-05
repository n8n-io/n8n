import { createWorkflow, newWorkflow } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';
import { parse as semverParse } from 'semver';
import request, { type Response } from 'supertest';

import config from '@/config';
import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';
import { PrometheusMetricsService } from '@/metrics/prometheus-metrics.service';
import { CacheService } from '@/services/cache/cache.service';

import { setupTestServer } from './shared/utils';

jest.unmock('@/eventbus/message-event-bus/message-event-bus');

const toLines = (response: Response) => response.text.trim().split('\n');

const eventService = Container.get(EventService);
const globalConfig = Container.get(GlobalConfig);
globalConfig.cache.backend = 'memory';
globalConfig.endpoints.metrics = {
	enable: true,
	prefix: 'n8n_test_',
	includeDefaultMetrics: true,
	includeApiEndpoints: true,
	includeCacheMetrics: true,
	includeMessageEventBusMetrics: true,
	includeCredentialTypeLabel: false,
	includeNodeTypeLabel: false,
	includeWorkflowIdLabel: false,
	includeWorkflowNameLabel: false,
	includeApiPathLabel: true,
	includeApiMethodLabel: true,
	includeApiStatusCodeLabel: true,
	includeQueueMetrics: true,
	queueMetricsInterval: 20,
	activeWorkflowCountInterval: 60,
};

const server = setupTestServer({ endpointGroups: ['metrics'] });
const agent = request.agent(server.app);

let prometheusService: PrometheusMetricsService;

describe('PrometheusMetricsService', () => {
	beforeAll(() => {
		prometheusService = Container.get(PrometheusMetricsService);
	});

	beforeEach(() => {
		prometheusService.disableAllMetrics();
		prometheusService.disableAllLabels();
	});

	afterEach(() => {
		// Make sure fake timers aren't in effect after a test
		jest.useRealTimers();
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

	it('should include last activity metric with route metrics', async () => {
		/**
		 * Arrange
		 */
		const startTime = DateTime.now().toUnixInteger();
		jest.useFakeTimers().setSystemTime(startTime * 1000);

		prometheusService.enableMetric('routes');
		await prometheusService.init(server.app);

		/**
		 * Act
		 */
		let response = await agent.get('/metrics');

		/**
		 * Assert
		 */
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		const lines = toLines(response);

		expect(lines).toContainEqual(expect.stringContaining('n8n_test_last_activity'));

		const lastActivityLine = lines.find((line) => line.startsWith('n8n_test_last_activity'));

		expect(lastActivityLine).toBeDefined();

		const value = lastActivityLine!.split(' ')[1];

		expect(parseInt(value, 10)).toBe(startTime);

		// Update last activity
		jest.advanceTimersByTime(1000);
		await agent.get('/api/v1/workflows');

		response = await agent.get('/metrics');
		const updatedLines = toLines(response);

		const newLastActivityLine = updatedLines.find((line) =>
			line.startsWith('n8n_test_last_activity'),
		);

		expect(newLastActivityLine).toBeDefined();

		const newValue = newLastActivityLine!.split(' ')[1];

		expect(parseInt(newValue, 10)).toBe(startTime + 1);
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

	it('should return queue metrics if enabled', async () => {
		/**
		 * Arrange
		 */
		prometheusService.enableMetric('queue');
		config.set('executions.mode', 'queue');
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

		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_waiting 0');
		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_active 0');
		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_completed 0');
		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_failed 0');
	});

	it('should set queue metrics in response to `job-counts-updated` event', async () => {
		/**
		 * Arrange
		 */
		prometheusService.enableMetric('queue');
		config.set('executions.mode', 'queue');
		await prometheusService.init(server.app);

		/**
		 * Act
		 */
		eventService.emit('job-counts-updated', { waiting: 1, active: 2, completed: 0, failed: 0 });

		/**
		 * Assert
		 */
		const response = await agent.get('/metrics');

		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		const lines = toLines(response);

		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_waiting 1');
		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_active 2');
		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_completed 0');
		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_failed 0');
	});

	it('should return active workflow count', async () => {
		await prometheusService.init(server.app);

		let response = await agent.get('/metrics');

		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		let lines = toLines(response);

		expect(lines).toContain('n8n_test_active_workflow_count 0');

		const workflow = newWorkflow({ active: true });
		await createWorkflow(workflow);

		const workflowRepository = Container.get(WorkflowRepository);
		const activeWorkflowCount = await workflowRepository.getActiveCount();

		expect(activeWorkflowCount).toBe(1);

		response = await agent.get('/metrics');

		lines = toLines(response);

		// Should return cached value
		expect(lines).toContain('n8n_test_active_workflow_count 0');

		const cacheService = Container.get(CacheService);
		await cacheService.delete('metrics:active-workflow-count');

		response = await agent.get('/metrics');

		lines = toLines(response);

		expect(lines).toContain('n8n_test_active_workflow_count 1');
	});
});
