import { RedisCommandArguments } from '@redis/client/dist/lib/commands';
import { RedisSearchLanguages, Params, PropertyName, SortByProperty, SearchReply } from '.';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export interface SearchOptions {
    VERBATIM?: true;
    NOSTOPWORDS?: true;
    WITHSORTKEYS?: true;
    INKEYS?: string | Array<string>;
    INFIELDS?: string | Array<string>;
    RETURN?: string | Array<string>;
    SUMMARIZE?: true | {
        FIELDS?: PropertyName | Array<PropertyName>;
        FRAGS?: number;
        LEN?: number;
        SEPARATOR?: string;
    };
    HIGHLIGHT?: true | {
        FIELDS?: PropertyName | Array<PropertyName>;
        TAGS?: {
            open: string;
            close: string;
        };
    };
    SLOP?: number;
    INORDER?: true;
    LANGUAGE?: RedisSearchLanguages;
    EXPANDER?: string;
    SCORER?: string;
    SORTBY?: SortByProperty;
    LIMIT?: {
        from: number | string;
        size: number | string;
    };
    PARAMS?: Params;
    DIALECT?: number;
    TIMEOUT?: number;
}
export declare function transformArguments(index: string, query: string, options?: SearchOptions): RedisCommandArguments;
export type SearchRawReply = Array<any>;
export declare function transformReply(reply: SearchRawReply, withoutDocuments: boolean): SearchReply;
