import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Log Streaming module provides enterprise-grade event logging
 * to external destinations (Webhook, Syslog, Sentry).
 *
 * Requires 'feat:logStreaming' license feature.
 * Runs on main, worker, and webhook process types.
 */
@BackendModule({
	name: 'log-streaming',
	licenseFlag: LICENSE_FEATURES.LOG_STREAMING,
	instanceTypes: ['main', 'worker', 'webhook'],
})
export class LogStreamingModule implements ModuleInterface {
	async init() {
		await import('./log-streaming.controller');

		const { LogStreamingDestinationService } = await import('./log-streaming-destination.service');
		const destinationService = Container.get(LogStreamingDestinationService);
		await destinationService.loadDestinationsFromDb();
		await destinationService.initialize();
	}

	async entities() {
		const { EventDestinations } = await import('./database/entities/event-destination.entity');
		return [EventDestinations];
	}
}
