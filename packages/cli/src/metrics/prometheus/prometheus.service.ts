import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type express from 'express';
import promClient from 'prom-client';

import { PrometheusActiveWorkflowMetricsService } from './active-workflow-metrics.service.js';
import type { PrometheusMetricsCollector } from './base.js';
import { PrometheusCacheMetricsService } from './cache-metrics.service.js';
import { PrometheusDbPoolMetricsService } from './db-pool-metrics.service.js';
import { PrometheusDefaultMetricsService } from './default-metrics.service.js';
import { PrometheusDnsCacheMetricsService } from './dns-cache-metrics.service.js';
import { PrometheusEventBusMetricsService } from './event-bus-metrics.service.js';
import { PrometheusExecutionDataMetricsService } from './execution-data-metrics.service.js';
import { PrometheusInstanceAiMetricsService } from './instance-ai-metrics.service.js';
import { PrometheusInstanceRoleMetricsService } from './instance-role-metrics.service.js';
import { PrometheusPssMetricsService } from './pss-metrics.service.js';
import { PrometheusQueueMetricsService } from './queue-metrics.service.js';
import { PrometheusRouteMetricsService } from './route-metrics.service.js';
import { PrometheusSchedulerMetricsService } from './scheduler-metrics.service.js';
import { PrometheusSsrfMetricsService } from './ssrf-metrics.service.js';
import { PrometheusTokenExchangeMetricsService } from './token-exchange-metrics.service.js';
import { PrometheusVersionMetricsService } from './version-metrics.service.js';
import { PrometheusWebhookAndFormMetricsService } from './webhook-and-form-metrics.service.js';
import { PrometheusWorkflowExecutionDurationMetricsService } from './workflow-execution-duration-metrics.service.js';
import { PrometheusWorkflowInfoMetricsService } from './workflow-info-metrics.service.js';
import { PrometheusWorkflowPublicationMetricsService } from './workflow-publication-metrics.service.js';
import { PrometheusWorkflowStatisticsMetricsService } from './workflow-statistics-metrics.service.js';

@Service()
export class PrometheusMetricsService {
	private initialized = false;
	private readonly logger: Logger;
	private readonly collectors: PrometheusMetricsCollector[];

	constructor(
		logger: Logger,
		cache: PrometheusCacheMetricsService,
		eventBus: PrometheusEventBusMetricsService,
		queue: PrometheusQueueMetricsService,
		route: PrometheusRouteMetricsService,
		roleInstance: PrometheusInstanceRoleMetricsService,
		activeWorkflow: PrometheusActiveWorkflowMetricsService,
		workflowExecutionDuration: PrometheusWorkflowExecutionDurationMetricsService,
		workflowStatistics: PrometheusWorkflowStatisticsMetricsService,
		executionData: PrometheusExecutionDataMetricsService,
		pss: PrometheusPssMetricsService,
		version: PrometheusVersionMetricsService,
		defaultMetrics: PrometheusDefaultMetricsService,
		tokenExchange: PrometheusTokenExchangeMetricsService,
		ssrf: PrometheusSsrfMetricsService,
		dnsCache: PrometheusDnsCacheMetricsService,
		webhook: PrometheusWebhookAndFormMetricsService,
		workflowInfo: PrometheusWorkflowInfoMetricsService,
		instanceAi: PrometheusInstanceAiMetricsService,
		dbPool: PrometheusDbPoolMetricsService,
		workflowPublication: PrometheusWorkflowPublicationMetricsService,
		scheduler: PrometheusSchedulerMetricsService,
	) {
		this.logger = logger.scoped('metrics');
		this.collectors = [
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
		];
	}

	init(app: express.Application) {
		if (!this.initialized) {
			this.initialized = true;
			this.logger.debug('Initialization of prometheus metrics...');
			this.initCollectors(app);
			this.mountMetricsEndpoint(app);
			this.logger.debug('Initialization of prometheus metrics: done.');
		} else {
			this.logger.warn('The prometheus initialization should not be called twice.');
		}
	}

	private initCollectors(app: express.Application) {
		this.collectors
			.filter((collector) => collector.enabled)
			.forEach((collector) => {
				this.logger.debug(
					`Initialization of prometheus metrics: init '${collector.constructor.name}'.`,
				);
				collector.init(app);
			});
	}

	private mountMetricsEndpoint(app: express.Application) {
		this.logger.debug("Initialization of prometheus metrics: register endpoint 'metrics/'");
		app.get('/metrics', async (_req: express.Request, res: express.Response) => {
			const metrics = await promClient.register.metrics();
			res.setHeader('Content-Type', promClient.register.contentType);
			res.send(metrics).end();
		});
	}
}
