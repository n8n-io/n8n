// import { JsonObject, JsonValue } from 'n8n-workflow';
// import { EventMessageLevel } from '../EventMessageClasses/Enums';

// export const isEventMessageSubscriptionSetOptions = (
// 	candidate: unknown,
// ): candidate is EventMessageSubscriptionSetOptions => {
// 	const o = candidate as EventMessageSubscriptionSetOptions;
// 	if (!o) return false;
// 	return (
// 		o.eventNames !== undefined &&
// 		Array.isArray(o.eventNames) &&
// 		o.eventLevels !== undefined &&
// 		Array.isArray(o.eventLevels)
// 	);
// };

// export interface EventMessageSubscriptionSetOptions {
// 	eventNames?: string[];
// 	eventLevels?: EventMessageLevel[];
// }

// export class EventMessageSubscriptionSet {
// 	static readonly __type: '$$EventMessageSubscriptionSet';

// 	eventNames: string[];

// 	eventLevels: EventMessageLevel[];

// 	constructor(options?: EventMessageSubscriptionSetOptions | EventMessageSubscriptionSet) {
// 		this.eventNames = options?.eventNames ?? ['*'];
// 		this.eventLevels = options?.eventLevels ?? [EventMessageLevel.log];
// 	}

// 	setEventNames(names: string[]) {
// 		this.eventNames = names;
// 	}

// 	setEventLevels(levels: EventMessageLevel[]) {
// 		this.eventLevels = levels;
// 	}

// 	serialize(): JsonValue {
// 		return {
// 			__type: EventMessageSubscriptionSet.__type,
// 			eventNames: this.eventNames,
// 			eventLevels: this.eventLevels,
// 		};
// 	}

// 	static deserialize(
// 		data: JsonObject | EventMessageSubscriptionSetOptions,
// 	): EventMessageSubscriptionSet {
// 		if (isEventMessageSubscriptionSetOptions(data)) {
// 			return new EventMessageSubscriptionSet(data);
// 		}
// 		return new EventMessageSubscriptionSet();
// 	}
// }
