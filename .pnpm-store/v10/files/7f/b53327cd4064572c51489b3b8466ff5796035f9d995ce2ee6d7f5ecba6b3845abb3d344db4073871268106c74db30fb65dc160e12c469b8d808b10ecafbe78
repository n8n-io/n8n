import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
interface ZRangeOptions {
    BY?: 'SCORE' | 'LEX';
    REV?: true;
    LIMIT?: {
        offset: number;
        count: number;
    };
}
export declare function transformArguments(key: RedisCommandArgument, min: RedisCommandArgument | number, max: RedisCommandArgument | number, options?: ZRangeOptions): RedisCommandArguments;
export declare function transformReply(): Array<RedisCommandArgument>;
export {};
