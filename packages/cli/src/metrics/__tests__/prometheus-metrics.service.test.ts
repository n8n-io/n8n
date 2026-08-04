/* eslint-disable @typescript-eslint/unbound-method -- vi mocks */
import type { Mock, Mocked } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import type express from 'express';
import { mock } from 'vitest-mock-extended';
import promClient from 'prom-client';

import type { PrometheusActiveWorkflowMetricsService } from '../prometheus/active-workflow-metrics.service';
import type { PrometheusCacheMetricsService } from '../prometheus/cache-metrics.service';
import type { PrometheusDbPoolMetricsService } from '../prometheus/db-pool-metrics.service';
import type { PrometheusDefaultMetricsService } from '../prometheus/default-metrics.service';
import type { PrometheusDnsCacheMetricsService } from '../prometheus/dns-cache-metrics.service';
import type { PrometheusEventBusMetricsService } from '../prometheus/event-bus-metrics.service';
import type { PrometheusExecutionDataMetricsService } from '../prometheus/execution-data-metrics.service';
import type { PrometheusInstanceAiMetricsService } from '../prometheus/instance-ai-metrics.service';
import type { PrometheusInstanceRoleMetricsService } from '../prometheus/instance-role-metrics.service';
import { PrometheusMetricsService } from '../prometheus/prometheus.service';
import type { PrometheusPssMetricsService } from '../prometheus/pss-metrics.service';
import type { PrometheusQueueMetricsService } from '../prometheus/queue-metrics.service';
import type { PrometheusRouteMetricsService } from '../prometheus/route-metrics.service';
import type { PrometheusSchedulerMetricsService } from '../prometheus/scheduler-metrics.service';
import type { PrometheusSsrfMetricsService } from '../prometheus/ssrf-metrics.service';
import type { PrometheusTokenExchangeMetricsService } from '../prometheus/token-exchange-metrics.service';
import type { PrometheusVersionMetricsService } from '../prometheus/version-metrics.service';
import type { PrometheusWebhookAndFormMetricsService } from '../prometheus/webhook-and-form-metrics.service';
import type { PrometheusWorkflowExecutionDurationMetricsService } from '../prometheus/workflow-execution-duration-metrics.service';
import type { PrometheusWorkflowInfoMetricsService } from '../prometheus/workflow-info-metrics.service';
import type { PrometheusWorkflowPublicationMetricsService } from '../prometheus/workflow-publication-metrics.service';
import type { PrometheusWorkflowStatisticsMetricsService } from '../prometheus/workflow-statistics-metrics.service';

vi.mock('prom-client');

