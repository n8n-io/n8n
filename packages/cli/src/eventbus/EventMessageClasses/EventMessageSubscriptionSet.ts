import { JsonObject, JsonValue } from 'n8n-workflow';
import {
	EventMessageGroups,
	EventMessageLevel,
	EventMessageNames,
} from '../types/EventMessageTypes';

export const isEventMessageSubscriptionSet = (
	candidate: unknown,
): candidate is EventMessageSubscriptionSet => {
	const o = candidate as EventMessageSubscriptionSet;
	if (!o) return false;
	return (
		o.eventGroups !== undefined &&
		Array.isArray(o.eventGroups) &&
		o.eventNames !== undefined &&
		Array.isArray(o.eventNames) &&
		o.eventLevels !== undefined &&
		Array.isArray(o.eventLevels)
	);
};

interface EventMessageSubscriptionSetOptions {
	eventGroups?: EventMessageGroups[];
	eventNames?: EventMessageNames[];
	eventLevels?: EventMessageLevel[];
}

export class EventMessageSubscriptionSet {
	static readonly type: '$$EventMessageSubscriptionSet';

	eventGroups: EventMessageGroups[];

	eventNames: EventMessageNames[];

	eventLevels: EventMessageLevel[];

	constructor(options?: EventMessageSubscriptionSetOptions | EventMessageSubscriptionSet) {
		this.eventGroups = options?.eventGroups ?? ['*'];
		this.eventNames = options?.eventNames ?? ['*'];
		this.eventLevels = options?.eventLevels ?? [
			'info',
			'notice',
			'warning',
			'error',
			'crit',
			'alert',
			'emerg',
		];
	}

	setEventGroups(groups: EventMessageGroups[]) {
		this.eventGroups = groups;
	}

	setEventNames(names: EventMessageNames[]) {
		this.eventNames = names;
	}

	setEventLevels(levels: EventMessageLevel[]) {
		this.eventLevels = levels;
	}

	serialize(): JsonValue {
		return {
			type: EventMessageSubscriptionSet.type,
			eventGroups: this.eventGroups,
			eventNames: this.eventNames,
			eventLevels: this.eventLevels,
		};
	}

	static deserialize(data: JsonObject): EventMessageSubscriptionSet | undefined {
		if (
			'type' in data &&
			data.type === EventMessageSubscriptionSet.type &&
			isEventMessageSubscriptionSet(data.options)
		) {
			return new EventMessageSubscriptionSet(data);
		}
		return undefined;
	}
}
