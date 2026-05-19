# Caching queries

You can cache results selected by these `QueryBuilder` methods: `getMany`, `getOne`, `getRawMany`, `getRawOne` and `getCount`.

You can also cache results selected by `find*` and `count*` methods of the `Repository` and `EntityManager`.

To enable caching you need to explicitly enable it in data source options:

```typescript
{
    type: "mysql",
    host: "localhost",
    username: "test",
    ...
    cache: true
}
```

When you enable cache for the first time,
you must synchronize your database schema (using CLI, migrations or the `synchronize` data source option).

Then in `QueryBuilder` you can enable query cache for any query:

```typescript
const users = await dataSource
    .createQueryBuilder(User, "user")
    .where("user.isAdmin = :isAdmin", { isAdmin: true })
    .cache(true)
    .getMany()
```

Equivalent `Repository` query:

```typescript
const users = await dataSource.getRepository(User).find({
    where: { isAdmin: true },
    cache: true,
})
```

This will execute a query to fetch all admin users and cache the results.
Next time you execute the same code, it will get all admin users from the cache.
Default cache lifetime is equal to `1000 ms`, e.g. 1 second.
This means the cache will be invalid 1 second after the query builder code is called.
In practice, this means that if users open the user page 150 times within 3 seconds, only three queries will be executed during this period.
Any users inserted during the 1 second cache window won't be returned to the user.

You can change cache time manually via `QueryBuilder`:

```typescript
const users = await dataSource
    .createQueryBuilder(User, "user")
    .where("user.isAdmin = :isAdmin", { isAdmin: true })
    .cache(60000) // 1 minute
    .getMany()
```

Or via `Repository`:

```typescript
const users = await dataSource.getRepository(User).find({
    where: { isAdmin: true },
    cache: 60000,
})
```

Or globally in data source options:

```typescript
{
    type: "mysql",
    host: "localhost",
    username: "test",
    ...
    cache: {
        duration: 30000 // 30 seconds
    }
}
```

Also, you can set a "cache id" via `QueryBuilder`:

```typescript
const users = await dataSource
    .createQueryBuilder(User, "user")
    .where("user.isAdmin = :isAdmin", { isAdmin: true })
    .cache("users_admins", 25000)
    .getMany()
```

Or with `Repository`:

```typescript
const users = await dataSource.getRepository(User).find({
    where: { isAdmin: true },
    cache: {
        id: "users_admins",
        milliseconds: 25000,
    },
})
```

This gives you granular control of your cache,
for example, clearing cached results when you insert a new user:

```typescript
await dataSource.queryResultCache.remove(["users_admins"])
```

By default, TypeORM uses a separate table called `query-result-cache` and stores all queries and results there.
Table name is configurable, so you could change it by specifying a different value in the tableName property.
Example:

```typescript
{
    type: "mysql",
    host: "localhost",
    username: "test",
    ...
    cache: {
        type: "database",
        tableName: "configurable-table-query-result-cache"
    }
}
```

If storing cache in a single database table is not effective for you,
you can change the cache type to "redis" or "ioredis" and TypeORM will store all cached records in redis instead.
Example:

```typescript
{
    type: "mysql",
    host: "localhost",
    username: "test",
    ...
    cache: {
        type: "redis",
        options: {
            socket: {
                host: "localhost",
                port: 6379
            }
        }
    }
}
```

"options" can be [node_redis specific options](https://github.com/redis/node-redis/blob/master/docs/client-configuration.md) or [ioredis specific options](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options) depending on what type you're using.

In case you want to connect to a redis-cluster using IORedis's cluster functionality, you can do that as well by doing the following:

```typescript
{
    type: "mysql",
    host: "localhost",
    username: "test",
    cache: {
        type: "ioredis/cluster",
        options: {
            startupNodes: [
                {
                    host: 'localhost',
                    port: 7000,
                },
                {
                    host: 'localhost',
                    port: 7001,
                },
                {
                    host: 'localhost',
                    port: 7002,
                }
            ],
            options: {
                scaleReads: 'all',
                clusterRetryStrategy: function (times) { return null },
                redisOptions: {
                    maxRetriesPerRequest: 1
                }
            }
        }
    }
}
```

Note that, you can still use options as the first argument of IORedis's cluster constructor.

```typescript
{
    ...
    cache: {
        type: "ioredis/cluster",
        options: [
            {
                host: 'localhost',
                port: 7000,
            },
            {
                host: 'localhost',
                port: 7001,
            },
            {
                host: 'localhost',
                port: 7002,
            }
        ]
    },
    ...
}
```

If none of the built-in cache providers satisfy your demands, then you can also specify your own cache provider by using a `provider` factory function which needs to return a new object that implements the `QueryResultCache` interface:

```typescript
class CustomQueryResultCache implements QueryResultCache {
    constructor(private dataSource: DataSource) {}
    ...
}
```

```typescript
{
    ...
    cache: {
        provider(dataSource) {
            return new CustomQueryResultCache(dataSource);
        }
    }
}
```

If you wish to ignore cache errors and want the queries to pass through to database in case of cache errors, you can use ignoreErrors option.
Example:

```typescript
{
    type: "mysql",
    host: "localhost",
    username: "test",
    ...
    cache: {
        type: "redis",
        options: {
            socket: {
                host: "localhost",
                port: 6379
            }
        },
        ignoreErrors: true
    }
}
```

You can use `typeorm cache:clear` to clear everything stored in the cache.
