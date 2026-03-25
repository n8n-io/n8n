[![Build Status](https://travis-ci.org/HdrHistogram/HdrHistogramJS.svg?branch=master)](https://travis-ci.org/HdrHistogram/HdrHistogramJS)

# HdrHistogramJS

TypeScript port of HdrHistogram for NodeJS and web browsers.  
Since version 2, HdrHistogramJS comes in 2 flavors: the good old TypeScript implementation and a brand new WebAssembly implementation!  
This new WebAssembly implementation leverages on AssemblyScript to bring a significant performance boost. Since some caution must be taken using this WebAssembly implementation it is not enabled by default.  
Check out the [WebAssembly section](#boosting-performances-with-webassembly-since-hdrhistogramjs-v2) for more details on this topic.  
Most features from original Java HdrHistogram implementation are implemented, including the following ones:

- regular latency recording
- latency recording with coordinated omissions correction
- resizable bucket based histograms
- memory optimized packed histograms
- add and substract histograms
- encoding and decoding compressed histograms

# Dataviz

HdrHistogramJS allows to display histograms without server-side processing. Hence, within your browser, you can:

- Display histograms with this slightly modified version of the [hdrhistogram plotter](https://hdrhistogram.github.io/HdrHistogramJSDemo/plotFiles.html). With this one you can use base64 v2 encoded histograms as inputs.
- Analyze log files with this [log analyzer](https://hdrhistogram.github.io/HdrHistogramJSDemo/logparser.html), inspired from the original [java/swing based log analyzer](https://github.com/HdrHistogram/HistogramLogAnalyzer).

# Getting started

This library is packaged as a UMD module, hence you can use it directly
from JavaScript within a browser. To do so, you can simply include HdrHistogramJS file from github's release page:

```html
<script src="https://github.com/HdrHistogram/HdrHistogramJS/releases/download/v2.0.2/hdrhistogram.umd.js"></script>
```

Then you will have access to classes and functions of the APIs using "hdr" prefix.

You can also use HdrHistogramJS as a commonjs NodeJS module.
Using npm you can get HdrHIstogramJS with the following command:

```sh
  npm i hdr-histogram-js
```

Or if you like yarn better:

```sh
  yarn add hdr-histogram-js
```

Note for TypeScript developers: since HdrHistogramJS has been written in TypeScript, definition files are embedded, no additional task is needed to get them.

# API

The examples below use ES6 syntax. You can check out demo sources
for examples on how to use HdrHistogram directly within a browser, you should
not have any surprise though.

## Instantiate an histogram

HdrHistogramJS provides several histogram implementations. The simplest way to get a new histogram instance is to use the _build()_ function. Here is how to use it:

```ts
import * as hdr from "hdr-histogram-js"

const histogram = hdr.build();
```

If you need more control on the memory footprint of the instantiated histogram, you can be more specific using and optional build request parameter:

```ts
import * as hdr from "hdr-histogram-js"

const histogram
  = hdr.build(
    {
      bitBucketSize: 32,                // may be 8, 16, 32, 64 or 'packed'
      autoResize: true,                 // default value is true
      lowestDiscernibleValue: 1,        // default value is also 1
      highestTrackableValue: 2,         // can increase up to Number.MAX_SAFE_INTEGER
      numberOfSignificantValueDigits: 3 // Number between 1 and 5 (inclusive)
      useWebAssembly: false             // default value is false, see WebAssembly section for details
    }
  );

```

BitBucketSize 'packed' options is available since HdrHistogramJS v1.2 . Like the Java packed implementation, it has a very low memory footprint but it is way slower than regular bucket based implementation.

## Record values and retrieve metrics

Once you have an histogram instance, in order to record a value you just need
to call method recordValue() as below:

```ts
import * as hdr from "hdr-histogram-js"
const histogram = hdr.build();
...
const latency = 1234;
histogram.recordValue(latency);
```

The number passed as a parameter is expected to be an integer. If it is not the case, the decimal part will be ignored.

Once you have recorded some values, you can get min, max, median values and of course percentiles values as shown below:

```ts
import * as hdr from "hdr-histogram-js"

const h = hdr.build();
h.recordValue(123);
h.recordValue(122);
h.recordValue(1244);

console.log(h.minNonZeroValue);           // 122
console.log(h.maxValue);                  // 1244
console.log(h.mean);                      // 486.333...
console.log(h.getValueAtPercentile(90));  // 1244 as well
console.log(h.summary);                   // { "p50": 123, ... , max: 1244, totalCount: 3 }
```

If you need a live example you can also take alook at this [simple ping demo](https://hdrhistogram.github.io/HdrHistogramJSDemo/ping-demo.html) or this [HdrHistogramJS on HdrHistogramJS demo](https://hdrhistogram.github.io/HdrHistogramJSDemo/hdr-on-hdr.html).

You can also very easily generate a textual
representation of an histogram:

```ts
console.log(`Statistics ${h}`);

// output will be:
//
// Statistics Histogram 32b {
//  "p50": 123,
//  "p75": 1240,
//  "p90": 1240,
//  "p97_5": 1240,
//  "p99": 1240,
//  "p99_9": 1240,
//  "p99_99": 1240,
//  "p99_999": 1240,
//  "max": 1244,
//  "totalCount": 3
// }

```

You can also general an exhaustive textual representation similar to the one generated by the original Java HdrHistogram implementation:

```ts
import * as hdr from "hdr-histogram-js"

const histogram = hdr.build();
histogram.recordValue(25);
histogram.recordValue(50);
histogram.recordValue(75);
const output = histogram.outputPercentileDistribution();

// output will be:
//
//       Value     Percentile TotalCount 1/(1-Percentile)
//
//      25.000 0.000000000000          1           1.00
//  ...
//      75.000 0.700000000000          3           3.33
//      75.000 1.000000000000          3
//#[Mean    =       50.000, StdDeviation   =       20.412]
//#[Max     =       75.000, Total count    =            3]
//#[Buckets =           43, SubBuckets     =         2048]

```

## Dealing with coordinated omissions

If you are recording values at a fixed rate,
you can correct coordinated omissions while recording values:

```ts
histogram.recordValueWithExpectedInterval(1234, 100);
```

If you prefer to apply correction afterward:

```ts
const correctedHistogram
  = histogram.copyCorrectedForCoordinatedOmission(100);
```

## Boosting performances with WebAssembly

Since version 2, HdrHistogramJS leverages on WebAssembly to speed up computations. Depending on the use case, the performance boost can be as high as twice as fast :)  
Everything has been done to make your life easier when using HdrHistogramJS WebAssembly implementation, but since the usage a little bit different WebAssembly is not enabled by default.  
To benefit from WebAssembly performance boost, there are three things to take care of:

- Bootstrap the HdrHistogramJS WebAssembly module at application startup
- Build a WebAssembly histogram setting the useWebAssembly flag to true
- Explicitely ask to free up memory by calling _histogram.destroy()_ once an histogram is not needed anymore.

Even if under the cover a WebAssembly histogram is very different from a regular JS based histogram, both provide exactly the same interface.  
The code fragment below shows how to instantiate a resizable 32 bits WebAssembly histogram:

```ts
import * as hdr from "hdr-histogram-js"

// If you are on the browser side, you need to
// load asynchronously HdrHistogramJS WASM module
await hdr.initWebAssembly();

// If you are on the server side, you can
// load synchronously HdrHistogramJS WASM module
hdr.initWebAssemblySync();

const histogram = hdr.build({ useWebAssembly: true });

// you can now use your histogram the same way you would do
// with a regular "JS histogram"
histogram.recordValue(42);
console.log(histogram.outputPercentileDistribution());

// free up memory once the histogram is not needed anymore,
// otherwise WebAssembly memory footprint will keep growing
// each time an histogram is created
histogram.destroy();

```

Note: If you want to use this feature on the browser side, along with the UMD package, you need to add external dependency
"pako". "pako" is mandatory to bootstrap the WASM module which is compressed to save some weight.

## Encode & decode

You can encode and decode base64 compressed histograms. Hence you can decode base64 compressed histograms produced by other implementations of HdrHistogram (Java, C#, Rust, ...).  
The code fragment below shows how to encode an histogram:

```ts
import * as hdr from "hdr-histogram-js"

const histogram = hdr.build();
histogram.recordvalue(42);
const encodedString = hdr.encodeIntoCompressedBase64(histogram);
// gives something that looks like "HISTFAAAAB542pNpmSzMwMDAxAABzFCaEUoz2X+AMIKZAEARAtM="
```

Then to decode an histogram you can use this chunk of code:

```ts
import * as hdr from "hdr-histogram-js"

const encodedString = "HISTFAAAAB542pNpmSzMwMDAxAABzFCaEUoz2X+AMIKZAEARAtM=";
const histogram = hdr.decodeFromCompressedBase64(encodedString);
```

In the above code fragment, 'histogram' is a regular 32b bucket histogram. Other types of histograms can be specified using additional parameters. Below a code fragment where a WebAssembly packed histogram is used:

```ts
import * as hdr from "hdr-histogram-js"

const encodedString = "HISTFAAAAB542pNpmSzMwMDAxAABzFCaEUoz2X+AMIKZAEARAtM=";
const histogram = hdr.decodeFromCompressedBase64(encodedString, 'packed', true);
```

If you want to use this feature along with the UMD package, you need to add external dependency
"pako". "pako" is used for zlib compression. Using npm you should get
it as a transitive dependency, otherwise you need to add it in
your html page.

You can check out [this demo](https://hdrhistogram.github.io/HdrHistogramJSDemo/decoding-demo.html) or this [plotter on steroid](https://hdrhistogram.github.io/HdrHistogramJSDemo/plotFiles.html) to see this feature live!  
_Be aware that only latest V2 encoding has been implemented, please raise a github issue if you need to see other versions implemented_

## Histogram logs

HistogramLogWriter and HistogramLogReader classes have been migrated and the API is quite similar to the one you might have used with the Java version.
Below a simple usage example of the HistogramLogWriter, where the log contents are appended to a string variable:

```ts
import * as hdr from "hdr-histogram-js"

let buffer: string;
const writer = new hdr.HistogramLogWriter(content => {
  buffer += content;
});
const histogram = hdr.build();
histogram.startTimeStampMsec = 1234001;
histogram.endTimeStampMsec   = 1235123;

...

histogram.recordValue(123000);

writer.outputLogFormatVersion();
writer.outputLegend();
writer.outputIntervalHistogram(histogram);
```

As for the reading part, if you know a little bit the Java version, the following code fragment will sound familiar:

```ts
const reader = new hdr.HistogramLogReader(fileContent);
let histogram;
while ((histogram = reader.nextIntervalHistogram()) != null) {
  // iterate on all histogram log lines
  ...

}
```

# Performance tips

HdrHistogramJS stores values in memory buckets. Memory footprint of an histogram heavily depends on 3 things:

- the bucket size. A bucket can take 8, 16, 32 or 64 bits of memory. 32 bits buckets is the default.
- the precision of the histogram (i.e. the number of significant value digits). You can have up to 5 value digits, 3 value digits (default) should be enough for most use cases.
- the allowed range of values. You can tunned this range with constructor/builder parameters _lowestDiscernibleValue_ and _highestTrackableValue_. If you are not sure of these values, the best option is to use flag _autoResize_, set to true by default.

While tunning memory footprint, _estimatedFootprintInBytes_ histogram property can get quite useful since it gives you a clear indicator of the memory cost:

```ts
const histogram = hdr.build();
console.log(histogram.estimatedFootprintInBytes);
```

If in your context saving memory is more important than saving CPU cycles, 'packed' bucket size is highly recommended. Available since HdrHistogramJS v1.2.0, this mode enables a very effective memory compression algorithm:

```ts
const histogram = hdr.build({ bitBucketSize: "packed" });
console.log(histogram.estimatedFootprintInBytes);
```

Last but not least, unless you are targetting very old browsers or a very old NodeJS version, you should turn on WebAssembly mode. Available since HdrHistogramJS v2.0.0, this mode is often twice as fast as regular JS mode. Also all bucket size options are available with WebAssembly, including 'packed':

```ts
const histogram = hdr.build({ bitBucketSize: "packed", useWebAssembly: true });
console.log(histogram.estimatedFootprintInBytes);
```

# Tree Shaking

The above examples use a convenient 'barrel' index file. Using this barrel, you cannot leverage on the tree shaking features of your favorite bundler. Hence the size of your JavaScript bundle may increase significantly. If you need to optimize the size of your bundle, you can import HdrHistogram modules as shown in code fragment below:

```ts
import Int32Histogram from "hdr-histogram-js/dist/Int32Histogram"

const histogram = new Int32Histogram(1, 2, 3);
histogram.autoResize = true;

histogram.recordValue(...);

```

# Migrating from v1 to v2

For most users, migration from HdrHistogramJS v1 to v2 should be smooth. However since HdrHistogramJS v2 does not stick anymore with HdrHistogram Java API, you might run into some breaking changes.  
Prior to v2, _hdr.build()_ was returning an _AbstractHistogram_ instance. _AbstractHistogram_ does not exist anymore and has been replaced by the _Histogram_ interface. Most methods from _AbstractHistogram_ still exist in new interface _Histogram_, however in order to have a more JS idiomatic API, getter methods such as _getMean()_ or _getTotalCount()_ have been replaced by JS properties:

```ts
// HdrHistogramJS v1
const histogram: AbstractHistogram = hdr.build();
const statistics = {
  count: histogram.getTotalCount(),
  mean: histogram.getMean(),
  p99: histogram.getValueAtPercentile(99),
}

// becomes with HdrHistogramJS v2
const histogram: Histogram = hdr.build();
const statistics = {
  count: histogram.totalCount,
  mean: histogram.mean,
  p99: histogram.getValueAtPercentile(99),
}
```

Module paths also change a little bit with v2. Hence if you were importing specific modules as described in the tree shaking section, you need to change a little bit your code as below:

```ts
// HdrHistogramJS v1
import AbstractHistogram from "hdr-histogram-js/AbstractHistogram"
import Int32Histogram from "hdr-histogram-js/Int32Histogram"

// becomes with HdrHistogramJS v2
import Histogram from "hdr-histogram-js/dist/Histogram"
import Int32Histogram from "hdr-histogram-js/dist/Int32Histogram"
```

# Design & Limitations

The code is almost a direct port of the Java version.
Optimisation based on inheritance to avoid false sharing
might not be relevant in JS, but I believe that keeping
the same code structure might be handy to keep the code up to date
with the Java version in the future.

Main limitations comes from number support in JavaScript.
There is no such thing as 64b integers in JavaScript. Everything is "number",
and a number is safe as an integer up to 2^53.  
The most annoying issue encountered during the code migration,
is that bit operations, heavily used within original HdrHistogram,
only work on the first 32 bits. That means that the following JavaScript expression is evaluated as true:

```ts
Math.pow(2, 31) << 1 === 0   // sad but true
```

Anyway bit shift operations are not really optimized
in most browser, so... everything related to bits have been
converted to good old arithmetic expressions in the process
of converting the Java code to TypeScript.  
With WebAssembly and AssemblyScript things are different. HdrHistogramsJS AssemblyScript source code is closer to the original Java code since all the limitations mentioned above does not apply to WebAssembly :)
