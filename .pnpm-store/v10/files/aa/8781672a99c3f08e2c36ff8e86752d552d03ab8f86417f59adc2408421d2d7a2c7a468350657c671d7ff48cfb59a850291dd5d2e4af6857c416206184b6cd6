'use strict'

const methods = require('./httpMethods')
const { getPropertyCaseInsensitive } = require('./util')

// this is a build request factory, that curries the build request function
// and sets the default for it
function requestBuilder (defaults) {
  // these need to be defined per request builder creation, because of the way
  // headers don't get deep copied
  const builderDefaults = {
    method: 'GET',
    path: '/',
    headers: {},
    body: Buffer.alloc(0),
    hostname: 'localhost',
    setupRequest: reqData => reqData,
    port: 80
  }

  defaults = Object.assign(builderDefaults, defaults)

  // buildRequest takes an object, and turns it into a buffer representing the
  // http request.
  // second parameter is passed to setupRequest, when relevant
  // will return null if setupRequest returns falsey result
  return function buildRequest (reqData, context) {
    // below is a hack to enable deep extending of the headers so the default
    // headers object isn't overwritten by accident
    reqData = reqData || {}
    reqData.headers = Object.assign({}, defaults.headers, reqData.headers)

    reqData = Object.assign({}, defaults, reqData)

    reqData = reqData.setupRequest(reqData, context)
    if (!reqData) {
      return null
    }

    // for some reason some tests fail with method === undefined
    // the reqData.method should be set to SOMETHING in this case
    // cannot find reason for failure if `|| 'GET'` is taken out
    const method = reqData.method
    const path = reqData.path
    const headers = reqData.headers
    const body = reqData.body

    const headersDefinedHost = getPropertyCaseInsensitive(reqData.headers, 'host')
    let host = headersDefinedHost || reqData.host

    if (!host) {
      const hostname = reqData.hostname
      const port = reqData.port
      host = hostname + ':' + port
    }
    const baseReq = [
      `${method} ${path} HTTP/1.1`
    ]
    if (!headersDefinedHost) {
      baseReq.push(`Host: ${host}`)
    }
    baseReq.push('Connection: keep-alive')
    if (reqData.auth) {
      const encodedAuth = Buffer.from(reqData.auth).toString('base64')
      headers.Authorization = `Basic ${encodedAuth}`
    }

    if (methods.indexOf(method) < 0) {
      throw new Error(`${method} HTTP method is not supported`)
    }

    let bodyBuf

    if (typeof body === 'string') {
      bodyBuf = Buffer.from(body)
    } else if (typeof body === 'number') {
      bodyBuf = Buffer.from(body + '')
    } else if (Buffer.isBuffer(body)) {
      bodyBuf = body
    } else if (body && Array.isArray(body._)) {
      // when the request body passed on the CLI includes brackets like for
      // a JSON array, the subarg parser will oddly provide the contents as
      // `body._`. Work around this specific issue.
      bodyBuf = Buffer.from(`[${body._}]`)
    } else if (body) {
      throw new Error('body must be either a string or a buffer')
    }

    if (bodyBuf && bodyBuf.length > 0) {
      const idCount = reqData.idReplacement
        ? (bodyBuf.toString().match(/\[<id>\]/g) || []).length
        : 0
      headers['Content-Length'] = `${bodyBuf.length + (idCount * 27)}`
    }

    for (const [key, header] of Object.entries(headers)) {
      baseReq.push(`${key}: ${header}`)
    }

    let req = Buffer.from(baseReq.join('\r\n') + '\r\n\r\n', 'utf8')

    if (bodyBuf && bodyBuf.length > 0) {
      req = Buffer.concat([req, bodyBuf])
    }

    return req
  }
}

module.exports = requestBuilder
