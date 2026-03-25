import { RedisCommandArgument, RedisCommandArguments } from '@redis/client/dist/lib/commands';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: RedisCommandArgument): RedisCommandArguments;
type InfoRawReply = [
    'Compression',
    number,
    'Capacity',
    number,
    'Merged nodes',
    number,
    'Unmerged nodes',
    number,
    'Merged weight',
    string,
    'Unmerged weight',
    string,
    'Total compressions',
    number
];
interface InfoReply {
    comperssion: number;
    capacity: number;
    mergedNodes: number;
    unmergedNodes: number;
    mergedWeight: number;
    unmergedWeight: number;
    totalCompression: number;
}
export declare function transformReply(reply: InfoRawReply): InfoReply;
export {};
