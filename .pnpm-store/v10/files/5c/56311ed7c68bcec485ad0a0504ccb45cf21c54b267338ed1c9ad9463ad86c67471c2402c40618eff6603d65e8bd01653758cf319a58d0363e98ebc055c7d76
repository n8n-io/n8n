'use strict'

// given we support node v8
// eslint-disable-next-line n/no-deprecated-api
const { parse } = require('url')

function parseHAR (har) {
  const requestsPerOrigin = new Map()
  try {
    if (!har || typeof har !== 'object' || typeof har.log !== 'object' || !Array.isArray(har.log.entries) || !har.log.entries.length) {
      throw new Error('no entries found')
    }
    let i = 0
    for (const entry of har.log.entries) {
      i++
      if (!entry || typeof entry !== 'object' || !entry.request || typeof entry.request !== 'object') {
        throw new Error(`invalid request in entry #${i}`)
      }
      const { request: { method, url, headers: headerArray, postData } } = entry
      // turn headers array to headers object
      const headers = {}
      if (!Array.isArray(headerArray)) {
        throw new Error(`invalid headers array in entry #${i}`)
      }
      let j = 0
      for (const header of headerArray) {
        j++
        if (!header || typeof header !== 'object' || typeof header.name !== 'string' || typeof header.value !== 'string') {
          throw new Error(`invalid name or value in header #${j} of entry #${i}`)
        }
        const { name, value } = header
        headers[name] = value
      }
      const { path, hash, host, protocol } = parse(url)
      const origin = `${protocol}//${host}`

      let requests = requestsPerOrigin.get(origin)
      if (!requests) {
        requests = []
        requestsPerOrigin.set(origin, requests)
      }
      const request = {
        origin,
        method,
        // only keep path & hash as our HttpClient will handle origin
        path: `${path}${hash || ''}`,
        headers
      }
      if (typeof postData === 'object' && typeof postData.text === 'string') {
        request.body = postData.text
      }
      requests.push(request)
    }
  } catch (err) {
    throw new Error(`Could not parse HAR content: ${err.message}`)
  }
  return requestsPerOrigin
}

exports.parseHAR = parseHAR
