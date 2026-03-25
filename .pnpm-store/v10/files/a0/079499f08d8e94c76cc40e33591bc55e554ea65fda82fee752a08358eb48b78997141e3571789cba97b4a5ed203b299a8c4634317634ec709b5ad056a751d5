import { RedisCommandArgument, RedisCommandArguments } from '@redis/client/dist/lib/commands';
export declare const FIRST_KEY_INDEX = 1;
interface InsertOptions {
    CAPACITY?: number;
    ERROR?: number;
    EXPANSION?: number;
    NOCREATE?: true;
    NONSCALING?: true;
}
export declare function transformArguments(key: string, items: RedisCommandArgument | Array<RedisCommandArgument>, options?: InsertOptions): RedisCommandArguments;
export { transformBooleanArrayReply as transformReply } from '@redis/client/dist/lib/commands/generic-transformers';
