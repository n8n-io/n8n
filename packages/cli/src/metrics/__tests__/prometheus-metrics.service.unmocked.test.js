'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const jest_mock_extended_1 = require('jest-mock-extended');
const prom_client_1 = __importDefault(require('prom-client'));
const event_message_workflow_1 = require('@/eventbus/event-message-classes/event-message-workflow');
const message_event_bus_1 = require('../../eventbus/message-event-bus/message-event-bus');
const prometheus_metrics_service_1 = require('../prometheus-metrics.service');
jest.unmock('@/eventbus/message-event-bus/message-event-bus');
const customPrefix = 'custom_';
const cacheService = (0, jest_mock_extended_1.mock)();
const eventService = (0, jest_mock_extended_1.mock)();
const instanceSettings = (0, jest_mock_extended_1.mock)({ instanceType: 'main' });
const workflowRepository = (0, jest_mock_extended_1.mock)();
const app = (0, jest_mock_extended_1.mock)();
const eventBus = new message_event_bus_1.MessageEventBus(
	(0, jest_mock_extended_1.mock)(),
	(0, jest_mock_extended_1.mock)(),
	(0, jest_mock_extended_1.mock)(),
	(0, jest_mock_extended_1.mock)(),
	(0, jest_mock_extended_1.mock)(),
	(0, jest_mock_extended_1.mock)(),
	(0, jest_mock_extended_1.mock)(),
	(0, jest_mock_extended_1.mock)(),
);
describe('workflow_success_total', () => {
	test('support workflow id labels', async () => {
		const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
			endpoints: {
				metrics: {
					prefix: '',
					includeMessageEventBusMetrics: true,
					includeWorkflowIdLabel: true,
					includeWorkflowNameLabel: false,
				},
			},
		});
		const prometheusMetricsService = new prometheus_metrics_service_1.PrometheusMetricsService(
			(0, jest_mock_extended_1.mock)(),
			eventBus,
			globalConfig,
			eventService,
			instanceSettings,
			workflowRepository,
		);
		await prometheusMetricsService.init(app);
		const event = new event_message_workflow_1.EventMessageWorkflow({
			eventName: 'n8n.workflow.success',
			payload: { workflowId: '1234' },
		});
		eventBus.emit('metrics.eventBus.event', event);
		const workflowSuccessCounter =
			await prom_client_1.default.register.getSingleMetricAsString('workflow_success_total');
		expect(workflowSuccessCounter).toMatchInlineSnapshot(`
"# HELP workflow_success_total Total number of n8n.workflow.success events.
# TYPE workflow_success_total counter
workflow_success_total{workflow_id="1234"} 1"
`);
	});
	test('support workflow name labels', async () => {
		const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
			endpoints: {
				metrics: {
					prefix: '',
					includeMessageEventBusMetrics: true,
					includeWorkflowIdLabel: false,
					includeWorkflowNameLabel: true,
				},
			},
		});
		const prometheusMetricsService = new prometheus_metrics_service_1.PrometheusMetricsService(
			(0, jest_mock_extended_1.mock)(),
			eventBus,
			globalConfig,
			eventService,
			instanceSettings,
			workflowRepository,
		);
		await prometheusMetricsService.init(app);
		const event = new event_message_workflow_1.EventMessageWorkflow({
			eventName: 'n8n.workflow.success',
			payload: { workflowName: 'wf_1234' },
		});
		eventBus.emit('metrics.eventBus.event', event);
		const workflowSuccessCounter =
			await prom_client_1.default.register.getSingleMetricAsString('workflow_success_total');
		expect(workflowSuccessCounter).toMatchInlineSnapshot(`
"# HELP workflow_success_total Total number of n8n.workflow.success events.
# TYPE workflow_success_total counter
workflow_success_total{workflow_name="wf_1234"} 1"
`);
	});
	test('support a custom prefix', async () => {
		const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
			endpoints: {
				metrics: {
					prefix: customPrefix,
				},
			},
		});
		const prometheusMetricsService = new prometheus_metrics_service_1.PrometheusMetricsService(
			(0, jest_mock_extended_1.mock)(),
			eventBus,
			globalConfig,
			eventService,
			instanceSettings,
			workflowRepository,
		);
		await prometheusMetricsService.init(app);
		const eventLoopLagMetric = await prom_client_1.default.register.getSingleMetricAsString(
			`${customPrefix}nodejs_eventloop_lag_seconds`,
		);
		expect(eventLoopLagMetric.split('\n')).toMatchObject([
			'# HELP custom_nodejs_eventloop_lag_seconds Lag of event loop in seconds.',
			'# TYPE custom_nodejs_eventloop_lag_seconds gauge',
			expect.stringMatching('custom_nodejs_eventloop_lag_seconds .*'),
		]);
		const versionMetric = await prom_client_1.default.register.getSingleMetricAsString(
			`${customPrefix}version_info`,
		);
		expect(versionMetric.split('\n')).toMatchObject([
			'# HELP custom_version_info n8n version info.',
			'# TYPE custom_version_info gauge',
			expect.stringMatching('custom_version_info.*'),
		]);
	});
});
describe('Active workflow count', () => {
	const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
		endpoints: {
			metrics: {
				prefix: '',
				activeWorkflowCountInterval: 30,
			},
		},
	});
	const prometheusMetricsService = new prometheus_metrics_service_1.PrometheusMetricsService(
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
			await prom_client_1.default.register.getSingleMetricAsString('active_workflow_count');
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
			await prom_client_1.default.register.getSingleMetricAsString('active_workflow_count');
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
//# sourceMappingURL=prometheus-metrics.service.unmocked.test.js.map
