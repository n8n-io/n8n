# Installation
> `npm install --save @types/ioredis-mock`

# Summary
This package contains type definitions for ioredis-mock (https://github.com/stipsan/ioredis-mock#readme).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ioredis-mock.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/ioredis-mock/index.d.ts)
````ts
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

````

### Additional Details
 * Last updated: Sat, 13 May 2023 14:02:49 GMT
 * Dependencies: [@types/ioredis](https://npmjs.com/package/@types/ioredis)
 * Global values: none

# Credits
These definitions were written by [Lukas Elmer](https://github.com/lukaselmer).
