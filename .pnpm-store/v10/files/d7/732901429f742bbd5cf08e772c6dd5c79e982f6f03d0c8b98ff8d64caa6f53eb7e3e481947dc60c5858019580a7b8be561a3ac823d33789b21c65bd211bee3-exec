#! /usr/bin/env node

'use strict'

const crossArgv = require('cross-argv')
const fs = require('fs')
const os = require('os')
const net = require('net')
const path = require('path')
const URL = require('url').URL
const spawn = require('child_process').spawn
const managePath = require('manage-path')
const hasAsyncHooks = require('has-async-hooks')
const subarg = require('@minimistjs/subarg')
const printResult = require('./lib/printResult')
const initJob = require('./lib/init')
const track = require('./lib/progressTracker')
const generateSubArgAliases = require('./lib/subargAliases')
const { checkURL, ofURL } = require('./lib/url')
const { parseHAR } = require('./lib/parseHAR')
const _aggregateResult = require('./lib/aggregateResult')
const validateOpts = require('./lib/validate')

if (typeof URL !== 'function') {
  console.error('autocannon requires the WHATWG URL API, but it is not available. Please upgrade to Node 6.13+.')
  process.exit(1)
}

module.exports = initJob
module.exports.track = track

module.exports.start = start
module.exports.printResult = printResult
module.exports.parseArguments = parseArguments
module.exports.aggregateResult = function aggregateResult (results, opts = {}) {
  if (!Array.isArray(results)) {
    throw new Error('"results" must be an array of results')
  }

  opts = validateOpts(opts, false)

  if (opts instanceof Error) {
    throw opts
  }

  return _aggregateResult(results, opts)
}
const alias = {
  connections: 'c',
  pipelining: 'p',
  timeout: 't',
  duration: 'd',
  sampleInt: 'L',
  amount: 'a',
  json: 'j',
  renderLatencyTable: ['l', 'latency'],
  onPort: 'on-port',
  method: 'm',
  headers: ['H', 'header'],
  body: 'b',
  form: 'F',
  servername: 's',
  bailout: 'B',
  input: 'i',
  maxConnectionRequests: 'M',
  maxOverallRequests: 'O',
  connectionRate: 'r',
  overallRate: 'R',
  ignoreCoordinatedOmission: 'C',
  reconnectRate: 'D',
  renderProgressBar: 'progress',
  renderStatusCodes: 'statusCodes',
  title: 'T',
  verbose: 'V',
  version: 'v',
  forever: 'f',
  idReplacement: 'I',
  socketPath: 'S',
  excludeErrorStats: 'x',
  expectBody: 'E',
  workers: 'w',
  warmup: 'W',
  help: 'h'
}

const defaults = {
  connections: 10,
  timeout: 10,
  pipelining: 1,
  duration: 10,
  sampleInt: 1000,
  reconnectRate: 0,
  renderLatencyTable: false,
  renderProgressBar: true,
  renderStatusCodes: false,
  json: false,
  forever: false,
  method: 'GET',
  idReplacement: false,
  excludeErrorStats: false,
  debug: false,
  workers: 0,
  verbose: true
}

