'use strict'
const Url = require('url')
const http = require('http')
const https = require('https')
const zlib = require('minizlib')
const Minipass = require('minipass')

const Body = require('./body.js')
const { writeToStream, getTotalBytes } = Body
const Response = require('./response.js')
const Headers = require('./headers.js')
const { createHeadersLenient } = Headers
const Request = require('./request.js')
const { getNodeRequestOptions } = Request
const FetchError = require('./fetch-error.js')
const AbortError = require('./abort-error.js')

const resolveUrl = Url.resolve

const fetch = (url, opts) => {
  if (/^data:/.test(url)) {
    const request = new Request(url, opts)
    try {
      const split = url.split(',')
      const data = Buffer.from(split[1], 'base64')
      const type = split[0].match(/^data:(.*);base64$/)[1]
      return Promise.resolve(new Response(data, {
        headers: {
          'Content-Type': type,
          'Content-Length': data.length,
        }
      }))
    } catch (er) {
      return Promise.reject(new FetchError(`[${request.method}] ${
        request.url} invalid URL, ${er.message}`, 'system', er))
    }
  }

  return new Promise((resolve, reject) => {
    // build request object
    const request = new Request(url, opts)
    let options
    try {
      options = getNodeRequestOptions(request)
    } catch (er) {
      return reject(er)
    }

    const send = (options.protocol === 'https:' ? https : http).request
    const { signal } = request
    let response = null
    const abort = () => {
      const error = new AbortError('The user aborted a request.')
      reject(error)
      if (Minipass.isStream(request.body) &&
          typeof request.body.destroy === 'function') {
        request.body.destroy(error)
      }
      if (response && response.body) {
        response.body.emit('error', error)
      }
    }

    if (signal && signal.aborted)
      return abort()

    const abortAndFinalize = () => {
      abort()
      finalize()
    }

    const finalize = () => {
      req.abort()
      if (signal)
        signal.removeEventListener('abort', abortAndFinalize)
      clearTimeout(reqTimeout)
    }

    // send request
    const req = send(options)

    if (signal)
      signal.addEventListener('abort', abortAndFinalize)

    let reqTimeout = null
    if (request.timeout) {
      req.once('socket', socket => {
        reqTimeout = setTimeout(() => {
          reject(new FetchError(`network timeout at: ${
            request.url}`, 'request-timeout'))
          finalize()
        }, request.timeout)
      })
    }

    req.on('error', er => {
      // if a 'response' event is emitted before the 'error' event, then by the
      // time this handler is run it's too late to reject the Promise for the
      // response. instead, we forward the error event to the response stream
      // so that the error will surface to the user when they try to consume
      // the body. this is done as a side effect of aborting the request except
      // for in windows, where we must forward the event manually, otherwise
      // there is no longer a ref'd socket attached to the request and the
      // stream never ends so the event loop runs out of work and the process
      // exits without warning.
      // coverage skipped here due to the difficulty in testing
      // istanbul ignore next
      if (req.res)
        req.res.emit('error', er)
      reject(new FetchError(`request to ${request.url} failed, reason: ${
        er.message}`, 'system', er))
      finalize()
    })

    req.on('response', res => {
      clearTimeout(reqTimeout)

      const headers = createHeadersLenient(res.headers)

      // HTTP fetch step 5
      if (fetch.isRedirect(res.statusCode)) {
        // HTTP fetch step 5.2
        const location = headers.get('Location')

        // HTTP fetch step 5.3
        const locationURL = location === null ? null
          : resolveUrl(request.url, location)

        // HTTP fetch step 5.5
        switch (request.redirect) {
          case 'error':
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${
              request.url}`, 'no-redirect'))
            finalize()
            return

          case 'manual':
            // node-fetch-specific step: make manual redirect a bit easier to
            // use by setting the Location header value to the resolved URL.
            if (locationURL !== null) {
              // handle corrupted header
              try {
                headers.set('Location', locationURL)
              } catch (err) {
                /* istanbul ignore next: nodejs server prevent invalid
                   response headers, we can't test this through normal
                   request */
                reject(err)
              }
            }
            break

          case 'follow':
            // HTTP-redirect fetch step 2
            if (locationURL === null) {
              break
            }

            // HTTP-redirect fetch step 5
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${
                request.url}`, 'max-redirect'))
              finalize()
              return
            }

            // HTTP-redirect fetch step 9
            if (res.statusCode !== 303 &&
                request.body &&
                getTotalBytes(request) === null) {
              reject(new FetchError(
                'Cannot follow redirect with body being a readable stream',
                'unsupported-redirect'
              ))
              finalize()
              return
            }

            // Update host due to redirection
            request.headers.set('host', Url.parse(locationURL).host)

            // HTTP-redirect fetch step 6 (counter increment)
            // Create a new Request object.
            const requestOpts = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              timeout: request.timeout,
            }

            // HTTP-redirect fetch step 11
            if (res.statusCode === 303 || (
                (res.statusCode === 301 || res.statusCode === 302) &&
                request.method === 'POST'
            )) {
              requestOpts.method = 'GET'
              requestOpts.body = undefined
              requestOpts.headers.delete('content-length')
            }

            // HTTP-redirect fetch step 15
            resolve(fetch(new Request(locationURL, requestOpts)))
            finalize()
            return
        }
      } // end if(isRedirect)


      // prepare response
      res.once('end', () =>
        signal && signal.removeEventListener('abort', abortAndFinalize))

      const body = new Minipass()
      // exceedingly rare that the stream would have an error,
      // but just in case we proxy it to the stream in use.
      res.on('error', /* istanbul ignore next */ er => body.emit('error', er))
      res.on('data', (chunk) => body.write(chunk))
      res.on('end', () => body.end())

      const responseOptions = {
        url: request.url,
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: headers,
        size: request.size,
        timeout: request.timeout,
        counter: request.counter,
        trailer: new Promise(resolve =>
          res.on('end', () => resolve(createHeadersLenient(res.trailers))))
      }

      // HTTP-network fetch step 12.1.1.3
      const codings = headers.get('Content-Encoding')

      // HTTP-network fetch step 12.1.1.4: handle content codings

      // in following scenarios we ignore compression support
      // 1. compression support is disabled
      // 2. HEAD request
      // 3. no Content-Encoding header
      // 4. no content response (204)
      // 5. content not modified response (304)
      if (!request.compress ||
          request.method === 'HEAD' ||
          codings === null ||
          res.statusCode === 204 ||
          res.statusCode === 304) {
        response = new Response(body, responseOptions)
        resolve(response)
        return
      }


      // Be less strict when decoding compressed responses, since sometimes
      // servers send slightly invalid responses that are still accepted
      // by common browsers.
      // Always using Z_SYNC_FLUSH is what cURL does.
      const zlibOptions = {
        flush: zlib.constants.Z_SYNC_FLUSH,
        finishFlush: zlib.constants.Z_SYNC_FLUSH,
      }

      // for gzip
      if (codings == 'gzip' || codings == 'x-gzip') {
        const unzip = new zlib.Gunzip(zlibOptions)
        response = new Response(
          // exceedingly rare that the stream would have an error,
          // but just in case we proxy it to the stream in use.
          body.on('error', /* istanbul ignore next */ er => unzip.emit('error', er)).pipe(unzip),
          responseOptions
        )
        resolve(response)
        return
      }

      // for deflate
      if (codings == 'deflate' || codings == 'x-deflate') {
        // handle the infamous raw deflate response from old servers
        // a hack for old IIS and Apache servers
        const raw = res.pipe(new Minipass())
        raw.once('data', chunk => {
          // see http://stackoverflow.com/questions/37519828
          const decoder = (chunk[0] & 0x0F) === 0x08
            ? new zlib.Inflate()
            : new zlib.InflateRaw()
          // exceedingly rare that the stream would have an error,
          // but just in case we proxy it to the stream in use.
          body.on('error', /* istanbul ignore next */ er => decoder.emit('error', er)).pipe(decoder)
          response = new Response(decoder, responseOptions)
          resolve(response)
        })
        return
      }


      // for br
      if (codings == 'br') {
        // ignoring coverage so tests don't have to fake support (or lack of) for brotli
        // istanbul ignore next
        try {
          var decoder = new zlib.BrotliDecompress()
        } catch (err) {
          reject(err)
          finalize()
          return
        }
        // exceedingly rare that the stream would have an error,
        // but just in case we proxy it to the stream in use.
        body.on('error', /* istanbul ignore next */ er => decoder.emit('error', er)).pipe(decoder)
        response = new Response(decoder, responseOptions)
        resolve(response)
        return
      }

      // otherwise, use response as-is
      response = new Response(body, responseOptions)
      resolve(response)
    })

    writeToStream(req, request)
  })
}

module.exports = fetch

fetch.isRedirect = code =>
  code === 301 ||
  code === 302 ||
  code === 303 ||
  code === 307 ||
  code === 308

fetch.Headers = Headers
fetch.Request = Request
fetch.Response = Response
fetch.FetchError = FetchError
