import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
interface XPendingRangeOptions {
    IDLE?: number;
    consumer?: RedisCommandArgument;
}
export declare function transformArguments(key: RedisCommandArgument, group: RedisCommandArgument, start: string, end: string, count: number, options?: XPendingRangeOptions): RedisCommandArguments;
type XPendingRangeRawReply = Array<[
    id: RedisCommandArgument,
    consumer: RedisCommandArgument,
    millisecondsSinceLastDelivery: number,
    deliveriesCounter: number
]>;
type XPendingRangeReply = Array<{
    id: RedisCommandArgument;
    owner: RedisCommandArgument;
    millisecondsSinceLastDelivery: number;
    deliveriesCounter: number;
}>;
export declare function transformReply(reply: XPendingRangeRawReply): XPendingRangeReply;
export {};
