# hdr-histogram-percentiles-obj

## Install

```
npm install --save hdr-histogram-percentiles-obj
```

## Usage

```js
const histPercentileObj = require('hdr-histogram-percentiles-obj')
const Histogram = require('hdr-histogram-js')

const histogram = hdr.build({
  lowestDiscernibleValue: 1,
  highestTrackableValue: 100
})
const total = 0
// record some histogram data...
// total++...

const result = histPercentileObj.histAsObj(histogram, total)
const resultWithPercentiles = histPercentileObj.addPercentiles(histogram, histPercentileObj.histAsObj(histogram, total))
histPercentileObj.percentiles.forEach((p) => {
  const key = `p${p}`.replace('.', '_')
  console.log(`${p}%`, resultWithPercentiles[key])
})
```

## API

hdr-histogram-percentiles-obj has two utility functions to use

### histAsObj(histogram, total)

* `histogram`: A hdr-histogram-js object you want to get some values from in a js object
* `total`: the total amount recorded by the histogram, optional

Returns a json object with the `min`, `max`, `average` (mean) and `stddev`

### addPercentiles(histogram, histAsObjResult)

* `histogram`: A hdr-histogram-js object you want to retrieve the percentiles from
* `histAsObjResult`: the result returned when `histAsObj` is called on some hdr-histogram-js object

Returns the histAsObjResult with the percentiles properties added. Percentile properties are named `pNN_DD`, for the `NN.DD%` percentile. Eg., the 99th percentile is `p99`, while the 99.99th percentile is `p99_99`.

### percentiles

An array listing the percentiles that hdr-histogram-percentiles-obj adds, as numbers.

## Sponsor

Kindly sponsored by [nearForm](www.nearform.com)

## License

[MIT](./LICENSE)
