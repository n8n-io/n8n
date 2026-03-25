/// <reference types="node" />
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { StrictEventEmitter } from 'strict-event-emitter-types';
import type { MessageResponse } from './messages/MessageResponse';
interface MessageParserEvents {
    message: (message: MessageResponse) => void;
    error: (error: Error) => void;
}
type MessageParserEmitter = StrictEventEmitter<EventEmitter, MessageParserEvents>;
declare const MessageParser_base: new () => MessageParserEmitter;
export declare class MessageParser extends MessageParser_base {
    private buffer?;
    read(data: Buffer): void;
    private _getMessageFromProtocolOperation;
}
export {};
