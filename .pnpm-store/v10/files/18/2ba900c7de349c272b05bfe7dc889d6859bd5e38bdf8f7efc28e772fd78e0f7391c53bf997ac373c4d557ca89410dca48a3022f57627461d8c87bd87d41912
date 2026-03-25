@protobufjs/float
=================
[![npm](https://img.shields.io/npm/v/@protobufjs/float.svg)](https://www.npmjs.com/package/@protobufjs/float)

Reads / writes floats / doubles from / to buffers in both modern and ancient browsers. Fast.

API
---

* **writeFloatLE(val: `number`, buf: `Uint8Array`, pos: `number`)**<br />
  Writes a 32 bit float to a buffer using little endian byte order.

* **writeFloatBE(val: `number`, buf: `Uint8Array`, pos: `number`)**<br />
  Writes a 32 bit float to a buffer using big endian byte order.

* **readFloatLE(buf: `Uint8Array`, pos: `number`): `number`**<br />
  Reads a 32 bit float from a buffer using little endian byte order.

* **readFloatBE(buf: `Uint8Array`, pos: `number`): `number`**<br />
  Reads a 32 bit float from a buffer using big endian byte order.

* **writeDoubleLE(val: `number`, buf: `Uint8Array`, pos: `number`)**<br />
  Writes a 64 bit double to a buffer using little endian byte order.

* **writeDoubleBE(val: `number`, buf: `Uint8Array`, pos: `number`)**<br />
  Writes a 64 bit double to a buffer using big endian byte order.

* **readDoubleLE(buf: `Uint8Array`, pos: `number`): `number`**<br />
  Reads a 64 bit double from a buffer using little endian byte order.

* **readDoubleBE(buf: `Uint8Array`, pos: `number`): `number`**<br />
  Reads a 64 bit double from a buffer using big endian byte order.

Performance
-----------
There is a simple benchmark included comparing raw read/write performance of this library (float), float's fallback for old browsers, the [ieee754](https://www.npmjs.com/package/ieee754) module and node's [buffer](https://nodejs.org/api/buffer.html). On an i7-2600k running node 6.9.1 it yields:

```
benchmarking writeFloat performance ...

float x 42,741,625 ops/sec ±1.75% (81 runs sampled)
float (fallback) x 11,272,532 ops/sec ±1.12% (85 runs sampled)
ieee754 x 8,653,337 ops/sec ±1.18% (84 runs sampled)
buffer x 12,412,414 ops/sec ±1.41% (83 runs sampled)
buffer (noAssert) x 13,471,149 ops/sec ±1.09% (84 runs sampled)

                      float was fastest
           float (fallback) was 73.5% slower
                    ieee754 was 79.6% slower
                     buffer was 70.9% slower
          buffer (noAssert) was 68.3% slower

benchmarking readFloat performance ...

float x 44,382,729 ops/sec ±1.70% (84 runs sampled)
float (fallback) x 20,925,938 ops/sec ±0.86% (87 runs sampled)
ieee754 x 17,189,009 ops/sec ±1.01% (87 runs sampled)
buffer x 10,518,437 ops/sec ±1.04% (83 runs sampled)
buffer (noAssert) x 11,031,636 ops/sec ±1.15% (87 runs sampled)

                      float was fastest
           float (fallback) was 52.5% slower
                    ieee754 was 61.0% slower
                     buffer was 76.1% slower
          buffer (noAssert) was 75.0% slower

benchmarking writeDouble performance ...

float x 38,624,906 ops/sec ±0.93% (83 runs sampled)
float (fallback) x 10,457,811 ops/sec ±1.54% (85 runs sampled)
ieee754 x 7,681,130 ops/sec ±1.11% (83 runs sampled)
buffer x 12,657,876 ops/sec ±1.03% (83 runs sampled)
buffer (noAssert) x 13,372,795 ops/sec ±0.84% (85 runs sampled)

                      float was fastest
           float (fallback) was 73.1% slower
                    ieee754 was 80.1% slower
                     buffer was 67.3% slower
          buffer (noAssert) was 65.3% slower

benchmarking readDouble performance ...

float x 40,527,888 ops/sec ±1.05% (84 runs sampled)
float (fallback) x 18,696,480 ops/sec ±0.84% (86 runs sampled)
ieee754 x 14,074,028 ops/sec ±1.04% (87 runs sampled)
buffer x 10,092,367 ops/sec ±1.15% (84 runs sampled)
buffer (noAssert) x 10,623,793 ops/sec ±0.96% (84 runs sampled)

                      float was fastest
           float (fallback) was 53.8% slower
                    ieee754 was 65.3% slower
                     buffer was 75.1% slower
          buffer (noAssert) was 73.8% slower
```

To run it yourself:

```
$> npm run bench
```

**License:** [BSD 3-Clause License](https://opensource.org/licenses/BSD-3-Clause)
