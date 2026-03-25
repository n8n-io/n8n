import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
export interface XClaimOptions {
    IDLE?: number;
    TIME?: number | Date;
    RETRYCOUNT?: number;
    FORCE?: true;
}
export declare function transformArguments(key: RedisCommandArgument, group: RedisCommandArgument, consumer: RedisCommandArgument, minIdleTime: number, id: RedisCommandArgument | Array<RedisCommandArgument>, options?: XClaimOptions): RedisCommandArguments;
export { transformStreamMessagesNullReply as transformReply } from './generic-transformers';
