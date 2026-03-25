# @redis/time-series

This package provides support for the [RedisTimeSeries](https://redistimeseries.io) module, which adds a time series data structure to Redis. It extends the [Node Redis client](https://github.com/redis/node-redis) to include functions for each of the RedisTimeSeries commands.

To use these extra commands, your Redis server must have the RedisTimeSeries module installed.

## Usage

For a complete example, see [`time-series.js`](https://github.com/redis/node-redis/blob/master/examples/time-series.js) in the Node Redis examples folder.

### Creating Time Series data structure in Redis

The [`TS.CREATE`](https://oss.redis.com/redistimeseries/commands/#tscreate) command creates a new time series.

Here, we'll create a new time series "`temperature`":

```javascript

import { createClient } from 'redis';
import { TimeSeriesDuplicatePolicies, TimeSeriesEncoding, TimeSeriesAggregationType } from '@redis/time-series';

...

 const created = await client.ts.create('temperature', {
    RETENTION: 86400000, // 1 day in milliseconds
    ENCODING: TimeSeriesEncoding.UNCOMPRESSED, // No compression - When not specified, the option is set to COMPRESSED
    DUPLICATE_POLICY: TimeSeriesDuplicatePolicies.BLOCK, // No duplicates - When not specified: set to the global DUPLICATE_POLICY configuration of the database (which by default, is BLOCK).
  });

    if (created === 'OK') {
    console.log('Created timeseries.');
  } else {
    console.log('Error creating timeseries :(');
    process.exit(1);
  }

```

### Adding new value to a Time Series data structure in Redis

With RedisTimeSeries, we can add a single value to time series data structure using the [`TS.ADD`](https://redis.io/commands/ts.add/) command and if we would like to add multiple values we can use the [`TS.MADD`](https://redis.io/commands/ts.madd/) command.

```javascript

let value = Math.floor(Math.random() * 1000) + 1; // Random data point value
  let currentTimestamp = 1640995200000; // Jan 1 2022 00:00:00
  let num = 0;

  while (num < 10000) {
    // Add a new value to the timeseries, providing our own timestamp:
    // https://redis.io/commands/ts.add/
    await client.ts.add('temperature', currentTimestamp, value);
    console.log(`Added timestamp ${currentTimestamp}, value ${value}.`);

    num += 1;
    value = Math.floor(Math.random() * 1000) + 1; // Get another random value
    currentTimestamp += 1000; // Move on one second.
  }

  // Add multiple values to the timeseries in round trip to the server:
  // https://redis.io/commands/ts.madd/
  const response = await client.ts.mAdd([{
    key: 'temperature',
    timestamp: currentTimestamp + 60000,
    value: Math.floor(Math.random() * 1000) + 1
  }, {
    key: 'temperature',
    timestamp: currentTimestamp + 120000,
    value: Math.floor(Math.random() * 1000) + 1
  }]);


```

### Retrieving Time Series data from Redis

With RedisTimeSeries, we can retrieve the time series data using the [`TS.RANGE`](https://redis.io/commands/ts.range/) command by passing the criteria as follows:

```javascript

// Query the timeseries with TS.RANGE:
  // https://redis.io/commands/ts.range/
  const fromTimestamp = 1640995200000; // Jan 1 2022 00:00:00
  const toTimestamp = 1640995260000; // Jan 1 2022 00:01:00
  const rangeResponse = await client.ts.range('temperature', fromTimestamp, toTimestamp, {
    // Group into 10 second averages.
    AGGREGATION: {
      type: TimeSeriesAggregationType.AVERAGE,
      timeBucket: 10000
    }
  });

  console.log('RANGE RESPONSE:');
  // rangeResponse looks like:
  // [
  //   { timestamp: 1640995200000, value: 356.8 },
  //   { timestamp: 1640995210000, value: 534.8 },
  //   { timestamp: 1640995220000, value: 481.3 },
  //   { timestamp: 1640995230000, value: 437 },
  //   { timestamp: 1640995240000, value: 507.3 },
  //   { timestamp: 1640995250000, value: 581.2 },
  //   { timestamp: 1640995260000, value: 600 }
  // ]

```

### Altering Time Series data Stored in Redis

RedisTimeSeries includes commands that can update values in a time series data structure.

Using the [`TS.ALTER`](https://redis.io/commands/ts.alter/) command, we can update time series retention like this:

```javascript

  // https://redis.io/commands/ts.alter/
  const alterResponse = await client.ts.alter('temperature', {
    RETENTION: 0 // Keep the entries forever
  });

```

### Retrieving Information about the timeseries Stored in Redis

RedisTimeSeries also includes commands that can help to view the information on the state of a time series.

Using the [`TS.INFO`](https://redis.io/commands/ts.info/) command, we can view timeseries information like this:

```javascript

 // Get some information about the state of the timeseries.
  // https://redis.io/commands/ts.info/
  const tsInfo = await client.ts.info('temperature');

  // tsInfo looks like this:
  // {
  //   totalSamples: 1440,
  //   memoryUsage: 28904,
  //   firstTimestamp: 1641508920000,
  //   lastTimestamp: 1641595320000,
  //   retentionTime: 86400000,
  //   chunkCount: 7,
  //   chunkSize: 4096,
  //   chunkType: 'uncompressed',
  //   duplicatePolicy: 'block',
  //   labels: [],
  //   sourceKey: null,
  //   rules: []
  // }

```

