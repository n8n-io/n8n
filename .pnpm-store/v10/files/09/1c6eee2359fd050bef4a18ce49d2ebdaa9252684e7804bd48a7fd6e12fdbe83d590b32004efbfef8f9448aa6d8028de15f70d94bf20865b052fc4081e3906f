/// <reference types="node" />
import type { BerReader, BerWriter } from 'asn1';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageOptions } from './Message';
import { Message } from './Message';
export interface ExtendedRequestMessageOptions extends MessageOptions {
    oid?: string;
    value?: Buffer | string;
}
export declare class ExtendedRequest extends Message {
    protocolOperation: ProtocolOperation;
    oid: string;
    value: Buffer | string;
    constructor(options: ExtendedRequestMessageOptions);
    writeMessage(writer: BerWriter): void;
    parseMessage(reader: BerReader): void;
}
