/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateTime } from 'luxon';
import { jsonParse } from 'n8n-workflow';
import { SerializerImplementation } from 'threads';

export interface EventMessageConfirmSerialized {
	[key: string]: any | undefined;
	__type?: '$$EventMessageConfirm';
	confirm: string;
	ts?: string | undefined;
}

// export const isEventMessageConfirm = (candidate: unknown): candidate is EventMessageConfirm => {
// 	const o = candidate as EventMessageConfirm;
// 	if (!o) return false;
// 	return o.__type === '$$EventMessageConfirm' && o.id !== undefined && o.ts !== undefined;
// };

export const isEventMessageConfirmSerialized = (
	candidate: unknown,
): candidate is EventMessageConfirmSerialized => {
	const o = candidate as EventMessageConfirmSerialized;
	if (!o) return false;
	return o.confirm !== undefined && o.ts !== undefined;
};

export class EventMessageConfirm {
	readonly __type: '$$EventMessageConfirm';

	readonly confirm: string;

	readonly ts: DateTime;

	/**
	 * Creates a new instance of Event Message
	 * @param props.id event id to confirm
	 * @param props.ts time of confirmation (defaults to now)
	 * @returns instance of EventMessage
	 */
	constructor(props: EventMessageConfirmSerialized) {
		this.confirm = props.confirm;
		this.ts = props.ts ? DateTime.fromISO(props.ts) : DateTime.now();
	}

	toString() {
		return JSON.stringify(this.serialize());
	}

	serialize(): EventMessageConfirmSerialized {
		// TODO: filter payload for sensitive info here?
		return {
			__type: '$$EventMessageConfirm',
			confirm: this.confirm,
			ts: this.ts.toISO(),
		};
	}

	static deserialize(serializedData: EventMessageConfirmSerialized): EventMessageConfirm {
		return new EventMessageConfirm(serializedData);
	}

	static fromJSONSerializedString(s: string): EventMessageConfirm {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
		const json = jsonParse<EventMessageConfirmSerialized>(s);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return new EventMessageConfirm(json);
	}
}

export const eventMessageConfirmSerializer: SerializerImplementation = {
	deserialize(message, defaultHandler) {
		if (isEventMessageConfirmSerialized(message)) {
			return EventMessageConfirm.deserialize(message);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return defaultHandler(message);
		}
	},
	serialize(thing, defaultHandler) {
		if (thing instanceof EventMessageConfirm) {
			return thing.serialize();
		} else {
			return defaultHandler(thing);
		}
	},
};
