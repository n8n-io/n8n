import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { PrometheusMetricsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { McpPostSaveMetricsService } from '../mcp-post-save-metrics.service';

describe('McpPostSaveMetricsService', () => {
	let config: PrometheusMetricsConfig;
	let eventService: EventService;
	let logger: Logger;
	let service: McpPostSaveMetricsService;

	beforeEach(() => {
		config = mockInstance(PrometheusMetricsConfig, {
			enable: true,
			prefix: 'n8n_',
		});
		eventService = mock<EventService>();
		logger = mock<Logger>();
		service = new McpPostSaveMetricsService(config, eventService, logger);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('does not emit when metrics are disabled', () => {
		config.enable = false;

		service.incrementPostSaveFailure('create', new Error('Test error'));

		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it('emits a post-save failure event for Error instances', () => {
		service.incrementPostSaveFailure('create', new TypeError('Test error'));

		expect(eventService.emit).toHaveBeenCalledWith('mcp-post-save-failure', {
			tool: 'create',
			errorType: 'TypeError',
		});
	});

	it('uses Unknown for non-Error throws', () => {
		service.incrementPostSaveFailure('update', 'Hook execution timed out');

		expect(eventService.emit).toHaveBeenCalledWith('mcp-post-save-failure', {
			tool: 'update',
			errorType: 'Unknown',
		});
	});

	it('does not throw when event emission fails', () => {
		vi.mocked(eventService.emit).mockImplementationOnce(() => {
			throw new Error('Emitter failed');
		});

		expect(() => service.incrementPostSaveFailure('create', new Error('Test error'))).not.toThrow();
		expect(logger.debug).toHaveBeenCalledWith('Failed to record post-save failure metric', {
			error: expect.any(Error),
		});
	});
});
