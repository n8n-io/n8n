import { EventMessageGroups, EventMessageNames } from '../types/EventMessageTypes';

export const isEventMessageSubscriptionSet = (
	candidate: unknown,
): candidate is EventMessageSubscriptionSet => {
	const o = candidate as EventMessageSubscriptionSet;
	if (!o) return false;
	return (
		o.name !== undefined &&
		o.eventGroups !== undefined &&
		Array.isArray(o.eventGroups) &&
		o.eventNames !== undefined &&
		Array.isArray(o.eventNames)
	);
};

export class EventMessageSubscriptionSet {
	readonly name: string;

	eventGroups: EventMessageGroups[];

	eventNames: EventMessageNames[];

	constructor(props: {
		name: string;
		eventGroups?: EventMessageGroups[];
		eventNames?: EventMessageNames[];
	}) {
		this.name = props.name;
		this.eventGroups = props.eventGroups ?? [];
		this.eventNames = props.eventNames ?? [];
	}

	getName(): string {
		return this.name;
	}
}
