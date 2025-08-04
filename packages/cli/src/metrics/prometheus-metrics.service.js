'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.PrometheusMetricsService = void 0;
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const express_prom_bundle_1 = __importDefault(require('express-prom-bundle'));
const luxon_1 = require('luxon');
const n8n_core_1 = require('n8n-core');
const prom_client_1 = __importDefault(require('prom-client'));
const parse_1 = __importDefault(require('semver/functions/parse'));
const config_2 = __importDefault(require('@/config'));
const constants_2 = require('@/constants');
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const event_service_1 = require('@/events/event.service');
const cache_service_1 = require('@/services/cache/cache.service');
let PrometheusMetricsService = class PrometheusMetricsService {
	constructor(
		cacheService,
		eventBus,
		globalConfig,
		eventService,
		instanceSettings,
		workflowRepository,
	) {
		this.cacheService = cacheService;
		this.eventBus = eventBus;
		this.globalConfig = globalConfig;
		this.eventService = eventService;
		this.instanceSettings = instanceSettings;
		this.workflowRepository = workflowRepository;
		this.counters = {};
		this.gauges = {};
		this.prefix = this.globalConfig.endpoints.metrics.prefix;
		this.includes = {
			metrics: {
				default: this.globalConfig.endpoints.metrics.includeDefaultMetrics,
				routes: this.globalConfig.endpoints.metrics.includeApiEndpoints,
				cache: this.globalConfig.endpoints.metrics.includeCacheMetrics,
				logs: this.globalConfig.endpoints.metrics.includeMessageEventBusMetrics,
				queue: this.globalConfig.endpoints.metrics.includeQueueMetrics,
			},
			labels: {
				credentialsType: this.globalConfig.endpoints.metrics.includeCredentialTypeLabel,
				nodeType: this.globalConfig.endpoints.metrics.includeNodeTypeLabel,
				workflowId: this.globalConfig.endpoints.metrics.includeWorkflowIdLabel,
				apiPath: this.globalConfig.endpoints.metrics.includeApiPathLabel,
				apiMethod: this.globalConfig.endpoints.metrics.includeApiMethodLabel,
				apiStatusCode: this.globalConfig.endpoints.metrics.includeApiStatusCodeLabel,
				workflowName: this.globalConfig.endpoints.metrics.includeWorkflowNameLabel,
			},
		};
	}
	async init(app) {
		prom_client_1.default.register.clear();
		this.initDefaultMetrics();
		this.initN8nVersionMetric();
		this.initCacheMetrics();
		this.initEventBusMetrics();
		this.initRouteMetrics(app);
		this.initQueueMetrics();
		this.initActiveWorkflowCountMetric();
		this.mountMetricsEndpoint(app);
	}
	enableMetric(metric) {
		this.includes.metrics[metric] = true;
	}
	disableMetric(metric) {
		this.includes.metrics[metric] = false;
	}
	disableAllMetrics() {
		for (const metric in this.includes.metrics) {
			this.includes.metrics[metric] = false;
		}
	}
	enableLabels(labels) {
		for (const label of labels) {
			this.includes.labels[label] = true;
		}
	}
	disableAllLabels() {
		for (const label in this.includes.labels) {
			this.includes.labels[label] = false;
		}
	}
	initN8nVersionMetric() {
		const n8nVersion = (0, parse_1.default)(constants_2.N8N_VERSION ?? '0.0.0');
		if (!n8nVersion) return;
		const versionGauge = new prom_client_1.default.Gauge({
			name: this.prefix + 'version_info',
			help: 'n8n version info.',
			labelNames: ['version', 'major', 'minor', 'patch'],
		});
		const { version, major, minor, patch } = n8nVersion;
		versionGauge.set({ version: 'v' + version, major, minor, patch }, 1);
	}
	initDefaultMetrics() {
		if (!this.includes.metrics.default) return;
		prom_client_1.default.collectDefaultMetrics({
			prefix: this.globalConfig.endpoints.metrics.prefix,
		});
	}
	initRouteMetrics(app) {
		if (!this.includes.metrics.routes) return;
		const metricsMiddleware = (0, express_prom_bundle_1.default)({
			autoregister: false,
			includeUp: false,
			includePath: this.includes.labels.apiPath,
			includeMethod: this.includes.labels.apiMethod,
			includeStatusCode: this.includes.labels.apiStatusCode,
			httpDurationMetricName: this.prefix + 'http_request_duration_seconds',
		});
		const activityGauge = new prom_client_1.default.Gauge({
			name: this.prefix + 'last_activity',
			help: 'last instance activity (backend request) in Unix time (seconds).',
		});
		activityGauge.set(luxon_1.DateTime.now().toUnixInteger());
		app.use(
			[
				'/api/',
				`/${this.globalConfig.endpoints.rest}/`,
				`/${this.globalConfig.endpoints.webhook}/`,
				`/${this.globalConfig.endpoints.webhookWaiting}/`,
				`/${this.globalConfig.endpoints.webhookTest}/`,
				`/${this.globalConfig.endpoints.form}/`,
				`/${this.globalConfig.endpoints.formWaiting}/`,
				`/${this.globalConfig.endpoints.formTest}/`,
			],
			async (req, res, next) => {
				activityGauge.set(luxon_1.DateTime.now().toUnixInteger());
				await metricsMiddleware(req, res, next);
			},
		);
	}
	mountMetricsEndpoint(app) {
		app.get('/metrics', async (_req, res) => {
			const metrics = await prom_client_1.default.register.metrics();
			res.setHeader('Content-Type', prom_client_1.default.register.contentType);
			res.send(metrics).end();
		});
	}
	initCacheMetrics() {
		if (!this.includes.metrics.cache) return;
		const [hitsConfig, missesConfig, updatesConfig] = ['hits', 'misses', 'updates'].map((kind) => ({
			name: this.prefix + 'cache_' + kind + '_total',
			help: `Total number of cache ${kind}.`,
			labelNames: ['cache'],
		}));
		this.counters.cacheHitsTotal = new prom_client_1.default.Counter(hitsConfig);
		this.counters.cacheHitsTotal.inc(0);
		this.cacheService.on('metrics.cache.hit', () => this.counters.cacheHitsTotal?.inc(1));
		this.counters.cacheMissesTotal = new prom_client_1.default.Counter(missesConfig);
		this.counters.cacheMissesTotal.inc(0);
		this.cacheService.on('metrics.cache.miss', () => this.counters.cacheMissesTotal?.inc(1));
		this.counters.cacheUpdatesTotal = new prom_client_1.default.Counter(updatesConfig);
		this.counters.cacheUpdatesTotal.inc(0);
		this.cacheService.on('metrics.cache.update', () => this.counters.cacheUpdatesTotal?.inc(1));
	}
	toCounter(event) {
		const { eventName } = event;
		if (!this.counters[eventName]) {
			const metricName = this.prefix + eventName.replace('n8n.', '').replace(/\./g, '_') + '_total';
			if (!prom_client_1.default.validateMetricName(metricName)) {
				this.counters[eventName] = null;
				return null;
			}
			const labels = this.toLabels(event);
			const counter = new prom_client_1.default.Counter({
				name: metricName,
				help: `Total number of ${eventName} events.`,
				labelNames: Object.keys(labels),
			});
			this.counters[eventName] = counter;
		}
		return this.counters[eventName];
	}
	initEventBusMetrics() {
		if (!this.includes.metrics.logs) return;
		this.eventBus.on('metrics.eventBus.event', (event) => {
			const counter = this.toCounter(event);
			if (!counter) return;
			const labels = this.toLabels(event);
			counter.inc(labels, 1);
		});
	}
	initQueueMetrics() {
		if (
			!this.includes.metrics.queue ||
			config_2.default.getEnv('executions.mode') !== 'queue' ||
			this.instanceSettings.instanceType !== 'main'
		) {
			return;
		}
		this.gauges.waiting = new prom_client_1.default.Gauge({
			name: this.prefix + 'scaling_mode_queue_jobs_waiting',
			help: 'Current number of enqueued jobs waiting for pickup in scaling mode.',
		});
		this.gauges.active = new prom_client_1.default.Gauge({
			name: this.prefix + 'scaling_mode_queue_jobs_active',
			help: 'Current number of jobs being processed across all workers in scaling mode.',
		});
		this.counters.completed = new prom_client_1.default.Counter({
			name: this.prefix + 'scaling_mode_queue_jobs_completed',
			help: 'Total number of jobs completed across all workers in scaling mode since instance start.',
		});
		this.counters.failed = new prom_client_1.default.Counter({
			name: this.prefix + 'scaling_mode_queue_jobs_failed',
			help: 'Total number of jobs failed across all workers in scaling mode since instance start.',
		});
		this.gauges.waiting.set(0);
		this.gauges.active.set(0);
		this.counters.completed.inc(0);
		this.counters.failed.inc(0);
		this.eventService.on('job-counts-updated', (jobCounts) => {
			this.gauges.waiting.set(jobCounts.waiting);
			this.gauges.active.set(jobCounts.active);
			this.counters.completed?.inc(jobCounts.completed);
			this.counters.failed?.inc(jobCounts.failed);
		});
	}
	initActiveWorkflowCountMetric() {
		const workflowRepository = this.workflowRepository;
		const cacheService = this.cacheService;
		const cacheKey = 'metrics:active-workflow-count';
		const cacheTtl =
			this.globalConfig.endpoints.metrics.activeWorkflowCountInterval *
			constants_1.Time.seconds.toMilliseconds;
		new prom_client_1.default.Gauge({
			name: this.prefix + 'active_workflow_count',
			help: 'Total number of active workflows.',
			async collect() {
				const value = await cacheService.get(cacheKey);
				const numericValue = value !== undefined ? parseInt(value, 10) : undefined;
				if (numericValue !== undefined && Number.isFinite(numericValue)) {
					this.set(numericValue);
				} else {
					const activeWorkflowCount = await workflowRepository.getActiveCount();
					await cacheService.set(cacheKey, activeWorkflowCount.toString(), cacheTtl);
					this.set(activeWorkflowCount);
				}
			},
		});
	}
	toLabels(event) {
		const { __type, eventName, payload } = event;
		switch (__type) {
			case '$$EventMessageAudit':
				if (eventName.startsWith('n8n.audit.user.credentials')) {
					return this.includes.labels.credentialsType
						? {
								credential_type: String(
									(event.payload.credentialType ?? 'unknown').replace(/\./g, '_'),
								),
							}
						: {};
				}
				if (eventName.startsWith('n8n.audit.workflow')) {
					return this.buildWorkflowLabels(payload);
				}
				break;
			case '$$EventMessageNode':
				const nodeLabels = this.buildWorkflowLabels(payload);
				if (this.includes.labels.nodeType) {
					nodeLabels.node_type = String(
						(payload.nodeType ?? 'unknown').replace('n8n-nodes-', '').replace(/\./g, '_'),
					);
				}
				return nodeLabels;
			case '$$EventMessageWorkflow':
				return this.buildWorkflowLabels(payload);
		}
		return {};
	}
	buildWorkflowLabels(payload) {
		const labels = {};
		if (this.includes.labels.workflowId) {
			labels.workflow_id = String(payload.workflowId ?? 'unknown');
		}
		if (this.includes.labels.workflowName) {
			labels.workflow_name = String(payload.workflowName ?? 'unknown');
		}
		return labels;
	}
};
exports.PrometheusMetricsService = PrometheusMetricsService;
exports.PrometheusMetricsService = PrometheusMetricsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			cache_service_1.CacheService,
			message_event_bus_1.MessageEventBus,
			config_1.GlobalConfig,
			event_service_1.EventService,
			n8n_core_1.InstanceSettings,
			db_1.WorkflowRepository,
		]),
	],
	PrometheusMetricsService,
);
//# sourceMappingURL=prometheus-metrics.service.js.map
