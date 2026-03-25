const Minipass = require('minipass')
const MinipassPipeline = require('minipass-pipeline')
const fetch = require('minipass-fetch')
const promiseRetry = require('promise-retry')
const ssri = require('ssri')

const getAgent = require('./agent.js')
const pkg = require('../package.json')

const USER_AGENT = `${pkg.name}/${pkg.version} (+https://npm.im/${pkg.name})`

const RETRY_ERRORS = [
  'ECONNRESET', // remote socket closed on us
  'ECONNREFUSED', // remote host refused to open connection
  'EADDRINUSE', // failed to bind to a local port (proxy?)
  'ETIMEDOUT', // someone in the transaction is WAY TOO SLOW
  'ERR_SOCKET_TIMEOUT', // same as above, but this one comes from agentkeepalive
  // Known codes we do NOT retry on:
  // ENOTFOUND (getaddrinfo failure. Either bad hostname, or offline)
]

const RETRY_TYPES = [
  'request-timeout',
]

// make a request directly to the remote source,
// retrying certain classes of errors as well as
// following redirects (through the cache if necessary)
// and verifying response integrity
const remoteFetch = (request, options) => {
  const agent = getAgent(request.url, options)
  if (!request.headers.has('connection'))
    request.headers.set('connection', agent ? 'keep-alive' : 'close')

  if (!request.headers.has('user-agent'))
    request.headers.set('user-agent', USER_AGENT)

  // keep our own options since we're overriding the agent
  // and the redirect mode
  const _opts = {
    ...options,
    agent,
    redirect: 'manual',
  }

  return promiseRetry(async (retryHandler, attemptNum) => {
    const req = new fetch.Request(request, _opts)
    try {
      let res = await fetch(req, _opts)
      if (_opts.integrity && res.status === 200) {
        // we got a 200 response and the user has specified an expected
        // integrity value, so wrap the response in an ssri stream to verify it
        const integrityStream = ssri.integrityStream({ integrity: _opts.integrity })
        res = new fetch.Response(new MinipassPipeline(res.body, integrityStream), res)
      }

      res.headers.set('x-fetch-attempts', attemptNum)

      // do not retry POST requests, or requests with a streaming body
      // do retry requests with a 408, 420, 429 or 500+ status in the response
      const isStream = Minipass.isStream(req.body)
      const isRetriable = req.method !== 'POST' &&
          !isStream &&
          ([408, 420, 429].includes(res.status) || res.status >= 500)

      if (isRetriable) {
        if (typeof options.onRetry === 'function')
          options.onRetry(res)

        return retryHandler(res)
      }

      return res
    } catch (err) {
      const code = (err.code === 'EPROMISERETRY')
        ? err.retried.code
        : err.code

      // err.retried will be the thing that was thrown from above
      // if it's a response, we just got a bad status code and we
      // can re-throw to allow the retry
      const isRetryError = err.retried instanceof fetch.Response ||
        (RETRY_ERRORS.includes(code) && RETRY_TYPES.includes(err.type))

      if (req.method === 'POST' || isRetryError)
        throw err

      if (typeof options.onRetry === 'function')
        options.onRetry(err)

      return retryHandler(err)
    }
  }, options.retry).catch((err) => {
    // don't reject for http errors, just return them
    if (err.status >= 400 && err.type !== 'system')
      return err

    throw err
  })
}

module.exports = remoteFetch
