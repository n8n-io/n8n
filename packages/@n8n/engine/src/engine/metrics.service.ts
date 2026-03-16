import { hostname } from 'node:os';

import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

export class MetricsService {
	// ---------------------------------------------------------------------------
	// Execution metrics
	// ---------------------------------------------------------------------------

	readonly executionTotal: Counter;
	readonly executionActive: Gauge;
	readonly executionDuration: Histogram;

	// ---------------------------------------------------------------------------
	// Step metrics
	// ---------------------------------------------------------------------------

	readonly stepExecutionTotal: Counter;
	readonly stepExecutionDuration: Histogram;
	readonly stepQueueDepth: Gauge;
	readonly stepQueueClaimLatency: Histogram;
	readonly stepRetriesTotal: Counter;

	// ---------------------------------------------------------------------------
	// API request metrics
	// ---------------------------------------------------------------------------

	readonly apiRequestsTotal: Counter;
	readonly apiRequestDuration: Histogram;

	// ---------------------------------------------------------------------------
	// Webhook metrics
	// ---------------------------------------------------------------------------

	readonly webhookRequestsTotal: Counter;
	readonly webhookDuration: Histogram;

	// ---------------------------------------------------------------------------
	// DB-derived metrics
	// ---------------------------------------------------------------------------

	readonly executionsByStatus: Gauge;
	readonly stepExecutionsByStatus: Gauge;

	// ---------------------------------------------------------------------------
	// Error metrics
	// ---------------------------------------------------------------------------

	readonly errorsTotal: Counter;

	// ---------------------------------------------------------------------------
	// Event delivery metrics
	// ---------------------------------------------------------------------------

	readonly sseConnectedClients: Gauge;
	readonly eventsPublishedTotal: Counter;
	readonly redisRelayLatency: Histogram;

	constructor(private readonly registry: Registry = new Registry()) {
		// Set instance label so Prometheus shows container hostname instead of IP
		this.registry.setDefaultLabels({ instance_name: hostname() });

		// Execution metrics
		this.executionTotal = new Counter({
			name: 'execution_total',
			help: 'Total number of workflow executions',
			labelNames: ['status'],
			registers: [this.registry],
		});

		this.executionActive = new Gauge({
			name: 'execution_active',
			help: 'Number of currently active workflow executions',
			registers: [this.registry],
		});

		this.executionDuration = new Histogram({
			name: 'execution_duration_ms',
			help: 'Duration of workflow executions in milliseconds',
			labelNames: ['workflow_id'],
			buckets: [100, 500, 1000, 5000, 10000, 30000, 60000, 120000, 300000],
			registers: [this.registry],
		});

		// Step metrics
		this.stepExecutionTotal = new Counter({
			name: 'step_execution_total',
			help: 'Total number of step executions',
			labelNames: ['status', 'step_type'],
			registers: [this.registry],
		});

		this.stepExecutionDuration = new Histogram({
			name: 'step_execution_duration_ms',
			help: 'Duration of step executions in milliseconds',
			registers: [this.registry],
		});

		this.stepQueueDepth = new Gauge({
			name: 'step_queue_depth',
			help: 'Current depth of the step execution queue',
			registers: [this.registry],
		});

		this.stepQueueClaimLatency = new Histogram({
			name: 'step_queue_claim_latency_ms',
			help: 'Latency of claiming steps from the queue in milliseconds',
			registers: [this.registry],
		});

		this.stepRetriesTotal = new Counter({
			name: 'step_retries_total',
			help: 'Total number of step retries',
			registers: [this.registry],
		});

		// API request metrics
		this.apiRequestsTotal = new Counter({
			name: 'api_requests_total',
			help: 'Total number of API requests',
			labelNames: ['method', 'path', 'status_code'],
			registers: [this.registry],
		});

		this.apiRequestDuration = new Histogram({
			name: 'api_request_duration_ms',
			help: 'Duration of API requests in milliseconds',
			labelNames: ['method', 'path'],
			buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
			registers: [this.registry],
		});

		// Webhook metrics
		this.webhookRequestsTotal = new Counter({
			name: 'webhook_requests_total',
			help: 'Total number of incoming webhook requests',
			labelNames: ['method', 'path', 'status_code'],
			registers: [this.registry],
		});

		this.webhookDuration = new Histogram({
			name: 'webhook_duration_ms',
			help: 'Duration of webhook request processing in milliseconds',
			registers: [this.registry],
		});

		// DB-derived metrics
		this.executionsByStatus = new Gauge({
			name: 'executions_by_status',
			help: 'Current count of executions grouped by status',
			labelNames: ['status'],
			registers: [this.registry],
		});

		this.stepExecutionsByStatus = new Gauge({
			name: 'step_executions_by_status',
			help: 'Current count of step executions grouped by status',
			labelNames: ['status'],
			registers: [this.registry],
		});

		// Error metrics
		this.errorsTotal = new Counter({
			name: 'errors_total',
			help: 'Total number of errors by classification',
			labelNames: ['classification'],
			registers: [this.registry],
		});

		// Event delivery metrics
		this.sseConnectedClients = new Gauge({
			name: 'sse_connected_clients',
			help: 'Number of currently connected SSE clients',
			registers: [this.registry],
		});

		this.eventsPublishedTotal = new Counter({
			name: 'events_published_total',
			help: 'Total number of events published',
			labelNames: ['type'],
			registers: [this.registry],
		});

		this.redisRelayLatency = new Histogram({
			name: 'redis_relay_latency_ms',
			help: 'Latency of Redis event relay in milliseconds',
			registers: [this.registry],
		});

		// Collect Node.js default metrics (process CPU, memory, event loop, GC)
		// per engine instance — replaces the need for cAdvisor on macOS
		collectDefaultMetrics({ register: this.registry });
	}

	async getMetrics(): Promise<string> {
		return await this.registry.metrics();
	}

	getContentType(): string {
		return this.registry.contentType;
	}
}
