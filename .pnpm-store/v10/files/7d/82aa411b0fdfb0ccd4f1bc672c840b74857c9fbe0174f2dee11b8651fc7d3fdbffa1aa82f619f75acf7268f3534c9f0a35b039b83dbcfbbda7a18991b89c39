import { RedisCommandArgument, RedisCommandArguments } from '.';
import { StreamMessagesNullReply } from './generic-transformers';
export declare const FIRST_KEY_INDEX = 1;
export interface XAutoClaimOptions {
    COUNT?: number;
}
export declare function transformArguments(key: RedisCommandArgument, group: RedisCommandArgument, consumer: RedisCommandArgument, minIdleTime: number, start: string, options?: XAutoClaimOptions): RedisCommandArguments;
type XAutoClaimRawReply = [RedisCommandArgument, Array<any>];
interface XAutoClaimReply {
    nextId: RedisCommandArgument;
    messages: StreamMessagesNullReply;
}
export declare function transformReply(reply: XAutoClaimRawReply): XAutoClaimReply;
export {};