function parseArguments (argvs) {
  let argv = subarg(argvs, {
    boolean: ['json', 'n', 'help', 'renderLatencyTable', 'renderProgressBar', 'renderStatusCodes', 'forever', 'idReplacement', 'excludeErrorStats', 'onPort', 'debug', 'ignoreCoordinatedOmission', 'verbose'],
    alias,
    default: defaults,
    '--': true
  })
  // subarg does not convert aliases in sub arguments
  argv = generateSubArgAliases(argv)

  argv.url = argv._.length > 1 ? argv._ : argv._[0]

  // Assume onPort if `-- node` is provided
  if (argv['--'][0] === 'node') {
    argv.onPort = true
  }

  if (argv.onPort) {
    argv.spawn = argv['--']
  }

  // support -n to disable the progress bar and results table
  if (argv.n) {
    argv.renderProgressBar = false
    argv.renderResultsTable = false
    argv.renderStatusCodes = false
  }

  if (argv.version) {
    console.log('autocannon', 'v' + require('./package').version)
    console.log('node', process.version)
    return
  }

  if (!checkURL(argv.url) || argv.help) {
    const help = fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8')
    console.error(help)
    return
  }

  // if PORT is set (like by `0x`), target `localhost:PORT/path` by default.
  // this allows doing:
  //     0x --on-port 'autocannon /path' -- node server.js
  if (process.env.PORT) {
    argv.url = ofURL(argv.url).map(url => new URL(url, `http://localhost:${process.env.PORT}`).href)
  }
  // Add http:// if it's not there and this is not a /path
  argv.url = ofURL(argv.url).map(url => {
    if (url.indexOf('http') !== 0 && url[0] !== '/') {
      url = `http://${url}`
    }
    return url
  })

  // check that the URL is valid.
  ofURL(argv.url).map(url => {
    try {
      // If --on-port is given, it's acceptable to not have a hostname
      if (argv.onPort) {
        new URL(url, 'http://localhost') // eslint-disable-line no-new
      } else {
        new URL(url) // eslint-disable-line no-new
      }
    } catch (err) {
      console.error(err.message)
      console.error('')
      console.error('When targeting a path without a hostname, the PORT environment variable must be available.')
      console.error('Use a full URL or set the PORT variable.')
      process.exit(1)
    }

    return null // to make linter happy
  })

  if (argv.input) {
    argv.body = fs.readFileSync(argv.input, 'utf8')
  }

  if (argv.headers) {
    if (!Array.isArray(argv.headers)) {
      argv.headers = [argv.headers]
    }

    argv.headers = argv.headers.reduce((obj, header) => {
      const colonIndex = header.indexOf(':')
      const equalIndex = header.indexOf('=')
      const index = Math.min(colonIndex < 0 ? Infinity : colonIndex, equalIndex < 0 ? Infinity : equalIndex)
      if (Number.isFinite(index) && index > 0) {
        obj[header.slice(0, index)] = header.slice(index + 1)
        return obj
      } else throw new Error(`An HTTP header was not correctly formatted: ${header}`)
    }, {})
  }

  if (argv.har) {
    try {
      argv.har = JSON.parse(fs.readFileSync(argv.har))
      // warn users about skipped HAR requests
      const requestsByOrigin = parseHAR(argv.har)
      const allowed = ofURL(argv.url, true).map(url => new URL(url).origin)
      for (const [origin] of requestsByOrigin) {
        if (!allowed.includes(origin)) {
          console.error(`Warning: skipping requests to '${origin}' as the target is ${allowed.join(', ')}`)
        }
      }
    } catch (err) {
      throw new Error(`Failed to load HAR file content: ${err.message}`)
    }
  }

  argv.tlsOptions = {}

  if (argv.cert) {
    try {
      argv.tlsOptions.cert = fs.readFileSync(argv.cert)
    } catch (err) {
      throw new Error(`Failed to load cert file: ${err.message}`)
    }
  }

  if (argv.key) {
    try {
      argv.tlsOptions.key = fs.readFileSync(argv.key)
    } catch (err) {
      throw new Error(`Failed to load key file: ${err.message}`)
    }
  }

  if (argv.ca) {
    if (typeof argv.ca === 'string') {
      argv.ca = [argv.ca]
    } else if (Array.isArray(argv.ca._)) {
      argv.ca = argv.ca._
    }

    try {
      argv.tlsOptions.ca = argv.ca.map(caPath => fs.readFileSync(caPath))
    } catch (err) {
      throw new Error(`Failed to load ca file: ${err.message}`)
    }
  }

  // This is to distinguish down the line whether it is
  // run via command-line or programmatically
  argv[Symbol.for('internal')] = true

  return argv
}

function start (argv) {
  if (!argv) {
    // we are printing the help
    return
  }

  if (argv.onPort) {
    if (!hasAsyncHooks()) {
      console.error('The --on-port flag requires the async_hooks builtin module, but it is not available. Please upgrade to Node 8.1+.')
      process.exit(1)
    }

    const { socketPath, server } = createChannel((port) => {
      const url = new URL(argv.url, `http://localhost:${port}`).href
      const opts = Object.assign({}, argv, {
        onPort: false,
        url
      })
      const tracker = initJob(opts, () => {
        proc.kill('SIGINT')
        server.close()
      })

      process.once('SIGINT', () => {
        tracker.stop()
      })
    })

    // manage-path always uses the $PATH variable, but we can pretend
    // that it is equal to $NODE_PATH
    const alterPath = managePath({ PATH: process.env.NODE_PATH })
    alterPath.unshift(path.join(__dirname, 'lib/preload'))

    const proc = spawn(argv.spawn[0], argv.spawn.slice(1), {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: Object.assign({}, process.env, {
        NODE_OPTIONS: ['-r', 'autocannonDetectPort'].join(' ') +
          (process.env.NODE_OPTIONS ? ` ${process.env.NODE_OPTIONS}` : ''),
        NODE_PATH: alterPath.get(),
        AUTOCANNON_SOCKET: socketPath
      })
    })
  } else {
    // if forever is true then a promise is not returned and we need to try ... catch errors
    try {
      const tracker = initJob(argv)
      if (tracker.then) {
        tracker.catch((err) => {
          console.error(err.message)
        })
      }
    } catch (err) {
      console.error(err.message)
    }
  }
}

function createChannel (onport) {
  const pipeName = `${process.pid}.autocannon`
  const socketPath = process.platform === 'win32'
    ? `\\\\?\\pipe\\${pipeName}`
    : path.join(os.tmpdir(), pipeName)
  const server = net.createServer((socket) => {
    socket.once('data', (chunk) => {
      const port = chunk.toString()
      onport(port)
    })
  })
  server.listen(socketPath)
  server.on('close', () => {
    try {
      fs.unlinkSync(socketPath)
    } catch (err) {}
  })

  return { socketPath, server }
}

if (require.main === module) {
  const argv = crossArgv(process.argv.slice(2))
  start(parseArguments(argv))
}
