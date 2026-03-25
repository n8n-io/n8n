import type { BerReader, BerWriter } from 'asn1';
import { Change } from '../Change';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageOptions } from './Message';
import { Message } from './Message';
export interface ModifyRequestMessageOptions extends MessageOptions {
    dn?: string;
    changes?: Change[];
}
export declare class ModifyRequest extends Message {
    protocolOperation: ProtocolOperation;
    dn: string;
    changes: Change[];
    constructor(options: ModifyRequestMessageOptions);
    writeMessage(writer: BerWriter): void;
    parseMessage(reader: BerReader): void;
}
