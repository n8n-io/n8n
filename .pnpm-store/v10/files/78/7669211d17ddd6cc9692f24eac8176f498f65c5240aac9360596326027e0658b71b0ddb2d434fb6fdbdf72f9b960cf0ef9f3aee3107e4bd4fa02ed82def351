[![Coverage Status](https://coveralls.io/repos/github/Salakar/cluster-key-slot/badge.svg?branch=master)](https://coveralls.io/github/Salakar/cluster-key-slot?branch=master)
![Downloads](https://img.shields.io/npm/dt/cluster-key-slot.svg)
[![npm version](https://img.shields.io/npm/v/cluster-key-slot.svg)](https://www.npmjs.com/package/cluster-key-slot)
[![dependencies](https://img.shields.io/david/Salakar/cluster-key-slot.svg)](https://david-dm.org/Salakar/cluster-key-slot)
[![License](https://img.shields.io/npm/l/cluster-key-slot.svg)](/LICENSE)
<a href="https://twitter.com/mikediarmid"><img src="https://img.shields.io/twitter/follow/mikediarmid.svg?style=social&label=Follow" alt="Follow on Twitter"></a>

# Redis Key Slot Calculator

A high performance redis cluster key slot calculator for node redis clients e.g. [node_redis](https://github.com/NodeRedis/node_redis), [ioredis](https://github.com/luin/ioredis) and [redis-clustr](https://github.com/gosquared/redis-clustr/).

This also handles key tags such as `somekey{actualTag}`.

## Install

Install with [NPM](https://npmjs.org/):

```
npm install cluster-key-slot --save
```

## Usage

```js
const calculateSlot = require('cluster-key-slot');
const calculateMultipleSlots = require('cluster-key-slot').generateMulti;

// ...

// a single slot number
const slot = calculateSlot('test:key:{butOnlyThis}redis');
// Buffer is also supported
const anotherSlot = calculateSlot(Buffer.from([0x7b, 0x7d, 0x2a]));

// multiple keys - multi returns a single key slot number, returns -1 if any
// of the keys does not match the base slot number (base is defaulted to first keys slot)
// This is useful to quickly determine a singe slot for multi keys operations.
const slotForRedisMulti = calculateMultipleSlots([
  'test:key:{butOnlyThis}redis',
  'something:key45:{butOnlyThis}hello',
  'example:key46:{butOnlyThis}foobar',
]);
```

## Benchmarks

`OLD` in these benchmarks refers to the `ioredis` crc calc and many of the other calculators that use `Buffer`.

```text
node -v                                                                                                                                                                                                ✔  16.38G RAM  10:29:07
v10.15.3

NEW tags x 721,445 ops/sec ±0.44% (90 runs sampled)
OLD tags x 566,777 ops/sec ±0.97% (96 runs sampled)
NEW without tags x 2,054,845 ops/sec ±1.77% (92 runs sampled)
OLD without tags x 865,839 ops/sec ±0.43% (96 runs sampled)
NEW without tags singular x 6,354,097 ops/sec ±1.25% (94 runs sampled)
OLD without tags singular x 4,012,250 ops/sec ±0.96% (94 runs sampled)
NEW tags (Buffer) x 552,346 ops/sec ±1.35% (92 runs sampled)
```

