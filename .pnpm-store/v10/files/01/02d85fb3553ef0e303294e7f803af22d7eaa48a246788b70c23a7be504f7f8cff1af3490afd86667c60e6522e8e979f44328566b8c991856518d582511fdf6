import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export interface ZRangeByLexOptions {
    LIMIT?: {
        offset: number;
        count: number;
    };
}
export declare function transformArguments(key: RedisCommandArgument, min: RedisCommandArgument, max: RedisCommandArgument, options?: ZRangeByLexOptions): RedisCommandArguments;
export declare function transformReply(): Array<RedisCommandArgument>;
