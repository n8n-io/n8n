import { RedisCommandArgument, RedisCommandArguments } from '.';
import { ScanOptions, ZMember } from './generic-transformers';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: RedisCommandArgument, cursor: number, options?: ScanOptions): RedisCommandArguments;
type ZScanRawReply = [RedisCommandArgument, Array<RedisCommandArgument>];
interface ZScanReply {
    cursor: number;
    members: Array<ZMember>;
}
export declare function transformReply([cursor, rawMembers]: ZScanRawReply): ZScanReply;
export {};
