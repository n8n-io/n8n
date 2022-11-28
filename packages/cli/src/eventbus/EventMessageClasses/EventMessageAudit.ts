import { AbstractEventMessage, isEventMessageOptionsWithType } from './AbstractEventMessage';
import { EventMessageTypeNames, JsonObject } from 'n8n-workflow';
import { AbstractEventPayload } from './AbstractEventPayload';
import { AbstractEventMessageOptions } from './AbstractEventMessageOptions';

export const eventNamesAudit = [
	'n8n.audit.created',
	'n8n.audit.updated',
	'n8n.audit.deleted',
] as const;
export type EventNamesAuditType = typeof eventNamesAudit[number];

// --------------------------------------
// EventMessage class for Audit events
// --------------------------------------
export class EventPayloadAudit extends AbstractEventPayload {
	id: number;

	msg: string;
}

export class EventMessageAuditOptions extends AbstractEventMessageOptions {
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
