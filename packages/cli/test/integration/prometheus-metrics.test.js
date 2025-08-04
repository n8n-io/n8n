'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const luxon_1 = require('luxon');
const semver_1 = require('semver');
const supertest_1 = __importDefault(require('supertest'));
const config_2 = __importDefault(require('@/config'));
const constants_1 = require('@/constants');
const event_service_1 = require('@/events/event.service');
const prometheus_metrics_service_1 = require('@/metrics/prometheus-metrics.service');
const cache_service_1 = require('@/services/cache/cache.service');
const utils_1 = require('./shared/utils');
jest.unmock('@/eventbus/message-event-bus/message-event-bus');
const toLines = (response) => response.text.trim().split('\n');
const eventService = di_1.Container.get(event_service_1.EventService);
const globalConfig = di_1.Container.get(config_1.GlobalConfig);
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
const server = (0, utils_1.setupTestServer)({ endpointGroups: ['metrics'] });
const agent = supertest_1.default.agent(server.app);
let prometheusService;
describe('PrometheusMetricsService', () => {
	beforeAll(() => {
		prometheusService = di_1.Container.get(prometheus_metrics_service_1.PrometheusMetricsService);
	});
	beforeEach(() => {
		prometheusService.disableAllMetrics();
		prometheusService.disableAllLabels();
	});
	afterEach(() => {
		jest.useRealTimers();
	});
	it('should return n8n version', async () => {
		await prometheusService.init(server.app);
		const response = await agent.get('/metrics');
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');
		const n8nVersion = (0, semver_1.parse)(constants_1.N8N_VERSION);
		if (!n8nVersion) fail('Failed to parse n8n version');
		const { version, major, minor, patch } = n8nVersion;
		const lines = toLines(response);
		expect(lines).toContain(
			`n8n_test_version_info{version="v${version}",major="${major}",minor="${minor}",patch="${patch}"} 1`,
		);
	});
	it('should return default metrics if enabled', async () => {
		prometheusService.enableMetric('default');
		await prometheusService.init(server.app);
		const response = await agent.get('/metrics');
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');
		const lines = toLines(response);
		expect(lines).toContain('n8n_test_nodejs_heap_space_size_total_bytes{space="read_only"} 0');
	});
	it('should not return default metrics if disabled', async () => {
		prometheusService.disableMetric('default');
		await prometheusService.init(server.app);
		const response = await agent.get('/metrics');
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');
		expect(toLines(response)).not.toContain(
			'nodejs_heap_space_size_total_bytes{space="read_only"} 0',
		);
	});
	it('should return cache metrics if enabled', async () => {
		prometheusService.enableMetric('cache');
		await prometheusService.init(server.app);
		const response = await agent.get('/metrics');
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');
		const lines = toLines(response);
		expect(lines).toContain('n8n_test_cache_hits_total 0');
		expect(lines).toContain('n8n_test_cache_misses_total 0');
		expect(lines).toContain('n8n_test_cache_updates_total 0');
	});
	it('should not return cache metrics if disabled', async () => {
		await prometheusService.init(server.app);
		const response = await agent.get('/metrics');
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');
		const lines = toLines(response);
		expect(lines).not.toContain('n8n_test_cache_hits_total 0');
		expect(lines).not.toContain('n8n_test_cache_misses_total 0');
		expect(lines).not.toContain('n8n_test_cache_updates_total 0');
	});
	it('should return route metrics if enabled', async () => {
		prometheusService.enableMetric('routes');
		await prometheusService.init(server.app);
		await agent.get('/api/v1/workflows');
		const response = await agent.get('/metrics');
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
		const startTime = luxon_1.DateTime.now().toUnixInteger();
		jest.useFakeTimers().setSystemTime(startTime * 1000);
		prometheusService.enableMetric('routes');
		await prometheusService.init(server.app);
		let response = await agent.get('/metrics');
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');
		const lines = toLines(response);
		expect(lines).toContainEqual(expect.stringContaining('n8n_test_last_activity'));
		const lastActivityLine = lines.find((line) => line.startsWith('n8n_test_last_activity'));
		expect(lastActivityLine).toBeDefined();
		const value = lastActivityLine.split(' ')[1];
		expect(parseInt(value, 10)).toBe(startTime);
		jest.advanceTimersByTime(1000);
		await agent.get('/api/v1/workflows');
		response = await agent.get('/metrics');
		const updatedLines = toLines(response);
		const newLastActivityLine = updatedLines.find((line) =>
			line.startsWith('n8n_test_last_activity'),
		);
		expect(newLastActivityLine).toBeDefined();
		const newValue = newLastActivityLine.split(' ')[1];
		expect(parseInt(newValue, 10)).toBe(startTime + 1);
	});
	it('should return labels in route metrics if enabled', async () => {
		prometheusService.enableMetric('routes');
		prometheusService.enableLabels(['apiMethod', 'apiPath', 'apiStatusCode']);
		await prometheusService.init(server.app);
		await agent.get('/webhook-test/some-uuid');
		const response = await agent.get('/metrics');
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');
		const lines = toLines(response);
		expect(lines).toContainEqual(expect.stringContaining('method="GET"'));
		expect(lines).toContainEqual(expect.stringContaining('path="/webhook-test/some-uuid"'));
		expect(lines).toContainEqual(expect.stringContaining('status_code="404"'));
	});
	it('should return queue metrics if enabled', async () => {
		prometheusService.enableMetric('queue');
		config_2.default.set('executions.mode', 'queue');
		await prometheusService.init(server.app);
		const response = await agent.get('/metrics');
		expect(response.status).toEqual(200);
		expect(response.type).toEqual('text/plain');
		const lines = toLines(response);
		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_waiting 0');
		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_active 0');
		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_completed 0');
		expect(lines).toContain('n8n_test_scaling_mode_queue_jobs_failed 0');
	});
	it('should set queue metrics in response to `job-counts-updated` event', async () => {
		prometheusService.enableMetric('queue');
		config_2.default.set('executions.mode', 'queue');
		await prometheusService.init(server.app);
		eventService.emit('job-counts-updated', { waiting: 1, active: 2, completed: 0, failed: 0 });
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
		const workflow = (0, backend_test_utils_1.newWorkflow)({ active: true });
		await (0, backend_test_utils_1.createWorkflow)(workflow);
		const workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
		const activeWorkflowCount = await workflowRepository.getActiveCount();
		expect(activeWorkflowCount).toBe(1);
		response = await agent.get('/metrics');
		lines = toLines(response);
		expect(lines).toContain('n8n_test_active_workflow_count 0');
		const cacheService = di_1.Container.get(cache_service_1.CacheService);
		await cacheService.delete('metrics:active-workflow-count');
		response = await agent.get('/metrics');
		lines = toLines(response);
		expect(lines).toContain('n8n_test_active_workflow_count 1');
	});
});
//# sourceMappingURL=prometheus-metrics.test.js.map
