import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import { Counter } from 'prom-client';
import type { Mock } from 'vitest';

import { McpPostSaveMetricsService } from '../mcp-post-save-metrics.service';

vi.mock('prom-client');

describe('McpPostSaveMetricsService', () => {
	let config: PrometheusMetricsConfig;
	let service: McpPostSaveMetricsService;
	let mockCounterInc: Mock;

	beforeEach(() => {
		config = mockInstance(PrometheusMetricsConfig, {
			prefix: 'n8n_',
		});
		service = new McpPostSaveMetricsService(config);
		mockCounterInc = vi.fn();
		Counter.prototype.inc = mockCounterInc;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should not construct Counter on service instantiation', () => {
		expect(Counter).not.toHaveBeenCalled();
	});

	it('should lazily initialize Counter on first incrementPostSaveFailure call', () => {
		const error = new Error('Test error');
		service.incrementPostSaveFailure('create', error);

		expect(Counter).toHaveBeenCalledTimes(1);
		expect(Counter).toHaveBeenCalledWith({
			name: 'n8n_mcp_post_save_failures_total',
			help: 'MCP workflow-builder tool failures that occurred after a successful database write (hooks, telemetry, auto-assign). The client still receives success — these are observability-only.',
			labelNames: ['tool', 'error_type'],
		});
	});

	it('should reuse Counter instance on subsequent calls', () => {
		service.incrementPostSaveFailure('create', new Error('First error'));
		service.incrementPostSaveFailure('update', new Error('Second error'));

		expect(Counter).toHaveBeenCalledTimes(1);
		expect(mockCounterInc).toHaveBeenCalledTimes(2);
	});

	it('should support custom metric prefix from config', () => {
		config.prefix = 'custom_prefix_';
		service.incrementPostSaveFailure('create', new Error('Error'));

		expect(Counter).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'custom_prefix_mcp_post_save_failures_total',
			}),
		);
	});

	describe('tool label parameter', () => {
		it('should pass tool=create to metric increment', () => {
			service.incrementPostSaveFailure('create', new Error('Fail'));

			expect(mockCounterInc).toHaveBeenCalledWith({ tool: 'create', error_type: 'Error' }, 1);
		});

		it('should pass tool=update to metric increment', () => {
			service.incrementPostSaveFailure('update', new Error('Fail'));

			expect(mockCounterInc).toHaveBeenCalledWith({ tool: 'update', error_type: 'Error' }, 1);
		});
	});

	describe('error type resolution', () => {
		it('should extract constructor name for Error instance', () => {
			service.incrementPostSaveFailure('create', new Error('Something went wrong'));

			expect(mockCounterInc).toHaveBeenCalledWith({ tool: 'create', error_type: 'Error' }, 1);
		});

		it('should extract constructor name for TypeError instance', () => {
			service.incrementPostSaveFailure('create', new TypeError('Type mismatch'));

			expect(mockCounterInc).toHaveBeenCalledWith({ tool: 'create', error_type: 'TypeError' }, 1);
		});

		it('should extract constructor name for custom Error subclass', () => {
			class CustomPostSaveError extends Error {}
			service.incrementPostSaveFailure('create', new CustomPostSaveError('Custom error'));

			expect(mockCounterInc).toHaveBeenCalledWith(
				{ tool: 'create', error_type: 'CustomPostSaveError' },
				1,
			);
		});

		it('should use raw string when error is a string', () => {
			service.incrementPostSaveFailure('update', 'Hook execution timed out');

			expect(mockCounterInc).toHaveBeenCalledWith(
				{ tool: 'update', error_type: 'Hook execution timed out' },
				1,
			);
		});

		it.each([
			['null', null],
			['undefined', undefined],
			['number', 500],
			['boolean', false],
			['plain object', { message: 'Failed' }],
			['array', ['an', 'error']],
		])('should fallback to "Unknown" when error is %s', (_, errorValue) => {
			service.incrementPostSaveFailure('create', errorValue);

			expect(mockCounterInc).toHaveBeenCalledWith({ tool: 'create', error_type: 'Unknown' }, 1);
		});
	});
});
