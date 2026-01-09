import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

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

		// Import and initialize the service
		const { MessageEventBus } = await import('./message-event-bus');
		const { LogStreamingEventRelay } = await import('./log-streaming.event-relay');

		const service = Container.get(MessageEventBus);
		const relay = Container.get(LogStreamingEventRelay);
		const instanceSettings = Container.get(InstanceSettings);

		// Initialize with appropriate options based on process type
		const initOptions: {
			skipRecoveryPass?: boolean;
			workerId?: string;
			webhookProcessorId?: string;
		} = {};

		// Worker processes need workerId
		if (instanceSettings.instanceType === 'worker') {
			initOptions.workerId = instanceSettings.hostId;
		}

		// Webhook processes need webhookProcessorId
		if (instanceSettings.instanceType === 'webhook') {
			initOptions.webhookProcessorId = instanceSettings.hostId;
		}

		// Main process runs recovery pass
		if (instanceSettings.instanceType === 'main') {
			initOptions.skipRecoveryPass = false;
		} else {
			// Worker/webhook skip recovery
			initOptions.skipRecoveryPass = true;
		}

		await service.initialize(initOptions);
		relay.init();
	}

	async entities() {
		const { EventDestinations } = await import('./database/entities/event-destinations.entity');
		return [EventDestinations];
	}

	async settings() {
		const { LogStreamingSettings } = await import('./log-streaming.settings');
		return Container.get(LogStreamingSettings).settings();
	}

	@OnShutdown()
	async shutdown() {
		const { MessageEventBus } = await import('./message-event-bus');
		const service = Container.get(MessageEventBus);

		// Stop log writer
		if (service.logWriter) {
			await service.logWriter.close();
		}

		// Stop all destinations
		for (const destination of Object.values(service.destinations)) {
			await destination.close();
		}
	}
}
