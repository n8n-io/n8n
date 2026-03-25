import type { BerReader } from 'asn1';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageResponseOptions } from './MessageResponse';
import { MessageResponse } from './MessageResponse';
export interface ExtendedResponseOptions extends MessageResponseOptions {
    oid?: string;
    value?: string;
}
export declare enum ExtendedResponseProtocolOperations {
    oid = 138,
    value = 139
}
export declare class ExtendedResponse extends MessageResponse {
    protocolOperation: ProtocolOperation;
    oid?: string;
    value?: string;
    constructor(options: ExtendedResponseOptions);
    parseMessage(reader: BerReader): void;
}
