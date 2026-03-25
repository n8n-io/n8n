import { RedisCommandArguments } from '.';
export declare const IS_READ_ONLY = true;
export declare enum FilterBy {
    MODULE = "MODULE",
    ACLCAT = "ACLCAT",
    PATTERN = "PATTERN"
}
interface Filter {
    filterBy: FilterBy;
    value: string;
}
export declare function transformArguments(filter?: Filter): RedisCommandArguments;
export declare function transformReply(): Array<string>;
export {};
