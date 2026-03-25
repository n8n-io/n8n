import { RedisCommandArgument, RedisCommandArguments } from '.';
import { ScanOptions } from './generic-transformers';
export declare const IS_READ_ONLY = true;
export interface ScanCommandOptions extends ScanOptions {
    TYPE?: RedisCommandArgument;
}
export declare function transformArguments(cursor: number, options?: ScanCommandOptions): RedisCommandArguments;
type ScanRawReply = [string, Array<string>];
export interface ScanReply {
    cursor: number;
    keys: Array<RedisCommandArgument>;
}
export declare function transformReply([cursor, keys]: ScanRawReply): ScanReply;
export {};
