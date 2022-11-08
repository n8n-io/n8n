import { EventMessage } from '../EventMessage/EventMessage';

// TODO: TBD
export interface MessageEventBusForwarder {
	getName(): string;
	forward(msg: EventMessage): Promise<boolean>;
	close(): void;
}
