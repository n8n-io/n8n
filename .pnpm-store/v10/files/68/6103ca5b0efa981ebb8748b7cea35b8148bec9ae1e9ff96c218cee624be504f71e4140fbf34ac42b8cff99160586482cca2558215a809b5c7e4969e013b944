import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: RedisCommandArgument, group: RedisCommandArgument): RedisCommandArguments;
type XPendingRawReply = [
    pending: number,
    firstId: RedisCommandArgument | null,
    lastId: RedisCommandArgument | null,
    consumers: Array<[
        name: RedisCommandArgument,
        deliveriesCounter: RedisCommandArgument
    ]> | null
];
interface XPendingReply {
    pending: number;
    firstId: RedisCommandArgument | null;
    lastId: RedisCommandArgument | null;
    consumers: Array<{
        name: RedisCommandArgument;
        deliveriesCounter: number;
    }> | null;
}
export declare function transformReply(reply: XPendingRawReply): XPendingReply;
export {};
