import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

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
		await import('./log-streaming.controller.js');

		const { LogStreamingDestinationService } = await import(
			'./log-streaming-destination.service.js'
		);
		const destinationService = Container.get(LogStreamingDestinationService);
		await destinationService.loadDestinationsFromDb();
		await destinationService.initialize();

		// Debug sink: persist every event to the audit_log_event table. Opt-in and
		// recreated on every boot, so it lives in-memory only (no config persistence).
		if (process.env.N8N_AUDIT_LOG_DB_SINK === 'true') {
			const { MessageEventBusDestinationDatabase } = await import(
				'./destinations/message-event-bus-destination-database.ee.js'
			);
			const { MessageEventBus } = await import('@/eventbus/message-event-bus/message-event-bus.js');
			destinationService.addInMemoryDestination(
				new MessageEventBusDestinationDatabase(Container.get(MessageEventBus), {
					__type: MessageEventBusDestinationTypeNames.database,
					label: 'Audit Log Database',
					enabled: true,
					subscribedEvents: ['*'],
				}),
			);
		}
	}

	async entities() {
		const { EventDestinations } = await import('./database/entities/event-destination.entity.js');
		const { AuditLogEvent } = await import('./database/entities/audit-log-event.entity.js');
		return [EventDestinations, AuditLogEvent];
	}
}
