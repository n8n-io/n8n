import type { BerReader } from 'asn1';
import type { MessageOptions } from './Message';
import { Message } from './Message';
export interface MessageResponseOptions extends MessageOptions {
    status?: number;
    matchedDN?: string;
    errorMessage?: string;
}
export declare abstract class MessageResponse extends Message {
    status: number;
    matchedDN: string;
    errorMessage: string;
    protected constructor(options: MessageResponseOptions);
    parseMessage(reader: BerReader): void;
}
