import type { BerReader, BerWriter } from 'asn1';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageOptions } from './Message';
import { Message } from './Message';
export interface DeleteRequestMessageOptions extends MessageOptions {
    dn?: string;
}
export declare class DeleteRequest extends Message {
    protocolOperation: ProtocolOperation;
    dn: string;
    constructor(options: DeleteRequestMessageOptions);
    writeMessage(writer: BerWriter): void;
    parseMessage(reader: BerReader): void;
}
