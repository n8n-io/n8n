import { RedisCommandArgument, RedisCommandArguments } from '@redis/client/dist/lib/commands';
import { CompressionOption } from '.';
export declare const FIRST_KEY_INDEX = 1;
interface MergeOptions extends CompressionOption {
    OVERRIDE?: boolean;
}
export declare function transformArguments(destKey: RedisCommandArgument, srcKeys: RedisCommandArgument | Array<RedisCommandArgument>, options?: MergeOptions): RedisCommandArguments;
export declare function transformReply(): 'OK';
export {};
