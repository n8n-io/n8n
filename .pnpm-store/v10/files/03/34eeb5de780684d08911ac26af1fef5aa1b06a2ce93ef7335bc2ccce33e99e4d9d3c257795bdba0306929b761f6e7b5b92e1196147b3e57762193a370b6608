import { RedisCommandArgument, RedisCommandArguments } from '.';
import { SortedSetSide, ZMember, ZMPopOptions } from './generic-transformers';
export declare const FIRST_KEY_INDEX = 2;
export declare function transformArguments(keys: RedisCommandArgument | Array<RedisCommandArgument>, side: SortedSetSide, options?: ZMPopOptions): RedisCommandArguments;
type ZMPopRawReply = null | [
    key: string,
    elements: Array<[RedisCommandArgument, RedisCommandArgument]>
];
type ZMPopReply = null | {
    key: string;
    elements: Array<ZMember>;
};
export declare function transformReply(reply: ZMPopRawReply): ZMPopReply;
export {};
