import type { BerReader, BerWriter } from 'asn1';
import type { SearchOptions } from '../Client';
import type { Filter } from '../filters/Filter';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageOptions } from './Message';
import { Message } from './Message';
export interface SearchRequestMessageOptions extends MessageOptions, SearchOptions {
    baseDN?: string;
    filter: Filter;
}
export declare class SearchRequest extends Message {
    protocolOperation: ProtocolOperation;
    baseDN: string;
    scope: 'base' | 'children' | 'one' | 'sub';
    derefAliases: 'always' | 'find' | 'never' | 'search';
    sizeLimit: number;
    timeLimit: number;
    returnAttributeValues: boolean;
    filter: Filter;
    attributes: string[];
    explicitBufferAttributes: string[];
    constructor(options: SearchRequestMessageOptions);
    writeMessage(writer: BerWriter): void;
    parseMessage(reader: BerReader): void;
}
