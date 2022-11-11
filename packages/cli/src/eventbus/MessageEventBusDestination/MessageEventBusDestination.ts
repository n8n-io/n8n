import { EventMessage } from '../EventMessageClasses/EventMessage';

// TODO: TBD
export interface MessageEventBusDestination {
	getName(): string;
	receiveFromEventBus(msg: EventMessage): Promise<boolean>;
	close(): Promise<void>;
}
