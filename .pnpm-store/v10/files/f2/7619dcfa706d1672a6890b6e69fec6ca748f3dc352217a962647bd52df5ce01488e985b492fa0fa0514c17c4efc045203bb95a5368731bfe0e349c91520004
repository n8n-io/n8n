import { RedisCommandArgument, RedisCommandArguments } from '.';
import { ScanOptions } from './generic-transformers';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: RedisCommandArgument, cursor: number, options?: ScanOptions): RedisCommandArguments;
type SScanRawReply = [string, Array<RedisCommandArgument>];
interface SScanReply {
    cursor: number;
    members: Array<RedisCommandArgument>;
}
export declare function transformReply([cursor, members]: SScanRawReply): SScanReply;
export {};
