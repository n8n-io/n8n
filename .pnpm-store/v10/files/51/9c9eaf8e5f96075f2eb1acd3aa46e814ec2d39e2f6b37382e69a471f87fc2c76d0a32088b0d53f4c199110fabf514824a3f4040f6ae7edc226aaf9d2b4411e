/// <reference types="node" />
import type { BerReader } from 'asn1';
import { BerWriter } from 'asn1';
import type { Control } from '../controls';
import { ProtocolOperation } from '../ProtocolOperation';
export interface MessageOptions {
    messageId: number;
    controls?: Control[];
}
export declare abstract class Message {
    version: ProtocolOperation;
    messageId: number;
    abstract protocolOperation: ProtocolOperation;
    controls?: Control[];
    protected constructor(options: MessageOptions);
    write(): Buffer;
    parse(reader: BerReader): void;
    toString(): string;
    protected parseMessage(_: BerReader): void;
    protected writeMessage(_: BerWriter): void;
}
