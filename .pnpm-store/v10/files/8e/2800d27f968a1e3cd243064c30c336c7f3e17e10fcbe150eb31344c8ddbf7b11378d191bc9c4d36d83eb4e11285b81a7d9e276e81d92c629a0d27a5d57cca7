import type { BerReader, BerWriter } from 'asn1';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageOptions } from './Message';
import { Message } from './Message';
export interface CompareRequestMessageOptions extends MessageOptions {
    dn?: string;
    attribute?: string;
    value?: string;
}
export declare class CompareRequest extends Message {
    protocolOperation: ProtocolOperation;
    dn: string;
    attribute: string;
    value: string;
    constructor(options: CompareRequestMessageOptions);
    writeMessage(writer: BerWriter): void;
    parseMessage(reader: BerReader): void;
}
