import { JsonObject, JsonValue } from 'n8n-workflow';
import { EventMessageLevel } from '../EventMessageClasses';

export const isEventMessageSubscriptionSetOptions = (
	candidate: unknown,
): candidate is EventMessageSubscriptionSetOptions => {
	const o = candidate as EventMessageSubscriptionSetOptions;
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

export interface EventMessageSubscriptionSetOptions {
	eventGroups?: string[];
	eventNames?: string[];
	eventLevels?: EventMessageLevel[];
}

export class EventMessageSubscriptionSet {
	static readonly __type: '$$EventMessageSubscriptionSet';

	eventGroups: string[];

	eventNames: string[];

	eventLevels: EventMessageLevel[];

	constructor(options?: EventMessageSubscriptionSetOptions | EventMessageSubscriptionSet) {
		this.eventGroups = options?.eventGroups ?? ['*'];
		this.eventNames = options?.eventNames ?? ['*'];
		this.eventLevels = options?.eventLevels ?? [EventMessageLevel.log];
	}

	setEventGroups(groups: string[]) {
		this.eventGroups = groups;
	}

	setEventNames(names: string[]) {
		this.eventNames = names;
	}

	setEventLevels(levels: EventMessageLevel[]) {
		this.eventLevels = levels;
	}

	serialize(): JsonValue {
		return {
			__type: EventMessageSubscriptionSet.__type,
			eventGroups: this.eventGroups,
			eventNames: this.eventNames,
			eventLevels: this.eventLevels,
		};
	}

	static deserialize(
		data: JsonObject | EventMessageSubscriptionSetOptions,
	): EventMessageSubscriptionSet {
		if (isEventMessageSubscriptionSetOptions(data)) {
			return new EventMessageSubscriptionSet(data);
		}
		return new EventMessageSubscriptionSet();
	}
}
