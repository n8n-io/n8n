import { RedisCommandArgument, RedisCommandArguments } from '.';
import { ScanOptions } from './generic-transformers';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: RedisCommandArgument, cursor: number, options?: ScanOptions): RedisCommandArguments;
type HScanRawReply = [RedisCommandArgument, Array<RedisCommandArgument>];
export interface HScanTuple {
    field: RedisCommandArgument;
    value: RedisCommandArgument;
}
interface HScanReply {
    cursor: number;
    tuples: Array<HScanTuple>;
}
export declare function transformReply([cursor, rawTuples]: HScanRawReply): HScanReply;
export {};
