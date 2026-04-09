import ioredis = require("ioredis");

declare namespace redisMock {
    type RedisOptions = { data?: Record<string, unknown> } & ioredis.RedisOptions;

    type RedisClusterOptions = {
        redisOptions: Omit<
            RedisOptions,
            "port" | "host" | "path" | "sentinels" | "retryStrategy" | "enableOfflineQueue" | "readOnly"
        >;
    } & ioredis.ClusterOptions;

    interface ClusterConstructor {
        new(startupNodes: ioredis.ClusterNode[], options?: RedisClusterOptions): ioredis.Cluster;
    }

    interface Constructor {
        new(port: number, host: string, options: RedisOptions): ioredis.Redis;
        new(path: string, options: RedisOptions): ioredis.Redis;
        new(port: number, options: RedisOptions): ioredis.Redis;
        new(port: number, host: string): ioredis.Redis;
        new(options: RedisOptions): ioredis.Redis;
        new(port: number): ioredis.Redis;
        new(path: string): ioredis.Redis;
        new(): ioredis.Redis;
        Cluster: ClusterConstructor;
    }
}

declare const redisMock: redisMock.Constructor;
export = redisMock;
