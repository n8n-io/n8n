# @jridgewell/trace-mapping

> Trace the original position through a source map

`trace-mapping` allows you to take the line and column of an output file and trace it to the
original location in the source file through a source map.

You may already be familiar with the [`source-map`][source-map] package's `SourceMapConsumer`. This
provides the same `originalPositionFor` and `generatedPositionFor` API, without requiring WASM.

## Installation

```sh
npm install @jridgewell/trace-mapping
```

## Usage

```typescript
import { TraceMap, originalPositionFor, generatedPositionFor } from '@jridgewell/trace-mapping';

const tracer = new TraceMap({
  version: 3,
  sources: ['input.js'],
  names: ['foo'],
  mappings: 'KAyCIA',
});

// Lines start at line 1, columns at column 0.
const traced = originalPositionFor(tracer, { line: 1, column: 5 });
assert.deepEqual(traced, {
  source: 'input.js',
  line: 42,
  column: 4,
  name: 'foo',
});

const generated = generatedPositionFor(tracer, {
  source: 'input.js',
  line: 42,
  column: 4,
});
assert.deepEqual(generated, {
  line: 1,
  column: 5,
});
```

We also provide a lower level API to get the actual segment that matches our line and column. Unlike
`originalPositionFor`, `traceSegment` uses a 0-base for `line`:

```typescript
import { traceSegment } from '@jridgewell/trace-mapping';

// line is 0-base.
const traced = traceSegment(tracer, /* line */ 0, /* column */ 5);

// Segments are [outputColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex]
// Again, line is 0-base and so is sourceLine
assert.deepEqual(traced, [5, 0, 41, 4, 0]);
```

### SectionedSourceMaps

The sourcemap spec defines a special `sections` field that's designed to handle concatenation of
output code with associated sourcemaps. This type of sourcemap is rarely used (no major build tool
produces it), but if you are hand coding a concatenation you may need it. We provide an `AnyMap`
helper that can receive either a regular sourcemap or a `SectionedSourceMap` and returns a
`TraceMap` instance:

```typescript
import { AnyMap } from '@jridgewell/trace-mapping';
const fooOutput = 'foo';
const barOutput = 'bar';
const output = [fooOutput, barOutput].join('\n');

const sectioned = new AnyMap({
  version: 3,
  sections: [
    {
      // 0-base line and column
      offset: { line: 0, column: 0 },
      // fooOutput's sourcemap
      map: {
        version: 3,
        sources: ['foo.js'],
        names: ['foo'],
        mappings: 'AAAAA',
      },
    },
    {
      // barOutput's sourcemap will not affect the first line, only the second
      offset: { line: 1, column: 0 },
      map: {
        version: 3,
        sources: ['bar.js'],
        names: ['bar'],
        mappings: 'AAAAA',
      },
    },
  ],
});

const traced = originalPositionFor(sectioned, {
  line: 2,
  column: 0,
});

assert.deepEqual(traced, {
  source: 'bar.js',
  line: 1,
  column: 0,
  name: 'bar',
});
```

## Benchmarks

