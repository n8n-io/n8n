import { RedisCommandArgument, RedisCommandArguments } from '.';
export interface XReadGroupStream {
    key: RedisCommandArgument;
    id: RedisCommandArgument;
}
export interface XReadGroupOptions {
    COUNT?: number;
    BLOCK?: number;
    NOACK?: true;
}
export declare const FIRST_KEY_INDEX: (_group: RedisCommandArgument, _consumer: RedisCommandArgument, streams: Array<XReadGroupStream> | XReadGroupStream) => RedisCommandArgument;
export declare const IS_READ_ONLY = true;
export declare function transformArguments(group: RedisCommandArgument, consumer: RedisCommandArgument, streams: Array<XReadGroupStream> | XReadGroupStream, options?: XReadGroupOptions): RedisCommandArguments;
export { transformStreamsMessagesReply as transformReply } from './generic-transformers';
