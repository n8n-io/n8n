import {
	EventMessageGroups,
	EventMessageLevel,
	EventMessageNames,
} from '../types/EventMessageTypes';
import { v4 as uuid } from 'uuid';

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
		Array.isArray(o.eventNames) &&
		o.eventLevels !== undefined &&
		Array.isArray(o.eventLevels)
	);
};

export class EventMessageSubscriptionSet {
	readonly id: string;

	name: string;

	eventGroups: EventMessageGroups[];

	eventNames: EventMessageNames[];

	eventLevels: EventMessageLevel[] = [
		'info',
		'notice',
		'warning',
		'error',
		'crit',
		'alert',
		'emerg',
	];

	// TODO: add level subscription

	constructor(props: {
		name: string;
		eventGroups?: EventMessageGroups[];
		eventNames?: EventMessageNames[];
	}) {
		this.id = uuid();
		this.name = props.name;
		this.eventGroups = props.eventGroups ?? [];
		this.eventNames = props.eventNames ?? [];
	}

	getName(): string {
		return this.name;
	}

	getId(): string {
		return this.id;
	}
}
