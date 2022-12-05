/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateTime } from 'luxon';
import { JsonObject } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { AbstractEventPayload } from './AbstractEventPayload';
import { AbstractEventMessageOptions } from './AbstractEventMessageOptions';

export const isEventMessage = (candidate: unknown): candidate is AbstractEventMessage => {
	const o = candidate as AbstractEventMessage;
	if (!o) return false;
	return (
		o.eventName !== undefined &&
		o.id !== undefined &&
		o.ts !== undefined &&
		o.getEventName !== undefined
	);
};

export const isEventMessageOptions = (
	candidate: unknown,
): candidate is AbstractEventMessageOptions => {
	const o = candidate as AbstractEventMessageOptions;
	if (!o) return false;
	if (o.eventName !== undefined) {
		if (o.eventName.match(/^[\w\s]+\.[\w\s]+\.[\w\s]+/)) {
			return true;
		}
	}
	return false;
};

export const isEventMessageOptionsWithType = (
	candidate: unknown,
	expectedType: string,
): candidate is AbstractEventMessageOptions => {
	const o = candidate as AbstractEventMessageOptions;
	if (!o) return false;
	return o.eventName !== undefined && o.__type !== undefined && o.__type === expectedType;
};

export abstract class AbstractEventMessage {
	abstract readonly __type: string;

	id: string;

	ts: DateTime;

	eventName: string;

	message: string;

	abstract payload: AbstractEventPayload;

	/**
	 * Creates a new instance of Event Message
	 * @param props.eventName The specific events name e.g. "n8n.workflow.workflowStarted"
	 * @param props.level The log level, defaults to. "info"
	 * @param props.severity The severity of the event e.g. "normal"
	 * @returns instance of EventMessage
	 */
	constructor(options: AbstractEventMessageOptions) {
		this.setOptionsOrDefault(options);
	}

	// abstract serialize(): EventMessageSerialized;
	abstract deserialize(data: JsonObject): this;
	abstract setPayload(payload: AbstractEventPayload): this;

	anonymize(): this {
		if (this.payload) {
			for (const key of Object.keys(this.payload)) {
				if (key.startsWith('_')) {
					if (typeof this.payload[key] === 'string') {
						this.payload[key] = '*';
					} else {
						this.payload[key] = undefined;
					}
				}
			}
		}
		return this;
	}

	serialize(): AbstractEventMessageOptions {
		return {
			__type: this.__type,
			id: this.id,
			ts: this.ts.toISO(),
			eventName: this.eventName,
			message: this.message,
			payload: this.payload,
		};
	}

	setOptionsOrDefault(options: AbstractEventMessageOptions) {
		this.id = options.id ?? uuid();
		this.eventName = options.eventName;
		this.message = options.message ?? options.eventName;
		if (typeof options.ts === 'string') {
			this.ts = DateTime.fromISO(options.ts) ?? DateTime.now();
		} else {
			this.ts = options.ts ?? DateTime.now();
		}
	}

	getEventName(): string {
		return this.eventName;
	}

	toString() {
		return JSON.stringify(this.serialize());
	}
}
