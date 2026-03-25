import type { BerReader } from 'asn1';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageResponseOptions } from './MessageResponse';
import { MessageResponse } from './MessageResponse';
export interface SearchReferenceOptions extends MessageResponseOptions {
    uris?: string[];
}
export declare class SearchReference extends MessageResponse {
    protocolOperation: ProtocolOperation;
    uris: string[];
    constructor(options: SearchReferenceOptions);
    parseMessage(reader: BerReader): void;
}
