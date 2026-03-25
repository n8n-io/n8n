import { RedisCommandArguments } from "@redis/client/dist/lib/commands";
import { SearchOptions, SearchRawReply } from "./SEARCH";
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(index: string, query: string, options?: SearchOptions): RedisCommandArguments;
export interface SearchNoContentReply {
    total: number;
    documents: Array<string>;
}
export declare function transformReply(reply: SearchRawReply): SearchNoContentReply;
