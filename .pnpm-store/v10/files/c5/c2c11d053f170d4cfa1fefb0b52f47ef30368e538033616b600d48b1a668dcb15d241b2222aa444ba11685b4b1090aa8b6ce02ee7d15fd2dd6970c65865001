import { RedisCommandArgument, RedisCommandArguments } from '.';
import { StreamMessageReply } from './generic-transformers';
export declare const FIRST_KEY_INDEX = 2;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(key: RedisCommandArgument): RedisCommandArguments;
interface XInfoStreamReply {
    length: number;
    radixTreeKeys: number;
    radixTreeNodes: number;
    groups: number;
    lastGeneratedId: RedisCommandArgument;
    firstEntry: StreamMessageReply | null;
    lastEntry: StreamMessageReply | null;
}
export declare function transformReply(rawReply: Array<any>): XInfoStreamReply;
export {};
