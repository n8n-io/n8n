'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const express_prom_bundle_1 = __importDefault(require('express-prom-bundle'));
const jest_mock_extended_1 = require('jest-mock-extended');
const prom_client_1 = __importDefault(require('prom-client'));
const config_2 = __importDefault(require('@/config'));
const prometheus_metrics_service_1 = require('../prometheus-metrics.service');
const mockMiddleware = (_req, _res, next) => next();
jest.mock('prom-client');
jest.mock('express-prom-bundle', () => jest.fn(() => mockMiddleware));
describe('PrometheusMetricsService', () => {
	let globalConfig;
	let app;
	let eventBus;
	let eventService;
	let instanceSettings;
	let workflowRepository;
	let prometheusMetricsService;
	beforeEach(() => {
		globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
			endpoints: {
				metrics: {
					prefix: 'n8n_',
					includeDefaultMetrics: false,
					includeApiEndpoints: false,
					includeCacheMetrics: false,
					includeMessageEventBusMetrics: false,
					includeCredentialTypeLabel: false,
					includeNodeTypeLabel: false,
					includeWorkflowIdLabel: false,
					includeApiPathLabel: false,
					includeApiMethodLabel: false,
					includeApiStatusCodeLabel: false,
					includeQueueMetrics: false,
					includeWorkflowNameLabel: false,
				},
				rest: 'rest',
				form: 'form',
				formTest: 'form-test',
				formWaiting: 'form-waiting',
				webhook: 'webhook',
				webhookTest: 'webhook-test',
				webhookWaiting: 'webhook-waiting',
			},
		});
		app = (0, jest_mock_extended_1.mock)();
		eventBus = (0, jest_mock_extended_1.mock)();
		eventService = (0, jest_mock_extended_1.mock)();
		instanceSettings = (0, jest_mock_extended_1.mock)({ instanceType: 'main' });
		workflowRepository = (0, jest_mock_extended_1.mock)();
		prometheusMetricsService = new prometheus_metrics_service_1.PrometheusMetricsService(
			(0, jest_mock_extended_1.mock)(),
			eventBus,
			globalConfig,
			eventService,
			instanceSettings,
			workflowRepository,
		);
		prom_client_1.default.Counter.prototype.inc = jest.fn();
		prom_client_1.default.validateMetricName.mockReturnValue(true);
	});
	afterEach(() => {
		jest.clearAllMocks();
		prometheusMetricsService.disableAllMetrics();
		prometheusMetricsService.disableAllLabels();
	});
	describe('constructor', () => {
		it('should enable metrics based on global config', async () => {
			const customGlobalConfig = { ...globalConfig };
			customGlobalConfig.endpoints.metrics.includeCacheMetrics = true;
			const customPrometheusMetricsService =
				new prometheus_metrics_service_1.PrometheusMetricsService(
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
					customGlobalConfig,
					(0, jest_mock_extended_1.mock)(),
					instanceSettings,
					(0, jest_mock_extended_1.mock)(),
				);
			await customPrometheusMetricsService.init(app);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_hits_total',
				help: 'Total number of cache hits.',
				labelNames: ['cache'],
			});
		});
	});
	describe('init', () => {
		it('should set up `n8n_version_info`', async () => {
			await prometheusMetricsService.init(app);
			expect(prom_client_1.default.Gauge).toHaveBeenNthCalledWith(1, {
				name: 'n8n_version_info',
				help: 'n8n version info.',
				labelNames: ['version', 'major', 'minor', 'patch'],
			});
		});
		it('should set up default metrics collection with `prom-client`', async () => {
			prometheusMetricsService.enableMetric('default');
			await prometheusMetricsService.init(app);
			expect(prom_client_1.default.collectDefaultMetrics).toHaveBeenCalled();
		});
		it('should set up `n8n_cache_hits_total`', async () => {
			prometheusMetricsService.enableMetric('cache');
			await prometheusMetricsService.init(app);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_hits_total',
				help: 'Total number of cache hits.',
				labelNames: ['cache'],
			});
		});
		it('should set up `n8n_cache_misses_total`', async () => {
			prometheusMetricsService.enableMetric('cache');
			await prometheusMetricsService.init(app);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_misses_total',
				help: 'Total number of cache misses.',
				labelNames: ['cache'],
			});
		});
		it('should set up `n8n_cache_updates_total`', async () => {
			prometheusMetricsService.enableMetric('cache');
			await prometheusMetricsService.init(app);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_cache_updates_total',
				help: 'Total number of cache updates.',
				labelNames: ['cache'],
			});
			expect(prometheusMetricsService.counters.cacheUpdatesTotal?.inc).toHaveBeenCalledWith(0);
		});
		it('should set up route metrics with `express-prom-bundle`', async () => {
			prometheusMetricsService.enableMetric('routes');
			await prometheusMetricsService.init(app);
			expect(express_prom_bundle_1.default).toHaveBeenCalledWith({
				httpDurationMetricName: 'n8n_http_request_duration_seconds',
				autoregister: false,
				includeUp: false,
				includePath: false,
				includeMethod: false,
				includeStatusCode: false,
			});
			expect(prom_client_1.default.Gauge).toHaveBeenNthCalledWith(2, {
				name: 'n8n_last_activity',
				help: 'last instance activity (backend request) in Unix time (seconds).',
			});
			expect(app.use).toHaveBeenCalledWith(
				[
					'/api/',
					'/rest/',
					'/webhook/',
					'/webhook-waiting/',
					'/webhook-test/',
					'/form/',
					'/form-waiting/',
					'/form-test/',
				],
				expect.any(Function),
			);
		});
		it('should set up event bus metrics', async () => {
			prometheusMetricsService.enableMetric('logs');
			await prometheusMetricsService.init(app);
			expect(eventBus.on).toHaveBeenCalledWith('metrics.eventBus.event', expect.any(Function));
		});
		it('should set up queue metrics if enabled', async () => {
			config_2.default.set('executions.mode', 'queue');
			prometheusMetricsService.enableMetric('queue');
			await prometheusMetricsService.init(app);
			expect(prom_client_1.default.Gauge).toHaveBeenNthCalledWith(2, {
				name: 'n8n_scaling_mode_queue_jobs_waiting',
				help: 'Current number of enqueued jobs waiting for pickup in scaling mode.',
			});
			expect(prom_client_1.default.Gauge).toHaveBeenNthCalledWith(3, {
				name: 'n8n_scaling_mode_queue_jobs_active',
				help: 'Current number of jobs being processed across all workers in scaling mode.',
			});
			expect(prom_client_1.default.Counter).toHaveBeenNthCalledWith(1, {
				name: 'n8n_scaling_mode_queue_jobs_completed',
				help: 'Total number of jobs completed across all workers in scaling mode since instance start.',
			});
			expect(prom_client_1.default.Counter).toHaveBeenNthCalledWith(2, {
				name: 'n8n_scaling_mode_queue_jobs_failed',
				help: 'Total number of jobs failed across all workers in scaling mode since instance start.',
			});
			expect(eventService.on).toHaveBeenCalledWith('job-counts-updated', expect.any(Function));
		});
		it('should not set up queue metrics if enabled but not on scaling mode', async () => {
			config_2.default.set('executions.mode', 'regular');
			prometheusMetricsService.enableMetric('queue');
			await prometheusMetricsService.init(app);
			expect(prom_client_1.default.Gauge).toHaveBeenCalledTimes(2);
			expect(prom_client_1.default.Counter).toHaveBeenCalledTimes(0);
			expect(eventService.on).not.toHaveBeenCalled();
		});
		it('should not set up queue metrics if enabled and on scaling mode but instance is not main', async () => {
			config_2.default.set('executions.mode', 'queue');
			prometheusMetricsService.enableMetric('queue');
			instanceSettings.instanceType = 'worker';
			await prometheusMetricsService.init(app);
			expect(prom_client_1.default.Gauge).toHaveBeenCalledTimes(2);
			expect(prom_client_1.default.Counter).toHaveBeenCalledTimes(0);
			expect(eventService.on).not.toHaveBeenCalled();
		});
		it('should setup active workflow count metric', async () => {
			await prometheusMetricsService.init(app);
			expect(prom_client_1.default.Gauge).toHaveBeenCalledTimes(2);
			expect(prom_client_1.default.Gauge).toHaveBeenNthCalledWith(2, {
				name: 'n8n_active_workflow_count',
				help: 'Total number of active workflows.',
				collect: expect.any(Function),
			});
		});
	});
	describe('when event bus events are sent', () => {
		const getEventHandler = () => {
			const eventBusOnCall = eventBus.on.mock.calls.find(
				(call) => call[0] === 'metrics.eventBus.event',
			);
			return eventBusOnCall ? eventBusOnCall[1] : undefined;
		};
		it('should create a counter with `credential_type` label for user credentials audit events', async () => {
			prometheusMetricsService.enableMetric('logs');
			prometheusMetricsService.enableLabels(['credentialsType']);
			await prometheusMetricsService.init(app);
			const eventHandler = getEventHandler();
			const mockEvent = {
				__type: '$$EventMessageAudit',
				eventName: 'n8n.audit.user.credentials.created',
				payload: { credentialType: 'n8n-nodes-base.googleApi' },
			};
			eventHandler(mockEvent);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_audit_user_credentials_created_total',
				help: 'Total number of n8n.audit.user.credentials.created events.',
				labelNames: ['credential_type'],
			});
			expect(prom_client_1.default.Counter.prototype.inc).toHaveBeenCalledWith(
				{ credential_type: 'n8n-nodes-base_googleApi' },
				1,
			);
		});
		it('should create a counter with `workflow_id` label for workflow audit events', async () => {
			prometheusMetricsService.enableMetric('logs');
			prometheusMetricsService.enableLabels(['workflowId']);
			await prometheusMetricsService.init(app);
			const eventHandler = getEventHandler();
			const mockEvent = {
				__type: '$$EventMessageAudit',
				eventName: 'n8n.audit.workflow.created',
				payload: { workflowId: 'wf_123' },
			};
			eventHandler(mockEvent);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_audit_workflow_created_total',
				help: 'Total number of n8n.audit.workflow.created events.',
				labelNames: ['workflow_id'],
			});
			expect(prom_client_1.default.Counter.prototype.inc).toHaveBeenCalledWith(
				{ workflow_id: 'wf_123' },
				1,
			);
		});
		it('should create a counter with `workflow_name` label for workflow audit events', async () => {
			prometheusMetricsService.enableMetric('logs');
			prometheusMetricsService.enableLabels(['workflowName']);
			await prometheusMetricsService.init(app);
			const eventHandler = getEventHandler();
			const mockEvent = {
				__type: '$$EventMessageAudit',
				eventName: 'n8n.audit.workflow.created',
				payload: { workflowName: 'Fake Workflow Name' },
			};
			eventHandler(mockEvent);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_audit_workflow_created_total',
				help: 'Total number of n8n.audit.workflow.created events.',
				labelNames: ['workflow_name'],
			});
			expect(prom_client_1.default.Counter.prototype.inc).toHaveBeenCalledWith(
				{ workflow_name: 'Fake Workflow Name' },
				1,
			);
		});
		it('should create a counter with `node_type` label for node events', async () => {
			prometheusMetricsService.enableMetric('logs');
			prometheusMetricsService.enableLabels(['nodeType']);
			await prometheusMetricsService.init(app);
			const eventHandler = getEventHandler();
			const mockEvent = {
				__type: '$$EventMessageNode',
				eventName: 'n8n.node.execution.started',
				payload: { nodeType: 'n8n-nodes-base.if' },
			};
			eventHandler(mockEvent);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_node_execution_started_total',
				help: 'Total number of n8n.node.execution.started events.',
				labelNames: ['node_type'],
			});
			expect(prom_client_1.default.Counter.prototype.inc).toHaveBeenCalledWith(
				{ node_type: 'base_if' },
				1,
			);
		});
		it('should create a counter with `workflow_id` label for node events', async () => {
			prometheusMetricsService.enableMetric('logs');
			prometheusMetricsService.enableLabels(['workflowId']);
			await prometheusMetricsService.init(app);
			const eventHandler = getEventHandler();
			const mockEvent = {
				__type: '$$EventMessageNode',
				eventName: 'n8n.node.execution.started',
				payload: { workflowId: 'wf_123' },
			};
			eventHandler(mockEvent);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_node_execution_started_total',
				help: 'Total number of n8n.node.execution.started events.',
				labelNames: ['workflow_id'],
			});
			expect(prom_client_1.default.Counter.prototype.inc).toHaveBeenCalledWith(
				{ workflow_id: 'wf_123' },
				1,
			);
		});
		it('should create a counter with `workflow_name` label for node events', async () => {
			prometheusMetricsService.enableMetric('logs');
			prometheusMetricsService.enableLabels(['workflowName']);
			await prometheusMetricsService.init(app);
			const eventHandler = getEventHandler();
			const mockEvent = {
				__type: '$$EventMessageNode',
				eventName: 'n8n.node.execution.started',
				payload: { workflowName: 'Fake Workflow Name' },
			};
			eventHandler(mockEvent);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_node_execution_started_total',
				help: 'Total number of n8n.node.execution.started events.',
				labelNames: ['workflow_name'],
			});
			expect(prom_client_1.default.Counter.prototype.inc).toHaveBeenCalledWith(
				{ workflow_name: 'Fake Workflow Name' },
				1,
			);
		});
		it('should create a counter with workflow and node type labels for node events', async () => {
			prometheusMetricsService.enableMetric('logs');
			prometheusMetricsService.enableLabels(['workflowId', 'workflowName', 'nodeType']);
			await prometheusMetricsService.init(app);
			const eventHandler = getEventHandler();
			const mockEvent = {
				__type: '$$EventMessageNode',
				eventName: 'n8n.node.execution.started',
				payload: {
					workflowId: 'wf_123',
					workflowName: 'Fake Workflow Name',
					nodeType: 'n8n-nodes-base.if',
				},
			};
			eventHandler(mockEvent);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_node_execution_started_total',
				help: 'Total number of n8n.node.execution.started events.',
				labelNames: ['workflow_id', 'workflow_name', 'node_type'],
			});
			expect(prom_client_1.default.Counter.prototype.inc).toHaveBeenCalledWith(
				{
					workflow_id: 'wf_123',
					workflow_name: 'Fake Workflow Name',
					node_type: 'base_if',
				},
				1,
			);
		});
		it('should create a counter with `workflow_id` label for workflow events', async () => {
			prometheusMetricsService.enableMetric('logs');
			prometheusMetricsService.enableLabels(['workflowId']);
			await prometheusMetricsService.init(app);
			const eventHandler = getEventHandler();
			const mockEvent = {
				__type: '$$EventMessageWorkflow',
				eventName: 'n8n.workflow.execution.finished',
				payload: { workflowId: 'wf_456' },
			};
			eventHandler(mockEvent);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_workflow_execution_finished_total',
				help: 'Total number of n8n.workflow.execution.finished events.',
				labelNames: ['workflow_id'],
			});
			expect(prom_client_1.default.Counter.prototype.inc).toHaveBeenCalledWith(
				{ workflow_id: 'wf_456' },
				1,
			);
		});
		it('should create a counter with `workflow_name` label for workflow events', async () => {
			prometheusMetricsService.enableMetric('logs');
			prometheusMetricsService.enableLabels(['workflowName']);
			await prometheusMetricsService.init(app);
			const eventHandler = getEventHandler();
			const mockEvent = {
				__type: '$$EventMessageWorkflow',
				eventName: 'n8n.workflow.execution.finished',
				payload: { workflowName: 'Fake Workflow Name' },
			};
			eventHandler(mockEvent);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_workflow_execution_finished_total',
				help: 'Total number of n8n.workflow.execution.finished events.',
				labelNames: ['workflow_name'],
			});
			expect(prom_client_1.default.Counter.prototype.inc).toHaveBeenCalledWith(
				{ workflow_name: 'Fake Workflow Name' },
				1,
			);
		});
		it('should create a counter with no labels if the corresponding config is disabled', async () => {
			prometheusMetricsService.enableMetric('logs');
			await prometheusMetricsService.init(app);
			const eventHandler = getEventHandler();
			const mockEvent = {
				__type: '$$EventMessageWorkflow',
				eventName: 'n8n.workflow.execution.finished',
				payload: { workflowId: 'wf_789' },
			};
			eventHandler(mockEvent);
			expect(prom_client_1.default.Counter).toHaveBeenCalledWith({
				name: 'n8n_workflow_execution_finished_total',
				help: 'Total number of n8n.workflow.execution.finished events.',
				labelNames: [],
			});
			expect(prom_client_1.default.Counter.prototype.inc).toHaveBeenCalledWith({}, 1);
		});
	});
});
//# sourceMappingURL=prometheus-metrics.service.test.js.map
