// Type definitions for ioredis-mock 8.2
// Project: https://github.com/stipsan/ioredis-mock#readme
// Definitions by: Lukas Elmer <https://github.com/lukaselmer>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Minimum TypeScript Version: 4.2

import ioredis = require('ioredis');

export type RedisOptions = { data?: Record<string, unknown> } & ioredis.RedisOptions;

export type RedisClusterOptions = {
    redisOptions: Omit<
        RedisOptions,
        'port' | 'host' | 'path' | 'sentinels' | 'retryStrategy' | 'enableOfflineQueue' | 'readOnly'
    >;
} & ioredis.ClusterOptions;

export interface ClusterConstructor {
    new (startupNodes: ioredis.ClusterNode[], options?: RedisClusterOptions): ioredis.Cluster;
}

export interface Constructor {
    new (port: number, host: string, options: RedisOptions): ioredis.Redis;
    new (path: string, options: RedisOptions): ioredis.Redis;
    new (port: number, options: RedisOptions): ioredis.Redis;
    new (port: number, host: string): ioredis.Redis;
    new (options: RedisOptions): ioredis.Redis;
    new (port: number): ioredis.Redis;
    new (path: string): ioredis.Redis;
    new (): ioredis.Redis;
    Cluster: ClusterConstructor;
}

export const redisMock: Constructor;
export { redisMock as default };
