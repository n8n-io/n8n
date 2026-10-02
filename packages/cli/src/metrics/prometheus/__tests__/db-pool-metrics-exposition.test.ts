import { Logger } from '@n8n/backend-common';
import type { CacheService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { DatabaseConfig, GlobalConfig } from '@n8n/config';
import { DbConnection, DbConnectionMetrics, type WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import promClient from 'prom-client';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { AbstractServer } from '@/abstract-server';
import { DatabaseIndependentRoutes } from '@/services/database-independent-routes.service';

import { PrometheusActiveWorkflowMetricsService } from '../active-workflow-metrics.service';
import type { PrometheusCacheMetricsService } from '../cache-metrics.service';
import { CachedMetricQueryFactory } from '../cached-metric-query';
import { PrometheusDbPoolMetricsService } from '../db-pool-metrics.service';
import type { PrometheusDefaultMetricsService } from '../default-metrics.service';
import type { PrometheusDnsCacheMetricsService } from '../dns-cache-metrics.service';
import type { PrometheusEncryptionMetricsService } from '../encryption-metrics.service';
import type { PrometheusEventBusMetricsService } from '../event-bus-metrics.service';
import type { PrometheusExecutionDataMetricsService } from '../execution-data-metrics.service';
import type { PrometheusInstanceAiMetricsService } from '../instance-ai-metrics.service';
import type { PrometheusInstanceRoleMetricsService } from '../instance-role-metrics.service';
import type { PrometheusMcpPostSaveMetricsService } from '../mcp-post-save-metrics.service';
import type { PrometheusPollTriggerMetricsService } from '../poll-trigger-metrics.service';
import { PrometheusMetricsService } from '../prometheus.service';
import type { PrometheusPssMetricsService } from '../pss-metrics.service';
import type { PrometheusQueueMetricsService } from '../queue-metrics.service';
import type { PrometheusRouteMetricsService } from '../route-metrics.service';
import type { PrometheusSchedulerMetricsService } from '../scheduler-metrics.service';
import type { PrometheusSsrfMetricsService } from '../ssrf-metrics.service';
import type { PrometheusSystemTaskMetricsService } from '../system-task-metrics.service';
import type { PrometheusTokenExchangeMetricsService } from '../token-exchange-metrics.service';
import type { PrometheusVersionMetricsService } from '../version-metrics.service';
import type { PrometheusWebhookAndFormMetricsService } from '../webhook-and-form-metrics.service';
import type { PrometheusWorkflowExecutionDurationMetricsService } from '../workflow-execution-duration-metrics.service';
import type { PrometheusWorkflowInfoMetricsService } from '../workflow-info-metrics.service';
import type { PrometheusWorkflowPublicationMetricsService } from '../workflow-publication-metrics.service';
import type { PrometheusWorkflowStatisticsMetricsService } from '../workflow-statistics-metrics.service';

class TestServer extends AbstractServer {}

describe('database pool metrics exposition', () => {
	const dbConnection = mockInstance(DbConnection, {
		connectionState: { connected: true, migrated: true },
	});
	const workflowRepository = mock<WorkflowRepository>();
	const cacheService = mock<CacheService>();
	const disabledCollectors = {
		cache: mock<PrometheusCacheMetricsService>({ enabled: false }),
		eventBus: mock<PrometheusEventBusMetricsService>({ enabled: false }),
		queue: mock<PrometheusQueueMetricsService>({ enabled: false }),
		route: mock<PrometheusRouteMetricsService>({ enabled: false }),
		instanceRole: mock<PrometheusInstanceRoleMetricsService>({ enabled: false }),
		workflowExecutionDuration: mock<PrometheusWorkflowExecutionDurationMetricsService>({
			enabled: false,
		}),
		workflowStatistics: mock<PrometheusWorkflowStatisticsMetricsService>({ enabled: false }),
		executionData: mock<PrometheusExecutionDataMetricsService>({ enabled: false }),
		pss: mock<PrometheusPssMetricsService>({ enabled: false }),
		version: mock<PrometheusVersionMetricsService>({ enabled: false }),
		defaultMetrics: mock<PrometheusDefaultMetricsService>({ enabled: false }),
		tokenExchange: mock<PrometheusTokenExchangeMetricsService>({ enabled: false }),
		ssrf: mock<PrometheusSsrfMetricsService>({ enabled: false }),
		dnsCache: mock<PrometheusDnsCacheMetricsService>({ enabled: false }),
		webhook: mock<PrometheusWebhookAndFormMetricsService>({ enabled: false }),
		workflowInfo: mock<PrometheusWorkflowInfoMetricsService>({ enabled: false }),
		instanceAi: mock<PrometheusInstanceAiMetricsService>({ enabled: false }),
		mcpPostSave: mock<PrometheusMcpPostSaveMetricsService>({ enabled: false }),
		workflowPublication: mock<PrometheusWorkflowPublicationMetricsService>({ enabled: false }),
		scheduler: mock<PrometheusSchedulerMetricsService>({ enabled: false }),
		pollTrigger: mock<PrometheusPollTriggerMetricsService>({ enabled: false }),
		encryption: mock<PrometheusEncryptionMetricsService>({ enabled: false }),
		systemTask: mock<PrometheusSystemTaskMetricsService>({ enabled: false }),
	};
	let config: GlobalConfig;
	let metrics: DbConnectionMetrics;
	let server: TestServer;

	beforeEach(() => {
		vi.clearAllMocks();
		promClient.register.clear();
		cacheService.get.mockResolvedValue(undefined);
		workflowRepository.getActiveCount.mockResolvedValue(5);
		dbConnection.connectionState.connected = true;
		dbConnection.connectionState.migrated = true;
		config = Container.get(GlobalConfig);
		config.endpoints.metrics.enable = true;
		config.endpoints.metrics.includeDbPoolMetrics = true;
		config.endpoints.metrics.prefix = 'test_';
		Container.set(GlobalConfig, config);
		Container.set(DatabaseIndependentRoutes, new DatabaseIndependentRoutes());
		metrics = new DbConnectionMetrics();
		server = new TestServer();
		server['setupHealthCheck']();
	});

	afterEach(() => {
		promClient.register.clear();
	});

	const mountMetrics = () => {
		const activeWorkflowMetrics = new PrometheusActiveWorkflowMetricsService(
			config.endpoints.metrics,
			workflowRepository,
			new CachedMetricQueryFactory(cacheService, dbConnection),
		);
		const poolMetrics = new PrometheusDbPoolMetricsService(
			config.endpoints.metrics,
			Container.get(DatabaseConfig),
			dbConnection,
			metrics,
		);
		const prometheusMetrics = new PrometheusMetricsService(
			Container.get(Logger),
			disabledCollectors.cache,
			disabledCollectors.eventBus,
			disabledCollectors.queue,
			disabledCollectors.route,
			disabledCollectors.instanceRole,
			activeWorkflowMetrics,
			disabledCollectors.workflowExecutionDuration,
			disabledCollectors.workflowStatistics,
			disabledCollectors.executionData,
			disabledCollectors.pss,
			disabledCollectors.version,
			disabledCollectors.defaultMetrics,
			disabledCollectors.tokenExchange,
			disabledCollectors.ssrf,
			disabledCollectors.dnsCache,
			disabledCollectors.webhook,
			disabledCollectors.workflowInfo,
			disabledCollectors.instanceAi,
			disabledCollectors.mcpPostSave,
			poolMetrics,
			disabledCollectors.workflowPublication,
			disabledCollectors.scheduler,
			disabledCollectors.pollTrigger,
			disabledCollectors.encryption,
			disabledCollectors.systemTask,
			Container.get(DatabaseIndependentRoutes),
		);
		prometheusMetrics.init(server.app);
	};

	it('exports both outcomes at zero and counts each completed attempt by result', async () => {
		mountMetrics();
		const initial = await request(server.app).get('/metrics').expect(200);
		expect(initial.text).toContain('test_db_pool_recovery_attempts_total{result="success"} 0');
		expect(initial.text).toContain('test_db_pool_recovery_attempts_total{result="failure"} 0');
		expect(initial.text).toContain('test_db_pool_disconnections_total 0');

		metrics.disconnectionObserver?.();
		metrics.recoveryAttemptObserver?.('failure');
		metrics.recoveryAttemptObserver?.('failure');
		metrics.recoveryAttemptObserver?.('success');

		const response = await request(server.app).get('/metrics').expect(200);
		expect(response.text).toContain('test_db_pool_recovery_attempts_total{result="failure"} 2');
		expect(response.text).toContain('test_db_pool_recovery_attempts_total{result="success"} 1');
		expect(response.text).toContain('test_db_pool_disconnections_total 1');
		expect(response.text).toContain('test_db_pool_connected 1');
	});

	it('serves recovery metrics during an outage without querying the database', async () => {
		mountMetrics();
		server.markAsReady();
		await request(server.app).get('/healthz/readiness').expect(200);

		dbConnection.connectionState.connected = false;
		cacheService.get.mockResolvedValue(undefined);

		const response = await request(server.app).get('/metrics').expect(200);
		expect(response.type).toBe('text/plain');
		expect(response.headers['content-type']).toContain('version=0.0.4');
		expect(response.text).toContain('test_db_pool_connected 0');
		expect(response.text).toMatch(/test_active_workflow_count NaN/i);
		expect(workflowRepository.getActiveCount).not.toHaveBeenCalled();
		await request(server.app).get('/healthz/readiness').expect(503);
		await request(server.app).get('/rest/workflows').expect(503);

		dbConnection.connectionState.connected = true;
		workflowRepository.getActiveCount.mockResolvedValue(5);
		const recovered = await request(server.app).get('/metrics').expect(200);
		expect(recovered.text).toContain('test_db_pool_connected 1');
		expect(recovered.text).toContain('test_active_workflow_count 5');
		await request(server.app).get('/healthz/readiness').expect(200);
	});

	it('does not register pool metrics or observers when the pool metrics flag is disabled', async () => {
		config.endpoints.metrics.includeDbPoolMetrics = false;
		mountMetrics();

		const response = await request(server.app).get('/metrics').expect(200);
		expect(response.text).not.toContain('db_pool_');
		expect(metrics.disconnectionObserver).toBeUndefined();
		expect(metrics.recoveryAttemptObserver).toBeUndefined();
	});

	it('reports startup before migrations finish', async () => {
		mountMetrics();
		dbConnection.connectionState.migrated = false;

		const response = await request(server.app).get('/metrics').expect(200);
		expect(response.text).toBe('n8n is starting up. Please wait');
	});

	it('does not bypass database readiness when metrics are disabled', async () => {
		config.endpoints.metrics.enable = false;
		dbConnection.connectionState.connected = false;

		await request(server.app).get('/metrics').expect(503);
	});

	it('does not bypass database readiness when the metrics endpoint is not mounted', async () => {
		dbConnection.connectionState.connected = false;

		await request(server.app).get('/metrics').expect(503);
	});

	it.each(['/metrics/', '/metrics?format=prometheus'])(
		'serves %s during an outage',
		async (path) => {
			mountMetrics();
			dbConnection.connectionState.connected = false;
			await request(server.app).get(path).expect(200);
		},
	);

	it('serves HEAD requests and rejects other methods during an outage', async () => {
		mountMetrics();
		dbConnection.connectionState.connected = false;

		await request(server.app).head('/metrics').expect(200);
		await request(server.app).post('/metrics').expect(503);
	});
});
