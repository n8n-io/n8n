import type { BerReader } from 'asn1';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageResponseOptions } from './MessageResponse';
import { MessageResponse } from './MessageResponse';
export declare class BindResponse extends MessageResponse {
    protocolOperation: ProtocolOperation;
    data: string[];
    constructor(options: MessageResponseOptions);
    parseMessage(reader: BerReader): void;
}