describe('PrometheusMetricsService', () => {
	let logger: Mocked<Logger>;
	let app: Mocked<express.Application>;

	let cache: Mocked<PrometheusCacheMetricsService>;
	let eventBus: Mocked<PrometheusEventBusMetricsService>;
	let queue: Mocked<PrometheusQueueMetricsService>;
	let route: Mocked<PrometheusRouteMetricsService>;
	let roleInstance: Mocked<PrometheusInstanceRoleMetricsService>;
	let activeWorkflow: Mocked<PrometheusActiveWorkflowMetricsService>;
	let workflowExecutionDuration: Mocked<PrometheusWorkflowExecutionDurationMetricsService>;
	let workflowStatistics: Mocked<PrometheusWorkflowStatisticsMetricsService>;
	let executionData: Mocked<PrometheusExecutionDataMetricsService>;
	let pss: Mocked<PrometheusPssMetricsService>;
	let version: Mocked<PrometheusVersionMetricsService>;
	let defaultMetrics: Mocked<PrometheusDefaultMetricsService>;
	let tokenExchange: Mocked<PrometheusTokenExchangeMetricsService>;
	let ssrf: Mocked<PrometheusSsrfMetricsService>;
	let dnsCache: Mocked<PrometheusDnsCacheMetricsService>;
	let webhook: Mocked<PrometheusWebhookAndFormMetricsService>;
	let workflowInfo: Mocked<PrometheusWorkflowInfoMetricsService>;
	let instanceAi: Mocked<PrometheusInstanceAiMetricsService>;
	let dbPool: Mocked<PrometheusDbPoolMetricsService>;
	let workflowPublication: Mocked<PrometheusWorkflowPublicationMetricsService>;
	let scheduler: Mocked<PrometheusSchedulerMetricsService>;

	let service: PrometheusMetricsService;

	const buildService = () =>
		new PrometheusMetricsService(
			logger,
			cache,
			eventBus,
			queue,
			route,
			roleInstance,
			activeWorkflow,
			workflowExecutionDuration,
			workflowStatistics,
			executionData,
			pss,
			version,
			defaultMetrics,
			tokenExchange,
			ssrf,
			dnsCache,
			webhook,
			workflowInfo,
			instanceAi,
			dbPool,
			workflowPublication,
			scheduler,
		);

	beforeEach(() => {
		// Logger: scoped() must return a logger that also has warn/debug
		const scopedLogger = mock<Logger>();
		logger = mock<Logger>();
		logger.scoped.mockReturnValue(scopedLogger);

		app = mock<express.Application>();

		// All collectors enabled by default
		cache = mock<PrometheusCacheMetricsService>({ enabled: true });
		eventBus = mock<PrometheusEventBusMetricsService>({ enabled: true });
		queue = mock<PrometheusQueueMetricsService>({ enabled: true });
		route = mock<PrometheusRouteMetricsService>({ enabled: true });
		roleInstance = mock<PrometheusInstanceRoleMetricsService>({ enabled: true });
		activeWorkflow = mock<PrometheusActiveWorkflowMetricsService>({ enabled: true });
		workflowExecutionDuration = mock<PrometheusWorkflowExecutionDurationMetricsService>({
			enabled: true,
		});
		workflowStatistics = mock<PrometheusWorkflowStatisticsMetricsService>({ enabled: true });
		executionData = mock<PrometheusExecutionDataMetricsService>({ enabled: true });
		pss = mock<PrometheusPssMetricsService>({ enabled: true });
		version = mock<PrometheusVersionMetricsService>({ enabled: true });
		defaultMetrics = mock<PrometheusDefaultMetricsService>({ enabled: true });
		tokenExchange = mock<PrometheusTokenExchangeMetricsService>({ enabled: true });
		ssrf = mock<PrometheusSsrfMetricsService>({ enabled: true });
		dnsCache = mock<PrometheusDnsCacheMetricsService>({ enabled: true });
		webhook = mock<PrometheusWebhookAndFormMetricsService>({ enabled: true });
		workflowInfo = mock<PrometheusWorkflowInfoMetricsService>({ enabled: true });
		instanceAi = mock<PrometheusInstanceAiMetricsService>({ enabled: true });
		dbPool = mock<PrometheusDbPoolMetricsService>({ enabled: true });
		workflowPublication = mock<PrometheusWorkflowPublicationMetricsService>({ enabled: true });
		scheduler = mock<PrometheusSchedulerMetricsService>({ enabled: true });

		service = buildService();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('init', () => {
		it('should call init on all enabled collectors', () => {
			service.init(app);

			expect(cache.init).toHaveBeenCalledWith(app);
			expect(eventBus.init).toHaveBeenCalledWith(app);
			expect(queue.init).toHaveBeenCalledWith(app);
			expect(route.init).toHaveBeenCalledWith(app);
			expect(roleInstance.init).toHaveBeenCalledWith(app);
			expect(activeWorkflow.init).toHaveBeenCalledWith(app);
			expect(workflowExecutionDuration.init).toHaveBeenCalledWith(app);
			expect(workflowStatistics.init).toHaveBeenCalledWith(app);
			expect(executionData.init).toHaveBeenCalledWith(app);
			expect(pss.init).toHaveBeenCalledWith(app);
			expect(version.init).toHaveBeenCalledWith(app);
			expect(defaultMetrics.init).toHaveBeenCalledWith(app);
			expect(tokenExchange.init).toHaveBeenCalledWith(app);
			expect(ssrf.init).toHaveBeenCalledWith(app);
			expect(dnsCache.init).toHaveBeenCalledWith(app);
			expect(webhook.init).toHaveBeenCalledWith(app);
			expect(workflowInfo.init).toHaveBeenCalledWith(app);
			expect(instanceAi.init).toHaveBeenCalledWith(app);
			expect(dbPool.init).toHaveBeenCalledWith(app);
			expect(workflowPublication.init).toHaveBeenCalledWith(app);
			expect(scheduler.init).toHaveBeenCalledWith(app);
		});

		it('should NOT call init on disabled collectors', () => {
			vi.spyOn(cache, 'enabled', 'get').mockReturnValue(false);
			vi.spyOn(queue, 'enabled', 'get').mockReturnValue(false);
			vi.spyOn(pss, 'enabled', 'get').mockReturnValue(false);

			service.init(app);

			expect(cache.init).not.toHaveBeenCalled();
			expect(queue.init).not.toHaveBeenCalled();
			expect(pss.init).not.toHaveBeenCalled();

			// Still call enabled ones
			expect(version.init).toHaveBeenCalledWith(app);
			expect(eventBus.init).toHaveBeenCalledWith(app);
		});

		it('should mount GET /metrics endpoint', () => {
			service.init(app);

			expect(app.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
		});

		it('should return metrics string with correct content-type when /metrics handler is called', async () => {
			const metricsString = '# HELP n8n_version_info\nn8n_version_info 1';
			(promClient.register.metrics as Mock).mockResolvedValue(metricsString);
			vi.spyOn(promClient.register, 'contentType', 'get').mockReturnValue(
				'text/plain; version=0.0.4; charset=utf-8',
			);

			service.init(app);

			const handler = (app.get as Mock).mock.calls.find((c) => c[0] === '/metrics')?.[1];
			expect(handler).toBeDefined();

			const req = mock<express.Request>();
			const res = mock<express.Response>();
			res.send.mockReturnValue(res);

			await handler(req, res);

			expect(promClient.register.metrics).toHaveBeenCalled();
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', promClient.register.contentType);
			expect(res.send).toHaveBeenCalledWith(metricsString);
		});

		it('should warn and skip re-initialization when called a second time', () => {
			const scopedLogger = logger.scoped('metrics');

			service.init(app);

			// Reset init call counts
			vi.clearAllMocks();
			app.get.mockClear();

			service.init(app);

			// Collectors should NOT be re-initialized
			expect(cache.init).not.toHaveBeenCalled();
			expect(version.init).not.toHaveBeenCalled();

			// Logger warn should be called
			expect((scopedLogger as Mocked<Logger>).warn).toHaveBeenCalledWith(
				'The prometheus initialization should not be called twice.',
			);
		});

		it('should handle a mix of enabled and disabled collectors correctly', () => {
			vi.spyOn(cache, 'enabled', 'get').mockReturnValue(false);
			vi.spyOn(queue, 'enabled', 'get').mockReturnValue(false);
			vi.spyOn(defaultMetrics, 'enabled', 'get').mockReturnValue(false);
			vi.spyOn(pss, 'enabled', 'get').mockReturnValue(false);
			vi.spyOn(eventBus, 'enabled', 'get').mockReturnValue(false);

			service.init(app);

			expect(cache.init).not.toHaveBeenCalled();
			expect(queue.init).not.toHaveBeenCalled();
			expect(defaultMetrics.init).not.toHaveBeenCalled();
			expect(pss.init).not.toHaveBeenCalled();
			expect(eventBus.init).not.toHaveBeenCalled();

			expect(route.init).toHaveBeenCalled();
			expect(version.init).toHaveBeenCalled();
			expect(tokenExchange.init).toHaveBeenCalled();
			expect(activeWorkflow.init).toHaveBeenCalled();
		});
	});
});
