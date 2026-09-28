import { Logger } from '@n8n/backend-common';
import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';

@Service()
export class McpPostSaveMetricsService {
	constructor(
		private readonly config: PrometheusMetricsConfig,
		private readonly eventService: EventService,
		private readonly logger: Logger,
	) {}

	/**
	 * Emit a low-cardinality post-save failure metric event.
	 * This method must not throw.
	 */
	incrementPostSaveFailure(tool: 'create' | 'update', error: unknown): void {
		try {
			if (!this.config.enable) return;

			const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
			this.eventService.emit('mcp-post-save-failure', { tool, errorType });
		} catch (error) {
			this.logger.debug('Failed to record post-save failure metric', { error });
		}
	}
}
