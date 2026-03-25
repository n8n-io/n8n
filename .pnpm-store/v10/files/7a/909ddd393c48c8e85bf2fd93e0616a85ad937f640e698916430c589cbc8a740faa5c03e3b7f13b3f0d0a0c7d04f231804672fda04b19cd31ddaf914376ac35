'use strict'

const test = require('tap').test
const hdr = require('hdr-histogram-js')
const histPercentileObj = require('../')

test('should return a valid hist as object', (t) => {
  t.plan(24)
  const histogram = hdr.build({
    lowestDiscernibleValue: 1,
    highestTrackableValue: 100
  })
  let total = 0
  for (let i = 0; i < 10000; i++) {
    const num = Math.floor(Math.random() * 100)
    histogram.recordValue(num)
    total += num
  }

  // any of the numbers below _could_ be 0, so we do a type test instead of t.ok
  const result = histPercentileObj.histAsObj(histogram, total)
  t.ok(result)
  t.type(result.average, 'number')
  t.type(result.mean, 'number')
  t.type(result.stddev, 'number')
  t.type(result.min, 'number')
  t.type(result.max, 'number')
  t.type(result.total, 'number')

  const withPercentiles = histPercentileObj.addPercentiles(histogram, result)
  t.ok(withPercentiles)
  t.type(withPercentiles.average, 'number')
  t.type(withPercentiles.p0_001, 'number')
  t.type(withPercentiles.p0_01, 'number')
  t.type(withPercentiles.p0_1, 'number')
  t.type(withPercentiles.p1, 'number')
  t.type(withPercentiles.p2_5, 'number')
  t.type(withPercentiles.p10, 'number')
  t.type(withPercentiles.p25, 'number')
  t.type(withPercentiles.p50, 'number')
  t.type(withPercentiles.p75, 'number')
  t.type(withPercentiles.p90, 'number')
  t.type(withPercentiles.p97_5, 'number')
  t.type(withPercentiles.p99, 'number')
  t.type(withPercentiles.p99_9, 'number')
  t.type(withPercentiles.p99_99, 'number')
  t.type(withPercentiles.p99_999, 'number')
})

test('should return expected numbers', (t) => {
  t.plan(18)
  const histogram = hdr.build({
    lowestDiscernibleValue: 1,
    highestTrackableValue: 10
  })

  histogram.recordValue(4)
  histogram.recordValue(5)
  histogram.recordValue(6)

  // any of the numbers below _could_ be 0, so we do a type test instead of t.ok
  const result = histPercentileObj.histAsObj(histogram, 15)
  t.ok(result)
  t.equal(result.average, 5)
  t.equal(result.mean, 5)
  t.equal(result.stddev, 0.82)
  t.equal(result.min, 4)
  t.equal(result.max, 6)
  t.equal(result.total, 15)

  const withPercentiles = histPercentileObj.addPercentiles(histogram, result)
  t.ok(withPercentiles)
  t.equal(withPercentiles.average, 5)
  t.equal(withPercentiles.p2_5, 4)
  t.equal(withPercentiles.p50, 5)
  t.equal(withPercentiles.p75, 6)
  t.equal(withPercentiles.p90, 6)
  t.equal(withPercentiles.p97_5, 6)
  t.equal(withPercentiles.p99, 6)
  t.equal(withPercentiles.p99_9, 6)
  t.equal(withPercentiles.p99_99, 6)
  t.equal(withPercentiles.p99_999, 6)
})

test('should return a valid hist as object from a WASM histogram', (t) => {
  t.plan(1)
  hdr.initWebAssemblySync()
  const histogram = hdr.build({
    useWebAssembly: true
  })
  t.ok(histPercentileObj.histAsObj(histogram))
})
