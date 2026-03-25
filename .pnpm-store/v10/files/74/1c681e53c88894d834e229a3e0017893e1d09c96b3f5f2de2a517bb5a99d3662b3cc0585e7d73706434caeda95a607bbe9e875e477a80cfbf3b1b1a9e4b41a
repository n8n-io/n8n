import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageResponseOptions } from './MessageResponse';
import { MessageResponse } from './MessageResponse';
import type { SearchEntry } from './SearchEntry';
import type { SearchReference } from './SearchReference';
export interface SearchResponseOptions extends MessageResponseOptions {
    searchEntries?: SearchEntry[];
    searchReferences?: SearchReference[];
}
export declare class SearchResponse extends MessageResponse {
    protocolOperation: ProtocolOperation;
    searchEntries: SearchEntry[];
    searchReferences: SearchReference[];
    constructor(options: SearchResponseOptions);
}
