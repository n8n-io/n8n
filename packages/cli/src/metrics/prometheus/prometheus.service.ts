import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type express from 'express';
import promClient from 'prom-client';

import { PrometheusActiveWorkflowMetricsService } from './active-workflow-metrics.service';
import type { PrometheusMetricsCollector } from './base';
import { PrometheusCacheMetricsService } from './cache-metrics.service';
import { PrometheusDefaultMetricsService } from './default-metrics.service';
import { PrometheusDnsCacheMetricsService } from './dns-cache-metrics.service';
import { PrometheusEventBusMetricsService } from './event-bus-metrics.service';
import { PrometheusExecutionDataMetricsService } from './execution-data-metrics.service';
import { PrometheusInstanceRoleMetricsService } from './instance-role-metrics.service';
import { PrometheusPssMetricsService } from './pss-metrics.service';
import { PrometheusQueueMetricsService } from './queue-metrics.service';
import { PrometheusRouteMetricsService } from './route-metrics.service';
import { PrometheusSsrfMetricsService } from './ssrf-metrics.service';
import { PrometheusTokenExchangeMetricsService } from './token-exchange-metrics.service';
import { PrometheusVersionMetricsService } from './version-metrics.service';
import { PrometheusWorkflowExecutionDurationMetricsService } from './workflow-execution-duration-metrics.service';
import { PrometheusWorkflowStatisticsMetricsService } from './workflow-statistics-metrics.service';

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
