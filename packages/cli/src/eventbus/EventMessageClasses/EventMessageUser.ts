import { AbstractEventMessage, isEventMessageOptionsWithType } from './AbstractEventMessage';
import { EventMessageTypeNames, JsonObject, JsonValue } from 'n8n-workflow';
import { AbstractEventPayload } from './AbstractEventPayload';
import { AbstractEventMessageOptions } from './AbstractEventMessageOptions';

export const eventNamesUser = [
	'n8n.user.created',
	'n8n.user.updated',
	'n8n.user.deleted',
	'n8n.user.invited',
	'n8n.user.reinvited',
	'n8n.user.emailFailed',
] as const;
export type EventNamesUserType = typeof eventNamesUser[number];

// --------------------------------------
// EventMessage class for User events
// --------------------------------------
export interface EventPayloadUser extends AbstractEventPayload {
	msg?: JsonValue;
	userId?: string;
	userEmail?: string;
	firstName?: string;
	lastName?: string;
}

export interface EventMessageUserOptions extends AbstractEventMessageOptions {
	eventName: EventNamesUserType;
	payload?: EventPayloadUser;
}

export class EventMessageUser extends AbstractEventMessage {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
	readonly __type: string = EventMessageTypeNames.user;

	eventName: EventNamesUserType;

	payload: EventPayloadUser;

	constructor(options: EventMessageUserOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
		if (options.anoymize) this.anonymize();
	}

	setPayload(payload: EventPayloadUser): this {
		this.payload = payload;
		return this;
	}

	anonymize(): this {
		this.payload.firstName = '*';
		this.payload.lastName = '*';
		this.payload.userEmail = '*';
		return this;
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageOptionsWithType(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadUser);
		}
		return this;
	}
}
