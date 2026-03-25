# @redis/search

This package provides support for the [RediSearch](https://redisearch.io) module, which adds indexing and querying support for data stored in Redis Hashes or as JSON documents with the RedisJSON module.  It extends the [Node Redis client](https://github.com/redis/node-redis) to include functions for each of the RediSearch commands.

To use these extra commands, your Redis server must have the RediSearch module installed.  To index and query JSON documents, you'll also need to add the RedisJSON module.

## Usage

For complete examples, see [`search-hashes.js`](https://github.com/redis/node-redis/blob/master/examples/search-hashes.js) and [`search-json.js`](https://github.com/redis/node-redis/blob/master/examples/search-json.js) in the Node Redis examples folder.

### Indexing and Querying Data in Redis Hashes

#### Creating an Index

Before we can perform any searches, we need to tell RediSearch how to index our data, and which Redis keys to find that data in.  The [FT.CREATE](https://redis.io/commands/ft.create) command creates a RediSearch index.  Here's how to use it to create an index we'll call `idx:animals` where we want to index hashes containing `name`, `species` and `age` fields, and whose key names in Redis begin with the prefix `noderedis:animals`:

```javascript
await client.ft.create('idx:animals', {
  name: {
    type: SchemaFieldTypes.TEXT,
    SORTABLE: true
  },
  species: SchemaFieldTypes.TAG,
  age: SchemaFieldTypes.NUMERIC
}, {
  ON: 'HASH',
  PREFIX: 'noderedis:animals'
});
```

See the [`FT.CREATE` documentation](https://redis.io/commands/ft.create/#description) for information about the different field types and additional options.

#### Querying the Index

Once we've created an index, and added some data to Redis hashes whose keys begin with the prefix `noderedis:animals`, we can start writing some search queries.  RediSearch supports a rich query syntax for full-text search, faceted search, aggregation and more.  Check out the [`FT.SEARCH` documentation](https://redis.io/commands/ft.search) and the [query syntax reference](https://redis.io/docs/interact/search-and-query/query) for more information.

Let's write a query to find all the animals where the `species` field has the value `dog`:

```javascript
const results = await client.ft.search('idx:animals', '@species:{dog}');
```

`results` looks like this:

```javascript
{
  total: 2,
  documents: [
    {
      id: 'noderedis:animals:4',
      value: {
        name: 'Fido',
        species: 'dog',
        age: '7'
      }
    },
    {
      id: 'noderedis:animals:3',
      value: {
        name: 'Rover',
        species: 'dog',
        age: '9'
      }
    }
  ]
}
```

### Indexing and Querying Data with RedisJSON

RediSearch can also index and query JSON documents stored in Redis using the RedisJSON module.  The approach is similar to that for indexing and searching data in hashes, but we can now use JSON Path like syntax and the data no longer has to be flat name/value pairs - it can contain nested objects and arrays.

#### Creating an Index

As before, we create an index with the `FT.CREATE` command, this time specifying we want to index JSON documents that look like this:

```javascript
{
  name: 'Alice',
  age: 32,
  coins: 100
}
```

Each document represents a user in some system, and users have name, age and coins properties.

One way we might choose to index these documents is as follows:

```javascript
await client.ft.create('idx:users', {
  '$.name': {
    type: SchemaFieldTypes.TEXT,
    SORTABLE: 'UNF'
  },
  '$.age': {
    type: SchemaFieldTypes.NUMERIC,
    AS: 'age'
  },
  '$.coins': {
    type: SchemaFieldTypes.NUMERIC,
    AS: 'coins'
  }
}, {
  ON: 'JSON',
  PREFIX: 'noderedis:users'
});
```

Note that we're using JSON Path to specify where the fields to index are in our JSON documents, and the `AS` clause to define a name/alias for each field.  We'll use these when writing queries.

#### Querying the Index

Now we have an index and some data stored as JSON documents in Redis (see the [JSON package documentation](https://github.com/redis/node-redis/tree/master/packages/json) for examples of how to store JSON), we can write some queries...

We'll use the [RediSearch query language](https://redis.io/docs/interact/search-and-query/query) and [`FT.SEARCH`](https://redis.io/commands/ft.search) command.  Here's a query to find users under the age of 30:

```javascript
await client.ft.search('idx:users', '@age:[0 30]');
```
