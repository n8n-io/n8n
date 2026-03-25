tdigest
============
[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url] [![NPM download][download-image]][npm-url]

Javascript implementation of Dunning's T-Digest for streaming quantile approximation

The T-Digest is a data structure and algorithm for constructing an
approximate distribution for a collection of real numbers presented as a
stream. The algorithm makes no guarantees, but behaves well enough in
practice that implementations have been included in Apache Mahout and
ElasticSearch for computing summaries and approximate order
statistics over a stream.

For an overview of T-Digest's behavior, see Davidson-Pilon's
[blog post](http://dataorigami.net/blogs/napkin-folding/19055451-percentile-and-quantile-estimation-of-big-data-the-t-digest) regarding a python implementation. For more details,
there are the [tdigest paper](https://github.com/tdunning/t-digest/blob/master/docs/t-digest-paper/histo.pdf) and [reference implementation](https://github.com/tdunning/t-digest) (Java).
This javascript implementation is based on a reading of the paper,
with some boundary and performance tweaks.

**changes in 0.1.2:**

Updated the bintree dependency to 1.0.2 to pick up its licencing declaration

**changes in 0.1.1:**

1. percentile on an empty digest returns *undefined* or array of *undefined*
   instead of NaN

2. upgraded bintrees to get bugfix.

3. bugfix for discrete percentile and p_rank, make boundary conditions
   conform to standard definition.

**changes in 0.1.0:**

Discrete mode: when a TDigest is created with delta=false, the sample
distribution is treated as discrete. TDigest behavior is disabled,
differing samples are never merged (they needn't even be numeric), and
percentiles are reported as nearest exact data values rather than
interpolated.

Digest: distribution digest structure. Starts in exact histogram
(discrete) mode, remains in exact mode for reasonable numbers of
distinct values as sample size inreases, and automatically switches to
TDigest mode for large samples that appear to be from a continuous
distribution.

Renamed quantile() -> p_rank(), Percentile Rank.

percentile() and p_rank() now accept arrays or singleton arguments.

**changes in 0.0.7:**

A `grunt dist` task has been added to create a UMD-wrapped version of tdigest
and dependencies for importing as a standalone module in client-side javascript.

bugfixes and speed improvements.

**changes in 0.0.5:**

API Overhaul:
* asArray() -> toArray()
* redigest() -> compress()
* digest() -> push()
* pushing an array no longer triggers compression

bugfixes and speed improvements.

quickstart
------------

#### node.js:

```
npm install tdigest
```

```javascript
var TDigest = require('tdigest').TDigest;
var x=[], N = 100000;
for (var i = 0 ; i < N ; i += 1) {
    x.push(Math.random() * 10 - 5);
};
td = new TDigest();
td.push(x);
td.compress();
console.log(td.summary());
console.log("median ~ "+td.percentile(0.5));
```

See also [example.js](https://github.com/welch/tdigest/blob/master/example.js) in this package.

#### In the browser:

The `grunt dist` task has been configured to generate
a self-contained [UMD-wrapped](https://github.com/umdjs/umd) version of tdigest in dist/tdigest.js.

Embed it in HTML like this:
```
<script src="dist/tdigest.js"></script>
<script>
    var td = new this.tdigest.TDigest();
    for (var i=0; i < 1000000; i++) {
        td.push(Math.random());
    }
    td.compress();
    document.write(td.summary())
</script>
```

See also [example.html](https://github.com/welch/tdigest/blob/master/example.html) in this package.

dependencies
-------------
`bintrees`: [https://www.npmjs.com/package/bintrees](https://www.npmjs.com/package/bintrees)


[travis-image]: https://travis-ci.org/welch/tdigest.svg?branch=master
[travis-url]: https://travis-ci.org/welch/tdigest
[npm-image]: http://img.shields.io/npm/v/tdigest.svg
[download-image]: http://img.shields.io/npm/dm/tdigest.svg
[npm-url]: https://www.npmjs.org/package/tdigest
