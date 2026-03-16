import { hostname } from 'node:os';

import { describe, it, expect, beforeEach } from 'vitest';
import { Registry } from 'prom-client';

import { MetricsService } from '../metrics.service';

describe('MetricsService', () => {
	let metrics: MetricsService;
	let registry: Registry;

	beforeEach(() => {
		registry = new Registry();
		metrics = new MetricsService(registry);
	});

	it('should add instance_name default label from hostname', async () => {
		metrics.executionTotal.inc({ status: 'completed' });

		const result = await registry.getSingleMetricAsString('execution_total');
		expect(result).toContain(`instance_name="${hostname()}"`);
	});

	it('should increment execution_total counter', async () => {
		metrics.executionTotal.inc({ status: 'completed' });
		metrics.executionTotal.inc({ status: 'completed' });
		metrics.executionTotal.inc({ status: 'failed' });

		const result = await registry.getSingleMetricAsString('execution_total');
		expect(result).toContain('status="completed"');
		expect(result).toContain('status="failed"');
		expect(result).toMatch(/execution_total\{.*status="completed".*\} 2/);
		expect(result).toMatch(/execution_total\{.*status="failed".*\} 1/);
	});

	it('should track execution_active gauge', async () => {
		metrics.executionActive.set(5);

		const result = await registry.getSingleMetricAsString('execution_active');
		expect(result).toMatch(/execution_active\{.*\} 5/);
	});

	it('should observe step_execution_duration_ms histogram', async () => {
		metrics.stepExecutionDuration.observe(42);
		metrics.stepExecutionDuration.observe(100);

		const result = await registry.getSingleMetricAsString('step_execution_duration_ms');
		expect(result).toMatch(/step_execution_duration_ms_count\{.*\} 2/);
	});

	it('should increment api_requests_total counter with labels', async () => {
		metrics.apiRequestsTotal.inc({ method: 'GET', path: '/api/workflows', status_code: '200' });
		metrics.apiRequestsTotal.inc({ method: 'POST', path: '/api/workflows', status_code: '201' });
		metrics.apiRequestsTotal.inc({ method: 'GET', path: '/api/workflows/:id', status_code: '404' });

		const result = await registry.getSingleMetricAsString('api_requests_total');
		expect(result).toContain('method="GET"');
		expect(result).toContain('path="/api/workflows"');
		expect(result).toContain('status_code="200"');
		expect(result).toContain('status_code="404"');
	});

	it('should observe api_request_duration_ms histogram', async () => {
		metrics.apiRequestDuration.observe({ method: 'GET', path: '/api/workflows' }, 15);
		metrics.apiRequestDuration.observe({ method: 'GET', path: '/api/workflows' }, 42);

		const result = await registry.getSingleMetricAsString('api_request_duration_ms');
		expect(result).toMatch(
			/api_request_duration_ms_count\{.*method="GET".*path="\/api\/workflows".*\} 2/,
		);
	});

	it('should set executions_by_status gauge', async () => {
		metrics.executionsByStatus.set({ status: 'running' }, 5);
		metrics.executionsByStatus.set({ status: 'completed' }, 10);

		const result = await registry.getSingleMetricAsString('executions_by_status');
		expect(result).toMatch(/executions_by_status\{.*status="running".*\} 5/);
		expect(result).toMatch(/executions_by_status\{.*status="completed".*\} 10/);
	});

	it('should set step_executions_by_status gauge', async () => {
		metrics.stepExecutionsByStatus.set({ status: 'queued' }, 3);
		metrics.stepExecutionsByStatus.set({ status: 'running' }, 7);

		const result = await registry.getSingleMetricAsString('step_executions_by_status');
		expect(result).toMatch(/step_executions_by_status\{.*status="queued".*\} 3/);
		expect(result).toMatch(/step_executions_by_status\{.*status="running".*\} 7/);
	});

	it('should return all metrics as string', async () => {
		metrics.executionTotal.inc({ status: 'completed' });
		const output = await metrics.getMetrics();
		expect(output).toContain('execution_total');
		expect(output).toContain('step_execution_total');
		expect(output).toContain('api_requests_total');
		expect(output).toContain('api_request_duration_ms');
		expect(output).toContain('webhook_requests_total');
		expect(output).toContain('executions_by_status');
		expect(output).toContain('step_executions_by_status');
		expect(output).toContain('errors_total');
		expect(output).toContain('sse_connected_clients');
		expect(output).toContain('events_published_total');
	});

	it('should return correct content type', () => {
		expect(metrics.getContentType()).toContain('text/plain');
	});
});
