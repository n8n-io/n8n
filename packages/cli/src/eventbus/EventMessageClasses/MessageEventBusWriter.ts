/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventMessage } from './EventMessage';

export interface MessageEventBusWriter {
	putMessage(msg: EventMessage): Promise<void>;
	confirmMessageSent(key: string): Promise<void>;
	getMessages(): Promise<EventMessage[]> | EventMessage[];
	getMessagesSent(): Promise<EventMessage[]> | EventMessage[];
	getMessagesUnsent(): Promise<EventMessage[]> | EventMessage[];
	close(): void;
}
