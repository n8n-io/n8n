import { createActiveWorkflow } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';
import { parse as semverParse } from 'semver';
import request, { type Response } from 'supertest';

import type { IRun, IWorkflowBase } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';
import { CacheService } from '@/services/cache/cache.service';

import { setupTestServer } from './shared/utils';

jest.unmock('@/eventbus/message-event-bus/message-event-bus');

const toLines = (response: Response) => response.text.trim().split('\n');

const eventService = Container.get(EventService);
const globalConfig = Container.get(GlobalConfig);
globalConfig.cache.backend = 'memory';
Object.assign(globalConfig.endpoints.metrics, {
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
	includeWorkflowExecutionDuration: true,
	queueMetricsInterval: 20,
	activeWorkflowCountInterval: 60,
	includeWorkflowStatistics: true,
	workflowStatisticsInterval: 300,
	includeExecutionDataMetrics: true,
});
globalConfig.executions.mode = 'queue';

const server = setupTestServer({ endpointGroups: ['metrics'] });
const agent = request.agent(server.app);

describe('PrometheusMetricsService', () => {
	afterEach(() => {
		// Make sure fake timers aren't in effect after a test
		jest.useRealTimers();
	});

	it('should return n8n version', async () => {
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

	it('should return cache metrics if enabled', async () => {
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

		expect(lines).toContainEqual(expect.stringContaining('n8n_test_cache_hits_total'));
		expect(lines).toContainEqual(expect.stringContaining('n8n_test_cache_misses_total'));
		expect(lines).toContainEqual(expect.stringContaining('n8n_test_cache_updates_total'));
	});

	it('should return route metrics if enabled', async () => {
		/**
		 * Arrange
		 */
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

		expect(lines).toContainEqual(
			expect.stringContaining('n8n_test_http_request_duration_seconds_count'),
		);
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

		// A request to a tracked path updates last_activity to the current (fake) time
		await agent.get('/api/v1/workflows');

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
		 * Arrange
		 */
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

	it('should return workflow execution duration histogram after event', async () => {
		/**
		 * Act
		 */
		eventService.emit('workflow-post-execute', {
			executionId: 'exec_123',
			workflow: { id: 'wf_1', name: 'Test' } as IWorkflowBase,
			runData: {
				startedAt: new Date('2026-01-01T00:00:00Z'),
				stoppedAt: new Date('2026-01-01T00:00:02Z'),
				status: 'success',
				mode: 'trigger',
			} as IRun,
		});

		/**
		 * Assert
		 */
		const response = await agent.get('/metrics');

		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		const lines = toLines(response);

		expect(lines).toContainEqual(
			expect.stringContaining('n8n_test_workflow_execution_duration_seconds_bucket'),
		);
		expect(lines).toContainEqual(
			expect.stringContaining('n8n_test_workflow_execution_duration_seconds_sum'),
		);
		expect(lines).toContainEqual(
			expect.stringContaining('n8n_test_workflow_execution_duration_seconds_count'),
		);
	});

	it('should return active workflow count', async () => {
		let response = await agent.get('/metrics');

		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');

		let lines = toLines(response);

		expect(lines).toContain('n8n_test_active_workflow_count 0');

		await createActiveWorkflow({});

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

	it('should return workflow statistics metrics if enabled', async () => {
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

		expect(lines).toContainEqual(expect.stringContaining('n8n_test_production_executions'));
		expect(lines).toContainEqual(expect.stringContaining('n8n_test_production_root_executions'));
		expect(lines).toContainEqual(expect.stringContaining('n8n_test_manual_executions'));
		expect(lines).toContainEqual(expect.stringContaining('n8n_test_enabled_users'));
		expect(lines).toContainEqual(expect.stringContaining('n8n_test_users'));
		expect(lines).toContainEqual(expect.stringContaining('n8n_test_workflows'));
		expect(lines).toContainEqual(expect.stringContaining('n8n_test_credentials'));
	});

	it('should return execution data metrics if enabled', async () => {
		const response = await agent.get('/metrics');

		expect(response.status).toEqual(200);

		const lines = toLines(response);

		expect(lines).toContain('n8n_test_execution_data_reads_total{mode="db",result="success"} 0');
		expect(lines).toContain('n8n_test_execution_data_writes_total{mode="fs",result="failure"} 0');
		expect(lines).toContain('n8n_test_execution_data_unreadable_bundles_total{mode="db"} 0');

		expect(
			lines.some((l) => /^n8n_test_execution_data_storage_mode\{mode="(db|fs)"\} 1$/.test(l)),
		).toBe(true);
	});
});
