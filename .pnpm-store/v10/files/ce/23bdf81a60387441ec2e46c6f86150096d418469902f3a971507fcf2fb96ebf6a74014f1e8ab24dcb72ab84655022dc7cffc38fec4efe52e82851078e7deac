import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const IS_READ_ONLY = true;
export declare function transformArguments(args: Array<RedisCommandArgument>): RedisCommandArguments;
type KeysAndFlagsRawReply = Array<[
    RedisCommandArgument,
    RedisCommandArguments
]>;
type KeysAndFlagsReply = Array<{
    key: RedisCommandArgument;
    flags: RedisCommandArguments;
}>;
export declare function transformReply(reply: KeysAndFlagsRawReply): KeysAndFlagsReply;
export {};
