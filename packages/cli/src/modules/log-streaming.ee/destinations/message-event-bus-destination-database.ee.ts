import { Container } from '@n8n/di';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import type {
	MessageEventBus,
	MessageWithCallback,
} from '@/eventbus/message-event-bus/message-event-bus';

import { MessageEventBusDestination } from './message-event-bus-destination.ee';
import { AuditLogEventRepository } from '../database/repositories/audit-log-event.repository';

/**
 * Debug destination that persists every received event into the `audit_log_event`
 * table. Auto-provisioned in-memory when N8N_AUDIT_LOG_DB_SINK=true; not stored in
 * the destinations config, so it needs no serialize/deserialize.
 */
export class MessageEventBusDestinationDatabase extends MessageEventBusDestination {
	constructor(eventBusInstance: MessageEventBus, options: MessageEventBusDestinationOptions) {
		super(eventBusInstance, options);
		this.label = options.label ?? 'Audit Log Database';
		this.__type = MessageEventBusDestinationTypeNames.database;
	}

	async receiveFromEventBus(emitterPayload: MessageWithCallback): Promise<boolean> {
		const { msg, confirmCallback } = emitterPayload;
		const payload = this.anonymizeAuditMessages ? msg.anonymize() : msg.payload;

		const repository = Container.get(AuditLogEventRepository);
		await repository.store(
			repository.create({
				id: msg.id,
				eventName: msg.eventName,
				message: msg.message,
				ts: msg.ts.toJSDate(),
				payload,
			}),
		);

		confirmCallback(msg, { id: this.id, name: this.label });
		return true;
	}
}
