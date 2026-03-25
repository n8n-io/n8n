# hyperid

[![Build Status](https://img.shields.io/github/workflow/status/mcollina/hyperid/CI)](https://github.com/mcollina/hyperid/actions)

Uber-fast unique id generation, for Node.js and the browser.
Here are the benchmarks:

```
crypto.randomUUID x 12,969,725 ops/sec ±0.88% (91 runs sampled)
hashids process.hrtime x 419,350 ops/sec ±0.66% (94 runs sampled)
hashids counter x 819,049 ops/sec ±0.58% (93 runs sampled)
shortid x 40,820 ops/sec ±2.49% (87 runs sampled)
crypto.random x 372,773 ops/sec ±2.39% (84 runs sampled)
nid x 1,614,450 ops/sec ±0.38% (93 runs sampled)
uuid.v4 x 1,446,051 ops/sec ±0.60% (98 runs sampled)
napiRsUuid.v4 x 8,676,151 ops/sec ±0.49% (97 runs sampled)
uuid.v1 x 2,051,072 ops/sec ±0.15% (99 runs sampled)
nanoid x 4,293,733 ops/sec ±0.31% (97 runs sampled)
hyperid - variable length x 25,937,129 ops/sec ±1.48% (91 runs sampled)
hyperid - fixed length x 24,970,478 ops/sec ±1.48% (92 runs sampled)
hyperid - fixed length, url safe x 25,856,735 ops/sec ±1.93% (92 runs sampled)

Fastest is hyperid - variable length,hyperid - fixed length, url safe
Slowest is shortid
```

_Note:_ Benchmark run with Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz and Node.js v22.0.0

As you can see the native `crypto.randomUUID` is almost as fast as hyperid
on Node.js v16, but not on v14.

## Install

```
npm i hyperid --save
```

## Example

```js
'use strict'

const hyperid = require('hyperid')
const instance = hyperid()

const id = instance()

console.log(id)
console.log(instance())
console.log(hyperid.decode(id))
console.log(hyperid.decode(instance()))
```

## API

### hyperid([fixedLength || options])

Returns a function to generate unique ids.
The function can accept one of the following parameters:
- `fixedLength: Boolean`
If *fixedLength* is `true` the function will always generate an id
that is 33 characters in length, by default `fixedLength` is `false`.
- `options: Object`
If `{ fixedLength: true }` is passed in, the function will always generate an id
that is 33 characters in length, by default `fixedLength` is `false`.
If `{ urlSafe: true }` is passed in, the function will generate url safe ids according to RFC4648.
If `{ startFrom: <int> }` is passed in, the first counter will start from that
number, which must be between 0 and 2147483647. Fractions are discarded, only the
integer part matters.
If `{ maxInt: <int> }` is passed in, the uuid will be re-generated once the *maxInt* is reached. The lesser the *maxInt*, higher the performance because of SMI (a V8 optimization).

### instance()

Returns an unique id.

### instance.uuid

The uuid used to generate the ids, it will change over time.
If `maxInt` is provided in options, then it will regenerated every `maxInt`, else it will be regenerated every `Math.pow(2, 31) - 1` to keep the integer a SMI (a V8 optimization). 

### hyperid.decode(id, [options])

Decode the unique id into its two components, a `uuid` and a counter.
If you are generating *url safe* ids, you must pass `{ urlSafe: true }` as option.
It returns:

```js
{
  uuid: '049b7020-c787-41bf-a1d2-a97612c11418',
  count: 1
}
```

This is aliased as `instance.decode`.

## License

MIT
