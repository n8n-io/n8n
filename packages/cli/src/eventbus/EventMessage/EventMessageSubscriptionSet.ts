import { EventMessageGroups, EventMessageNames } from '../types/EventMessageTypes';

export class EventMessageSubscriptionSet {
	name: string;

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
}
