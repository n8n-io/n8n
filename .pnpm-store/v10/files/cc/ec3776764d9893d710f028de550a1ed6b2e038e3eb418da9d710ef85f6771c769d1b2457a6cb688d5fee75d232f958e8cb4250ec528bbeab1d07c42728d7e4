import type { BerReader, BerWriter } from 'asn1';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageOptions } from './Message';
import { Message } from './Message';
export interface ModifyDNRequestMessageOptions extends MessageOptions {
    deleteOldRdn?: boolean;
    dn?: string;
    newRdn?: string;
    newSuperior?: string;
}
export declare class ModifyDNRequest extends Message {
    protocolOperation: ProtocolOperation;
    deleteOldRdn: boolean;
    dn: string;
    newRdn: string;
    newSuperior: string;
    constructor(options: ModifyDNRequestMessageOptions);
    writeMessage(writer: BerWriter): void;
    parseMessage(reader: BerReader): void;
}
