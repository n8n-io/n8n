import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 2;
export declare const IS_READ_ONLY = true;
interface ZInterOptions {
    WEIGHTS?: Array<number>;
    AGGREGATE?: 'SUM' | 'MIN' | 'MAX';
}
export declare function transformArguments(keys: Array<RedisCommandArgument> | RedisCommandArgument, options?: ZInterOptions): RedisCommandArguments;
export declare function transformReply(): Array<RedisCommandArgument>;
export {};
