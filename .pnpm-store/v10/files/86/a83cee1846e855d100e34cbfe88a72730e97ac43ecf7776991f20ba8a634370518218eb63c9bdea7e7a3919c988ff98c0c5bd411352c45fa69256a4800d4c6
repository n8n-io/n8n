import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
interface BitCountRange {
    start: number;
    end: number;
    mode?: 'BYTE' | 'BIT';
}
export declare function transformArguments(key: RedisCommandArgument, range?: BitCountRange): RedisCommandArguments;
export declare function transformReply(): number;
export {};
