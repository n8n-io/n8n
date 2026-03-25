import { RedisCommandArgument, RedisCommandArguments } from '.';
import { ZMember } from './generic-transformers';
export declare const FIRST_KEY_INDEX = 1;
export declare function transformArguments(key: RedisCommandArgument | Array<RedisCommandArgument>, timeout: number): RedisCommandArguments;
type ZMemberRawReply = [key: RedisCommandArgument, value: RedisCommandArgument, score: RedisCommandArgument] | null;
type BZPopMaxReply = (ZMember & {
    key: RedisCommandArgument;
}) | null;
export declare function transformReply(reply: ZMemberRawReply): BZPopMaxReply | null;
export {};
