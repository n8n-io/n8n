/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateTime } from 'luxon';
import { jsonParse } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import {
	EventMessageGroups,
	EventMessageNames,
	EventMessageLevel,
	EventMessageSeverity,
} from '../types/EventMessageTypes';
import { SerializerImplementation } from 'threads';

export interface EventMessageSerialized {
	[key: string]: any | undefined;
	__type?: '$$EventMessage';
	__payloadtype?: string;
	id?: string | undefined;
	ts?: string | undefined;
	eventName: EventMessageNames;
	level?: EventMessageLevel | undefined;
	severity?: EventMessageSeverity | undefined;
	payload?: any | undefined;
}

export const isEventMessage = (candidate: unknown): candidate is EventMessage => {
	const o = candidate as EventMessage;
	if (!o) return false;
	return (
		o.eventName !== undefined &&
		o.id !== undefined &&
		o.ts !== undefined &&
		o.getEventGroup !== undefined
	);
};

export const isEventMessageSerialized = (
	candidate: unknown,
): candidate is EventMessageSerialized => {
	const o = candidate as EventMessageSerialized;
	if (!o) return false;
	return o.eventName !== undefined && o.id !== undefined && o.ts !== undefined;
};

export class EventMessage {
	readonly __type: '$$EventMessage';

	readonly id: string;

	readonly ts: DateTime;

	readonly eventName: EventMessageNames;

	readonly level: EventMessageLevel;

	readonly severity: EventMessageSeverity;

	readonly __payloadtype: string;

	payload: any;

	/**
	 * Creates a new instance of Event Message
	 * @param props.eventName The specific events name e.g. "n8n.workflow.workflowStarted"
	 * @param props.level The log level, defaults to. "info"
	 * @param props.severity The severity of the event e.g. "normal"
	 * @returns instance of EventMessage
	 */
	constructor(props: EventMessageSerialized) {
		this.id = props.id ?? uuid();
		this.ts = props.ts ? DateTime.fromISO(props.ts) : DateTime.now();
		this.eventName = props.eventName;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.payload = props.payload;
		this.__payloadtype = props.__payloadtype ?? '$$EventMessageAny';
		this.level = props.level ?? 'info';
		this.severity = props.severity ?? 'normal';
	}

	getEventGroup(): EventMessageGroups | undefined {
		const matches = this.eventName.match(/^[\w\s]+.[\w\s]+/);
		if (matches && matches?.length > 0) {
			return matches[0] as EventMessageGroups;
		}
		return;
	}

	getEventName(): EventMessageNames {
		return this.eventName;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	serialize(): EventMessageSerialized {
		// TODO: filter payload for sensitive info here?
		return {
			__type: '$$EventMessage',
			id: this.id,
			ts: this.ts.toISO(),
			eventName: this.eventName,
			level: this.level,
			severity: this.severity,
			payload: JSON.stringify(this.payload),
		};
	}

	static deserialize(serializedData: EventMessageSerialized): EventMessage {
		return new EventMessage(serializedData);
	}

	static fromJSONSerializedString(s: string): EventMessage {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
		const json = jsonParse<EventMessageSerialized>(s);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return new EventMessage(json);
	}

	/**
	 * Combines the timestamp as milliseconds with the id to generate a unique key that can be ordered by time, alphabetically
	 * @returns database key
	 */
	getKey(): string {
		return EventMessage.getKey(this);
	}

	/**
	 * Static version of EventMessage.getKey()
	 * Combines the timestamp as milliseconds with the id to generate a unique key that can be ordered by time, alphabetically
	 * @returns database key
	 */
	static getKey(msg: EventMessage): string {
		return `${msg.ts.toMillis()}-${msg.id}`;
	}
}

export const messageEventSerializer: SerializerImplementation = {
	deserialize(message, defaultHandler) {
		if (isEventMessageSerialized(message)) {
			return EventMessage.deserialize(message);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return defaultHandler(message);
		}
	},
	serialize(thing, defaultHandler) {
		if (thing instanceof EventMessage) {
			return thing.serialize();
		} else {
			return defaultHandler(thing);
		}
	},
};
