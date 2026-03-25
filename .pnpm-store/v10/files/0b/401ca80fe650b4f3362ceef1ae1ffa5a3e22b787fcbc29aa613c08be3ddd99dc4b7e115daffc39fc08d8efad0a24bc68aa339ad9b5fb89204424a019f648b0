/// <reference types="node" />
import type { BerReader } from 'asn1';
import { Attribute } from '../Attribute';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageResponseOptions } from './MessageResponse';
import { MessageResponse } from './MessageResponse';
export interface SearchEntryOptions extends MessageResponseOptions {
    name?: string;
    attributes?: Attribute[];
}
export interface Entry {
    dn: string;
    [index: string]: Buffer | Buffer[] | string[] | string;
}
export declare class SearchEntry extends MessageResponse {
    protocolOperation: ProtocolOperation;
    name: string;
    attributes: Attribute[];
    constructor(options: SearchEntryOptions);
    parseMessage(reader: BerReader): void;
    toObject(requestAttributes: string[], explicitBufferAttributes: string[]): Entry;
}
