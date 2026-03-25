/// <reference types="node" />
/// <reference types="node" />
import type { Command, Redis } from 'ioredis';
import type * as LegacyIORedis from 'ioredis4';
interface LegacyIORedisCommand {
    reject: (err: Error) => void;
    resolve: (result: {}) => void;
    promise: Promise<{}>;
    args: Array<string | Buffer | number>;
    callback: LegacyIORedis.CallbackFunction<unknown>;
    name: string;
}
export type IORedisCommand = Command | LegacyIORedisCommand;
export type RedisInterface = Redis | LegacyIORedis.Redis;
export {};
//# sourceMappingURL=internal-types.d.ts.map