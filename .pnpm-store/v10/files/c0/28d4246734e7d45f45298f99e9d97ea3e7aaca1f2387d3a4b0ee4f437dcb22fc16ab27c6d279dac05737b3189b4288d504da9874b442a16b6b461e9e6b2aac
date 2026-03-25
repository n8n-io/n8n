'use strict'

const { decodeHist, getHistograms, histAsObj, addPercentiles } = require('./histUtil')

function aggregateResult (results, opts, histograms) {
  results = Array.isArray(results) ? results : [results]
  histograms = getHistograms(histograms)

  const aggregated = results.map(r => ({
    ...r,
    latencies: decodeHist(r.latencies),
    requests: decodeHist(r.requests),
    throughput: decodeHist(r.throughput)
  })).reduce((acc, r) => {
    acc.latencies.add(r.latencies)

    acc.totalCompletedRequests += r.totalCompletedRequests
    acc.totalRequests += r.totalRequests
    acc.totalBytes += r.totalBytes
    acc.samples += r.samples

    acc.errors += r.errors
    acc.timeouts += r.timeouts
    acc.mismatches += r.mismatches
    acc.non2xx += r.non2xx
    acc.resets += r.resets
    acc['1xx'] += r['1xx']
    acc['2xx'] += r['2xx']
    acc['3xx'] += r['3xx']
    acc['4xx'] += r['4xx']
    acc['5xx'] += r['5xx']

    Object.keys(r.statusCodeStats).forEach(statusCode => {
      if (!acc.statusCodeStats[statusCode]) {
        acc.statusCodeStats[statusCode] = r.statusCodeStats[statusCode]
      } else {
        acc.statusCodeStats[statusCode].count += r.statusCodeStats[statusCode].count
      }
    })

    return acc
  })

  const result = {
    title: opts.title,
    url: opts.url,
    socketPath: opts.socketPath,
    connections: opts.connections,
    sampleInt: opts.sampleInt,
    pipelining: opts.pipelining,
    workers: opts.workers,

    duration: aggregated.duration,
    samples: aggregated.samples,
    start: aggregated.start,
    finish: aggregated.finish,
    errors: aggregated.errors,
    timeouts: aggregated.timeouts,
    mismatches: aggregated.mismatches,
    non2xx: aggregated.non2xx,
    resets: aggregated.resets,
    '1xx': aggregated['1xx'],
    '2xx': aggregated['2xx'],
    '3xx': aggregated['3xx'],
    '4xx': aggregated['4xx'],
    '5xx': aggregated['5xx'],
    statusCodeStats: aggregated.statusCodeStats,

    latency: addPercentiles(aggregated.latencies, histAsObj(aggregated.latencies)),
    requests: addPercentiles(histograms.requests, histAsObj(histograms.requests, aggregated.totalCompletedRequests)),
    throughput: addPercentiles(histograms.throughput, histAsObj(histograms.throughput, aggregated.totalBytes))
  }

  result.latency.totalCount = aggregated.latencies.totalCount
  result.requests.sent = aggregated.totalRequests

  if (result.requests.min >= Number.MAX_SAFE_INTEGER) result.requests.min = 0
  if (result.throughput.min >= Number.MAX_SAFE_INTEGER) result.throughput.min = 0
  if (result.latency.min >= Number.MAX_SAFE_INTEGER) result.latency.min = 0

  return result
}

module.exports = aggregateResult
