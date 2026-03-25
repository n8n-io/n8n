'use strict'

const Table = require('cli-table3')
const Chalk = require('chalk')
const testColorSupport = require('color-support')
const prettyBytes = require('pretty-bytes')
const { percentiles } = require('./histUtil')
const format = require('./format')

const defaults = {
  // use stderr as its progressBar's default
  outputStream: process.stderr,
  renderResultsTable: true,
  renderLatencyTable: false,
  verbose: true
}

class TableWithoutColor extends Table {
  constructor (opts = {}) {
    super({ ...opts, style: { head: [], border: [] } })
  }
}

const printResult = (result, opts) => {
  opts = Object.assign({}, defaults, opts)
  let strResult = ''

  if (opts.verbose) {
    const chalk = new Chalk.Instance(testColorSupport({ stream: opts.outputStream, alwaysReturn: true }))
    const ColorSafeTable = chalk.level === 0 ? TableWithoutColor : Table

    const shortLatency = new ColorSafeTable({
      head: asColor(chalk.cyan, ['Stat', '2.5%', '50%', '97.5%', '99%', 'Avg', 'Stdev', 'Max'])
    })
    shortLatency.push(asLowRow(chalk.bold('Latency'), asMs(result.latency)))
    logToLocalStr('\n' + shortLatency.toString())

    const requests = new ColorSafeTable({
      head: asColor(chalk.cyan, ['Stat', '1%', '2.5%', '50%', '97.5%', 'Avg', 'Stdev', 'Min'])
    })

    requests.push(asHighRow(chalk.bold('Req/Sec'), asNumber(result.requests)))
    requests.push(asHighRow(chalk.bold('Bytes/Sec'), asBytes(result.throughput)))
    logToLocalStr(requests.toString())

    if (opts.renderStatusCodes === true) {
      const statusCodeStats = new ColorSafeTable({
        head: asColor(chalk.cyan, ['Code', 'Count'])
      })
      Object.keys(result.statusCodeStats).forEach(statusCode => {
        const stats = result.statusCodeStats[statusCode]
        const colorize = colorizeByStatusCode(chalk, statusCode)
        statusCodeStats.push([colorize(statusCode), stats.count])
      })
      logToLocalStr(statusCodeStats.toString())
    }
    logToLocalStr('')
    if (result.sampleInt === 1000) {
      logToLocalStr('Req/Bytes counts sampled once per second.')
    } else {
      logToLocalStr('Req/Bytes counts sampled every ' + result.sampleInt / 1000 + ' seconds.')
    }
    logToLocalStr('# of samples: ' + result.samples)
    logToLocalStr('')

    if (opts.renderLatencyTable) {
      const latencies = new ColorSafeTable({
        head: asColor(chalk.cyan, ['Percentile', 'Latency (ms)'])
      })
      percentiles.map((perc) => {
        const key = `p${perc}`.replace('.', '_')
        return [
          chalk.bold('' + perc),
          result.latency[key]
        ]
      }).forEach(row => {
        latencies.push(row)
      })
      logToLocalStr(latencies.toString())
      logToLocalStr('')
    }
  }

  if (result.non2xx) {
    logToLocalStr(`${result['2xx']} 2xx responses, ${result.non2xx} non 2xx responses`)
  }
  logToLocalStr(`${format(result.requests.sent)} requests in ${result.duration}s, ${prettyBytes(result.throughput.total)} read`)
  if (result.errors) {
    logToLocalStr(`${format(result.errors)} errors (${format(result.timeouts)} timeouts)`)
  }
  if (result.mismatches) {
    logToLocalStr(`${format(result.mismatches)} requests with mismatched body`)
  }
  if (result.resets) {
    logToLocalStr(`request pipeline was reset ${format(result.resets)} ${result.resets === 1 ? 'time' : 'times'}`)
  }

  function logToLocalStr (msg) {
    strResult += msg + '\n'
  }

  return strResult
}

// create a table row for stats where low values is better
function asLowRow (name, stat) {
  return [
    name,
    stat.p2_5,
    stat.p50,
    stat.p97_5,
    stat.p99,
    stat.average,
    stat.stddev,
    typeof stat.max === 'string' ? stat.max : Math.floor(stat.max * 100) / 100
  ]
}

// create a table row for stats where high values is better
function asHighRow (name, stat) {
  return [
    name,
    stat.p1,
    stat.p2_5,
    stat.p50,
    stat.p97_5,
    stat.average,
    stat.stddev,
    typeof stat.min === 'string' ? stat.min : Math.floor(stat.min * 100) / 100
  ]
}

function asColor (colorise, row) {
  return row.map((entry) => colorise(entry))
}

function asMs (stat) {
  const result = Object.create(null)
  for (const k of Object.keys(stat)) {
    result[k] = `${stat[k]} ms`
  }
  result.max = typeof stat.max === 'string' ? stat.max : `${Math.floor(stat.max * 100) / 100} ms`

  return result
}

function asNumber (stat) {
  const result = Object.create(null)
  for (const k of Object.keys(stat)) {
    result[k] = stat[k].toLocaleString(undefined, {
      // to show all digits
      maximumFractionDigits: 20
    })
  }

  return result
}

function asBytes (stat) {
  const result = Object.create(stat)

  for (const p of percentiles) {
    const key = `p${p}`.replace('.', '_')
    result[key] = prettyBytes(stat[key])
  }

  result.average = prettyBytes(stat.average)
  result.stddev = prettyBytes(stat.stddev)
  result.max = prettyBytes(stat.max)
  result.min = prettyBytes(stat.min)
  return result
}

function colorizeByStatusCode (chalk, statusCode) {
  const codeClass = Math.floor(parseInt(statusCode) / 100) - 1
  return [chalk.cyan, chalk.cyan, chalk.cyan, chalk.redBright, chalk.redBright][codeClass]
}

module.exports = printResult
