/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateTime } from 'luxon';
import { JsonObject } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import * as EventMessageTypes from '../types/EventMessageTypes';

export interface EventMessageOptions {
	id?: string;
	ts?: DateTime;
	eventName: EventMessageTypes.EventMessageNames;
	level?: EventMessageTypes.EventMessageLevel;
	payload?: AbstractEventPayload;
}

// export interface EventMessageSerialized extends Required<Omit<EventMessageOptions, 'payload'>> {
export interface EventMessageSerialized extends Required<Omit<EventMessageOptions, 'ts'>> {
	[key: string]: any | undefined;
	__type: string;
	ts: string;
	payload: AbstractEventPayload;
}

export const isEventMessage = (candidate: unknown): candidate is AbstractEventMessage => {
	const o = candidate as AbstractEventMessage;
	if (!o) return false;
	return (
		o.eventName !== undefined &&
		o.id !== undefined &&
		o.ts !== undefined &&
		o.getEventGroup !== undefined
	);
};

export const isEventMessageOptions = (candidate: unknown): candidate is EventMessageOptions => {
	const o = candidate as EventMessageOptions;
	if (!o) return false;
	if (o.eventName !== undefined) {
		if (o.eventName.match(/^[\w\s]+\.[\w\s]+\.[\w\s]+/)) {
			return true;
		}
	}
	return false;
};

export const isEventMessageSerialized = (
	candidate: unknown,
	expectedType?: string | undefined,
): candidate is EventMessageSerialized => {
	const o = candidate as EventMessageSerialized;
	if (!o) return false;
	if (expectedType) {
		return o.eventName !== undefined && o.__type !== undefined && o.__type === expectedType;
	} else {
		return o.eventName !== undefined && o.__type !== undefined;
	}
};

export abstract class AbstractEventPayload {
	msg?: string;
}

export abstract class AbstractEventMessage {
	abstract readonly __type: string;

	id: string;

	ts: DateTime;

	eventName: EventMessageTypes.EventMessageNames;

	level: EventMessageTypes.EventMessageLevel;

	abstract payload: AbstractEventPayload;

	/**
	 * Creates a new instance of Event Message
	 * @param props.eventName The specific events name e.g. "n8n.workflow.workflowStarted"
	 * @param props.level The log level, defaults to. "info"
	 * @param props.severity The severity of the event e.g. "normal"
	 * @returns instance of EventMessage
	 */
	constructor(options: EventMessageOptions | EventMessageSerialized) {
		this.setOptionsOrDefault(options);
	}

	setOptionsOrDefault(options: EventMessageOptions | EventMessageSerialized) {
		this.id = options.id ?? uuid();
		this.eventName = options.eventName;
		this.level = options.level ?? 'info';
		if (typeof options.ts === 'string') {
			this.ts = DateTime.fromISO(options.ts) ?? DateTime.now();
		} else {
			this.ts = options.ts ?? DateTime.now();
		}
	}

	getEventGroup(): EventMessageTypes.EventMessageGroups | undefined {
		const matches = this.eventName.match(/^[\w\s]+\.[\w\s]+/);
		if (matches && matches?.length > 0) {
			return matches[0] as EventMessageTypes.EventMessageGroups;
		}
		return;
	}

	getEventName(): EventMessageTypes.EventMessageNames {
		return this.eventName;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	abstract serialize(): EventMessageSerialized;

	abstract deserialize(data: JsonObject): this;

	abstract setPayload(payload: AbstractEventPayload): this;
}
