import type { BerReader, BerWriter } from 'asn1';
import { Attribute } from '../Attribute';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageOptions } from './Message';
import { Message } from './Message';
export interface AddMessageOptions extends MessageOptions {
    dn: string;
    attributes?: Attribute[];
}
export declare class AddRequest extends Message {
    protocolOperation: ProtocolOperation;
    dn: string;
    attributes: Attribute[];
    constructor(options: AddMessageOptions);
    writeMessage(writer: BerWriter): void;
    parseMessage(reader: BerReader): void;
}
