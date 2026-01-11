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
		// Import controller to register routes
		await import('./event-bus.controller');

		// Load destinations from database and add them to the event bus
		// Note: MessageEventBus.initialize() and LogStreamingEventRelay.init()
		// are called by the commands (worker, webhook) and server before modules are loaded
		const { LogStreamingDestinationService } = await import('./log-streaming-destination.service');
		const destinationService = Container.get(LogStreamingDestinationService);
		await destinationService.loadDestinationsFromDb();
	}

	async entities() {
		const { EventDestinations } = await import('./database/entities/event-destinations.entity');
		return [EventDestinations];
	}

	async settings() {
		const { LogStreamingSettings } = await import('./log-streaming.settings');
		return Container.get(LogStreamingSettings).settings();
	}
}
