import { GlobalConfig } from '@n8n/config';
import type { WorkflowRepository } from '@n8n/db';
import type express from 'express';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import promClient from 'prom-client';

import { EventMessageWorkflow } from '@/eventbus/event-message-classes/event-message-workflow';
import type { EventService } from '@/events/event.service';
import type { CacheService } from '@/services/cache/cache.service';
import { mockInstance } from '@test/mocking';

import { MessageEventBus } from '../../eventbus/message-event-bus/message-event-bus';
import { PrometheusMetricsService } from '../prometheus-metrics.service';

jest.unmock('@/eventbus/message-event-bus/message-event-bus');

const customPrefix = 'custom_';

const cacheService = mock<CacheService>();
const eventService = mock<EventService>();
const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
const workflowRepository = mock<WorkflowRepository>();
const app = mock<express.Application>();
const eventBus = new MessageEventBus(
	mock(),
	mock(),
	mock(),
	mock(),
	mock(),
	mock(),
	mock(),
	mock(),
);

describe('workflow_success_total', () => {
	test('support workflow id labels', async () => {
		// ARRANGE
		const globalConfig = mockInstance(GlobalConfig, {
			endpoints: {
				metrics: {
					prefix: '',
					includeMessageEventBusMetrics: true,
					includeWorkflowIdLabel: true,
				},
			},
		});

		const prometheusMetricsService = new PrometheusMetricsService(
			mock(),
			eventBus,
			globalConfig,
			eventService,
			instanceSettings,
			workflowRepository,
		);

		await prometheusMetricsService.init(app);

		// ACT
		const event = new EventMessageWorkflow({
			eventName: 'n8n.workflow.success',
			payload: { workflowId: '1234' },
		});

		eventBus.emit('metrics.eventBus.event', event);

		// ASSERT
		const workflowSuccessCounter =
			await promClient.register.getSingleMetricAsString('workflow_success_total');

		expect(workflowSuccessCounter).toMatchInlineSnapshot(`
"# HELP workflow_success_total Total number of n8n.workflow.success events.
# TYPE workflow_success_total counter
workflow_success_total{workflow_id="1234"} 1"
`);
	});

	test('support a custom prefix', async () => {
		// ARRANGE
		const globalConfig = mockInstance(GlobalConfig, {
			endpoints: {
				metrics: {
					prefix: customPrefix,
				},
			},
		});

		const prometheusMetricsService = new PrometheusMetricsService(
			mock(),
			eventBus,
			globalConfig,
			eventService,
			instanceSettings,
			workflowRepository,
		);

		await prometheusMetricsService.init(app);

		// ACT
		const event = new EventMessageWorkflow({
			eventName: 'n8n.workflow.success',
			payload: { workflowId: '1234' },
		});

		eventBus.emit('metrics.eventBus.event', event);

		// ASSERT
		const versionInfoMetric = promClient.register.getSingleMetric(`${customPrefix}version_info`);

		if (!versionInfoMetric) {
			fail(`Could not find a metric called "${customPrefix}version_info"`);
		}
	});
});

describe('Active workflow count', () => {
	const globalConfig = mockInstance(GlobalConfig, {
		endpoints: {
			metrics: {
				prefix: '',
				activeWorkflowCountInterval: 30,
			},
		},
	});

	const prometheusMetricsService = new PrometheusMetricsService(
		cacheService,
		eventBus,
		globalConfig,
		eventService,
		instanceSettings,
		workflowRepository,
	);

	afterEach(() => {
		jest.clearAllMocks();
		prometheusMetricsService.disableAllMetrics();
	});

	it('should prioritize cached value', async () => {
		await prometheusMetricsService.init(app);

		cacheService.get.mockReturnValueOnce(Promise.resolve('1'));
		workflowRepository.getActiveCount.mockReturnValueOnce(Promise.resolve(2));

		const activeWorkflowCount =
			await promClient.register.getSingleMetricAsString('active_workflow_count');

		expect(cacheService.get).toHaveBeenCalledWith('metrics:active-workflow-count');
		expect(workflowRepository.getActiveCount).not.toHaveBeenCalled();

		expect(activeWorkflowCount).toMatchInlineSnapshot(`
"# HELP active_workflow_count Total number of active workflows.
# TYPE active_workflow_count gauge
active_workflow_count 1"
`);
	});

	it('should query value from database if cache misses', async () => {
		await prometheusMetricsService.init(app);

		cacheService.get.mockReturnValueOnce(Promise.resolve(undefined));
		workflowRepository.getActiveCount.mockReturnValueOnce(Promise.resolve(2));

		const activeWorkflowCount =
			await promClient.register.getSingleMetricAsString('active_workflow_count');

		expect(cacheService.get).toHaveBeenCalledWith('metrics:active-workflow-count');
		expect(workflowRepository.getActiveCount).toHaveBeenCalled();
		expect(cacheService.set).toHaveBeenCalledWith('metrics:active-workflow-count', '2', 30_000);

		expect(activeWorkflowCount).toMatchInlineSnapshot(`
"# HELP active_workflow_count Total number of active workflows.
# TYPE active_workflow_count gauge
active_workflow_count 2"
`);
	});
});
