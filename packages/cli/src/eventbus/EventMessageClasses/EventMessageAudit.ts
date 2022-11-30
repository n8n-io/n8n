import { AbstractEventMessage, isEventMessageOptionsWithType } from './AbstractEventMessage';
import { EventMessageTypeNames, JsonObject } from 'n8n-workflow';
import { AbstractEventPayload } from './AbstractEventPayload';
import { AbstractEventMessageOptions } from './AbstractEventMessageOptions';

export const eventNamesAudit = [
	'n8n.audit.userCreated',
	'n8n.audit.userUpdated',
	'n8n.audit.userDeleted',
] as const;
export type EventNamesAuditType = typeof eventNamesAudit[number];

// --------------------------------------
// EventMessage class for Audit events
// --------------------------------------
export interface EventPayloadAudit extends AbstractEventPayload {
	msg?: string;

	userId?: string;

	userEmail?: string;
}

export interface EventMessageAuditOptions extends AbstractEventMessageOptions {
	eventName: EventNamesAuditType;

	payload?: EventPayloadAudit;
}

export class EventMessageAudit extends AbstractEventMessage {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
	readonly __type: string = EventMessageTypeNames.audit;

	eventName: EventNamesAuditType;

	payload: EventPayloadAudit;

	constructor(options: EventMessageAuditOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
	}

	setPayload(payload: EventPayloadAudit): this {
		this.payload = payload;
		return this;
	}

	anonymize(): this {
		return this;
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageOptionsWithType(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadAudit);
		}
		return this;
	}
}