```
node v18.0.0

amp.js.map
trace-mapping:    decoded JSON input x 183 ops/sec ±0.41% (87 runs sampled)
trace-mapping:    encoded JSON input x 384 ops/sec ±0.89% (89 runs sampled)
trace-mapping:    decoded Object input x 3,085 ops/sec ±0.24% (100 runs sampled)
trace-mapping:    encoded Object input x 452 ops/sec ±0.80% (84 runs sampled)
source-map-js:    encoded Object input x 88.82 ops/sec ±0.45% (77 runs sampled)
source-map-0.6.1: encoded Object input x 38.39 ops/sec ±1.88% (52 runs sampled)
Fastest is trace-mapping:    decoded Object input

trace-mapping:    decoded originalPositionFor x 4,025,347 ops/sec ±0.15% (97 runs sampled)
trace-mapping:    encoded originalPositionFor x 3,333,136 ops/sec ±1.26% (90 runs sampled)
source-map-js:    encoded originalPositionFor x 824,978 ops/sec ±1.06% (94 runs sampled)
source-map-0.6.1: encoded originalPositionFor x 741,300 ops/sec ±0.93% (92 runs sampled)
source-map-0.8.0: encoded originalPositionFor x 2,587,603 ops/sec ±0.75% (97 runs sampled)
Fastest is trace-mapping:    decoded originalPositionFor

***

babel.min.js.map
trace-mapping:    decoded JSON input x 17.43 ops/sec ±8.81% (33 runs sampled)
trace-mapping:    encoded JSON input x 34.18 ops/sec ±4.67% (50 runs sampled)
trace-mapping:    decoded Object input x 1,010 ops/sec ±0.41% (98 runs sampled)
trace-mapping:    encoded Object input x 39.45 ops/sec ±4.01% (52 runs sampled)
source-map-js:    encoded Object input x 6.57 ops/sec ±3.04% (21 runs sampled)
source-map-0.6.1: encoded Object input x 4.23 ops/sec ±2.93% (15 runs sampled)
Fastest is trace-mapping:    decoded Object input

trace-mapping:    decoded originalPositionFor x 7,576,265 ops/sec ±0.74% (96 runs sampled)
trace-mapping:    encoded originalPositionFor x 5,019,743 ops/sec ±0.74% (94 runs sampled)
source-map-js:    encoded originalPositionFor x 3,396,137 ops/sec ±42.32% (95 runs sampled)
source-map-0.6.1: encoded originalPositionFor x 3,753,176 ops/sec ±0.72% (95 runs sampled)
source-map-0.8.0: encoded originalPositionFor x 6,423,633 ops/sec ±0.74% (95 runs sampled)
Fastest is trace-mapping:    decoded originalPositionFor

***

preact.js.map
trace-mapping:    decoded JSON input x 3,499 ops/sec ±0.18% (98 runs sampled)
trace-mapping:    encoded JSON input x 6,078 ops/sec ±0.25% (99 runs sampled)
trace-mapping:    decoded Object input x 254,788 ops/sec ±0.13% (100 runs sampled)
trace-mapping:    encoded Object input x 14,063 ops/sec ±0.27% (94 runs sampled)
source-map-js:    encoded Object input x 2,465 ops/sec ±0.25% (98 runs sampled)
source-map-0.6.1: encoded Object input x 1,174 ops/sec ±1.90% (95 runs sampled)
Fastest is trace-mapping:    decoded Object input

trace-mapping:    decoded originalPositionFor x 7,720,171 ops/sec ±0.14% (97 runs sampled)
trace-mapping:    encoded originalPositionFor x 6,864,485 ops/sec ±0.16% (101 runs sampled)
source-map-js:    encoded originalPositionFor x 2,387,219 ops/sec ±0.28% (98 runs sampled)
source-map-0.6.1: encoded originalPositionFor x 1,565,339 ops/sec ±0.32% (101 runs sampled)
source-map-0.8.0: encoded originalPositionFor x 3,819,732 ops/sec ±0.38% (98 runs sampled)
Fastest is trace-mapping:    decoded originalPositionFor

***

react.js.map
trace-mapping:    decoded JSON input x 1,719 ops/sec ±0.19% (99 runs sampled)
trace-mapping:    encoded JSON input x 4,284 ops/sec ±0.51% (99 runs sampled)
trace-mapping:    decoded Object input x 94,668 ops/sec ±0.08% (99 runs sampled)
trace-mapping:    encoded Object input x 5,287 ops/sec ±0.24% (99 runs sampled)
source-map-js:    encoded Object input x 814 ops/sec ±0.20% (98 runs sampled)
source-map-0.6.1: encoded Object input x 429 ops/sec ±0.24% (94 runs sampled)
Fastest is trace-mapping:    decoded Object input

trace-mapping:    decoded originalPositionFor x 28,927,989 ops/sec ±0.61% (94 runs sampled)
trace-mapping:    encoded originalPositionFor x 27,394,475 ops/sec ±0.55% (97 runs sampled)
source-map-js:    encoded originalPositionFor x 16,856,730 ops/sec ±0.45% (96 runs sampled)
source-map-0.6.1: encoded originalPositionFor x 12,258,950 ops/sec ±0.41% (97 runs sampled)
source-map-0.8.0: encoded originalPositionFor x 22,272,990 ops/sec ±0.58% (95 runs sampled)
Fastest is trace-mapping:    decoded originalPositionFor
```

[source-map]: https://www.npmjs.com/package/source-map
