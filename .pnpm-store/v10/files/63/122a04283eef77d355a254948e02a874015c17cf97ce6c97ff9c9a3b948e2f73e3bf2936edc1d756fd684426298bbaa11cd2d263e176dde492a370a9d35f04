import type { BerReader, BerWriter } from 'asn1';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageOptions } from './Message';
import { Message } from './Message';
export interface AbandonRequestMessageOptions extends MessageOptions {
    abandonId?: number;
}
export declare class AbandonRequest extends Message {
    protocolOperation: ProtocolOperation;
    abandonId: number;
    constructor(options: AbandonRequestMessageOptions);
    writeMessage(writer: BerWriter): void;
    parseMessage(reader: BerReader): void;
}
