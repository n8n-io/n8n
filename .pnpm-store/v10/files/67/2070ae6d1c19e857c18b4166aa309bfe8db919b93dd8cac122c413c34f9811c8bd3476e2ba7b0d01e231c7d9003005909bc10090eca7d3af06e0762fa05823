import { RedisCommandArgument, RedisCommandArguments } from '.';
export declare const FIRST_KEY_INDEX = 1;
interface RestoreOptions {
    REPLACE?: true;
    ABSTTL?: true;
    IDLETIME?: number;
    FREQ?: number;
}
export declare function transformArguments(key: RedisCommandArgument, ttl: number, serializedValue: RedisCommandArgument, options?: RestoreOptions): RedisCommandArguments;
export declare function transformReply(): 'OK';
export {};
