'use strict'

const percentiles = module.exports.percentiles = [
  0.001,
  0.01,
  0.1,
  1,
  2.5,
  10,
  25,
  50,
  75,
  90,
  97.5,
  99,
  99.9,
  99.99,
  99.999
]

module.exports.histAsObj = function (hist, total) {
  const mean = Math.ceil(getMean(hist) * 100) / 100
  const result = {
    average: mean, // added for backward compat with wrk
    mean: mean,
    stddev: Math.ceil(getStdDeviation(hist) * 100) / 100,
    min: getMin(hist),
    max: getMax(hist)
  }

  if (typeof total === 'number') {
    result.total = total
  }

  return result
}

module.exports.addPercentiles = function (hist, result) {
  percentiles.forEach(function (perc) {
    const key = ('p' + perc).replace('.', '_')
    if (typeof hist.percentile === 'function') {
      result[key] = hist.percentile(perc)
    } else if (typeof hist.getValueAtPercentile === 'function') {
      result[key] = hist.getValueAtPercentile(perc)
    }
  })

  return result
}

function getMean (hist) {
  if (typeof hist.mean === 'function') {
    return hist.mean()
  }
  if (typeof hist.getMean === 'function') {
    return hist.getMean()
  }
  return hist.mean
}

function getMin (hist) {
  if (typeof hist.min === 'function') {
    return hist.min()
  }
  return hist.minNonZeroValue
}

function getMax (hist) {
  if (typeof hist.max === 'function') {
    return hist.max()
  }
  return hist.maxValue
}

function getStdDeviation (hist) {
  if (typeof hist.stddev === 'function') {
    return hist.stddev()
  }
  if (typeof hist.getStdDeviation === 'function') {
    return hist.getStdDeviation()
  }
  return hist.stdDeviation
}
