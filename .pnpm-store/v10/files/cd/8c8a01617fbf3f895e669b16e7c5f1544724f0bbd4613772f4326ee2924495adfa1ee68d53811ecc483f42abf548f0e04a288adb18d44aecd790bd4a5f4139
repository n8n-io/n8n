import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 2;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: RedisCommandArgument): RedisCommandArguments;
type XInfoGroupsReply = Array<{
    name: RedisCommandArgument;
    consumers: number;
    pending: number;
    lastDeliveredId: RedisCommandArgument;
}>;
export declare function transformReply(rawReply: Array<any>): XInfoGroupsReply;
export {};
