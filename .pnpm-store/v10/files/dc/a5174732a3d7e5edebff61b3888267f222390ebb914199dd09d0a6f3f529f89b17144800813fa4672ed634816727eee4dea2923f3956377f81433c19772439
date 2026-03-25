# @redis/json

This package provides support for the [RedisJSON](https://redis.io/docs/stack/json/) module, which adds JSON as a native data type to Redis.  It extends the [Node Redis client](https://github.com/redis/node-redis) to include functions for each of the RedisJSON commands.

To use these extra commands, your Redis server must have the RedisJSON module installed.

## Usage

For a complete example, see [`managing-json.js`](https://github.com/redis/node-redis/blob/master/examples/managing-json.js) in the Node Redis examples folder.

### Storing JSON Documents in Redis

The [`JSON.SET`](https://redis.io/commands/json.set/) command stores a JSON value at a given JSON Path in a Redis key.

Here, we'll store a JSON document in the root of the Redis key "`mydoc`":

```javascript
import { createClient } from 'redis';

...
await client.json.set('noderedis:jsondata', '$', {
  name: 'Roberta McDonald',
  pets: [
    {
    name: 'Rex',
    species: 'dog',
    age: 3,
    isMammal: true
    },
    {
    name: 'Goldie',
    species: 'fish',
    age: 2,
    isMammal: false
    }
  ]
});
```

For more information about RedisJSON's path syntax, [check out the documentation](https://redis.io/docs/stack/json/path/).

### Retrieving JSON Documents from Redis

With RedisJSON, we can retrieve all or part(s) of a JSON document using the [`JSON.GET`](https://redis.io/commands/json.get/) command and one or more JSON Paths.  Let's get the name and age of one of the pets:

```javascript
const results = await client.json.get('noderedis:jsondata', {
  path: [
    '.pets[1].name',
    '.pets[1].age'
  ]
});
```

`results` will contain the following:

```javascript
 { '.pets[1].name': 'Goldie', '.pets[1].age': 2 }
```

### Performing Atomic Updates on JSON Documents Stored in Redis

RedisJSON includes commands that can atomically update values in a JSON document, in place in Redis without having to first retrieve the entire document.

Using the [`JSON.NUMINCRBY`](https://redis.io/commands/json.numincrby/) command, we can update the age of one of the pets like this:

```javascript
await client.json.numIncrBy('noderedis:jsondata', '.pets[1].age', 1);
```

And we can add a new object to the pets array with the [`JSON.ARRAPPEND`](https://redis.io/commands/json.arrappend/) command:

```javascript
await client.json.arrAppend('noderedis:jsondata', '.pets', {
  name: 'Robin',
  species: 'bird',
  age: 1,
  isMammal: false
});
```
