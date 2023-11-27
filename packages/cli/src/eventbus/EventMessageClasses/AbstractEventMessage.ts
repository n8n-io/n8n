/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { DateTime } from 'luxon';
import type { EventMessageTypeNames, JsonObject } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import type { AbstractEventPayload } from './AbstractEventPayload';
import type { AbstractEventMessageOptions } from './AbstractEventMessageOptions';
import type { EventNamesTypes } from '.';

function modifyUnderscoredKeys(
	input: { [key: string]: any },
	modifier: (secret: string) => string | undefined = () => '*',
) {
	const result: { [key: string]: any } = {};
	if (!input) return input;
	Object.keys(input).forEach((key) => {
		if (typeof input[key] === 'string') {
			if (key.substring(0, 1) === '_') {
				const modifierResult = modifier(input[key]);
				if (modifierResult !== undefined) {
					result[key] = modifier(input[key]);
				}
			} else {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				result[key] = input[key];
			}
		} else if (typeof input[key] === 'object') {
			if (Array.isArray(input[key])) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				result[key] = input[key].map((item: any) => {
					if (typeof item === 'object' && !Array.isArray(item)) {
						return modifyUnderscoredKeys(item, modifier);
					} else {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						return item;
					}
				});
			} else {
				result[key] = modifyUnderscoredKeys(input[key], modifier);
			}
		} else {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			result[key] = input[key];
		}
	});

	return result;
}

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
	abstract readonly __type: EventMessageTypeNames;

	id: string;

	ts: DateTime;

	eventName: EventNamesTypes;

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

	abstract deserialize(data: JsonObject): this;
	abstract setPayload(payload: AbstractEventPayload): this;

	anonymize(): AbstractEventPayload {
		const anonymizedPayload = modifyUnderscoredKeys(this.payload);
		return anonymizedPayload;
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
