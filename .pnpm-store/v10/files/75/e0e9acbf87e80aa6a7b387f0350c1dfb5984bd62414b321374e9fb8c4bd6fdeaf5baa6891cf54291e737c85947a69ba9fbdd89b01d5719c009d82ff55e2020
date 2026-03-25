import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
interface ZRangeStoreOptions {
    BY?: 'SCORE' | 'LEX';
    REV?: true;
    LIMIT?: {
        offset: number;
        count: number;
    };
    WITHSCORES?: true;
}
export declare function transformArguments(dst: RedisCommandArgument, src: RedisCommandArgument, min: RedisCommandArgument | number, max: RedisCommandArgument | number, options?: ZRangeStoreOptions): RedisCommandArguments;
export declare function transformReply(reply: number): number;
export {};
