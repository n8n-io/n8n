# Installation
> `npm install --save @types/ioredis-mock`

# Summary
This package contains type definitions for ioredis-mock (https://github.com/stipsan/ioredis-mock#readme).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ioredis-mock.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ioredis-mock/index.d.ts)
````ts
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

````

### Additional Details
 * Last updated: Fri, 06 Mar 2026 09:09:01 GMT
 * Dependencies: none
 * Peer dependencies: [ioredis](https://npmjs.com/package/ioredis)

# Credits
These definitions were written by [Lukas Elmer](https://github.com/lukaselmer).
