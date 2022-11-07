import { EventMessage } from '../EventMessage/EventMessage';

// TODO: TBD
export interface MessageEventBusForwarder {
	forward(msg: EventMessage): Promise<boolean>;
	close(): void;
}
