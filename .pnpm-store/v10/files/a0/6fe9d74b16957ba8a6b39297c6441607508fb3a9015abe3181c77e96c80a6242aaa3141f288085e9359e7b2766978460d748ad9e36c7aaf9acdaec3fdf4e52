const hdr = require('hdr-histogram-js')
const histUtil = require('hdr-histogram-percentiles-obj')

hdr.initWebAssemblySync()

const getHistograms = ({
  latencies = hdr.build({
    useWebAssembly: true,
    bitBucketSize: 64,
    autoResize: true,
    lowestDiscernibleValue: 1,
    highestTrackableValue: 10000,
    numberOfSignificantValueDigits: 5
  }),
  requests = hdr.build({
    useWebAssembly: true,
    bitBucketSize: 64,
    autoResize: true,
    lowestDiscernibleValue: 1,
    highestTrackableValue: 1000000,
    numberOfSignificantValueDigits: 3
  }),
  throughput = hdr.build({
    useWebAssembly: true,
    bitBucketSize: 64,
    autoResize: true,
    lowestDiscernibleValue: 1,
    highestTrackableValue: 100000000000,
    numberOfSignificantValueDigits: 3
  })
} = {}) => ({
  latencies,
  requests,
  throughput
})

function encodeHist (h) {
  if (h.__custom) return null

  return hdr.encodeIntoCompressedBase64(h)
}

function decodeHist (str) {
  if (!str) return null

  return hdr.decodeFromCompressedBase64(str)
}

exports.getHistograms = getHistograms
exports.encodeHist = encodeHist
exports.decodeHist = decodeHist
exports.histAsObj = histUtil.histAsObj
exports.addPercentiles = histUtil.addPercentiles
exports.percentiles = histUtil.percentiles
