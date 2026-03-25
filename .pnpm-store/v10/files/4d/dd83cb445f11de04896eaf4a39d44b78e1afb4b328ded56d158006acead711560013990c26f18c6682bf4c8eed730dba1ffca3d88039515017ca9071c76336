import { RedisCommandArgument, RedisCommandArguments } from '@redis/client/dist/lib/commands';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
interface CursorReadOptions {
    COUNT?: number;
}
export declare function transformArguments(index: RedisCommandArgument, cursor: number, options?: CursorReadOptions): RedisCommandArguments;
export { transformReply } from './AGGREGATE_WITHCURSOR';
