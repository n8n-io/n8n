'use strict'

const { FetchError, Request, isRedirect } = require('minipass-fetch')
const url = require('url')

const CachePolicy = require('./cache/policy.js')
const cache = require('./cache/index.js')
const remote = require('./remote.js')

// given a Request, a Response and user options
// return true if the response is a redirect that
// can be followed. we throw errors that will result
// in the fetch being rejected if the redirect is
// possible but invalid for some reason
const canFollowRedirect = (request, response, options) => {
  if (!isRedirect(response.status))
    return false

  if (options.redirect === 'manual')
    return false

  if (options.redirect === 'error')
    throw new FetchError(`redirect mode is set to error: ${request.url}`, 'no-redirect', { code: 'ENOREDIRECT' })

  if (!response.headers.has('location'))
    throw new FetchError(`redirect location header missing for: ${request.url}`, 'no-location', { code: 'EINVALIDREDIRECT' })

  if (request.counter >= request.follow)
    throw new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect', { code: 'EMAXREDIRECT' })

  return true
}

// given a Request, a Response, and the user's options return an object
// with a new Request and a new options object that will be used for
// following the redirect
const getRedirect = (request, response, options) => {
  const _opts = { ...options }
  const location = response.headers.get('location')
  const redirectUrl = new url.URL(location, /^https?:/.test(location) ? undefined : request.url)
  // Comment below is used under the following license:
  // Copyright (c) 2010-2012 Mikeal Rogers
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  // http://www.apache.org/licenses/LICENSE-2.0
  // Unless required by applicable law or agreed to in writing,
  // software distributed under the License is distributed on an "AS
  // IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
  // express or implied. See the License for the specific language
  // governing permissions and limitations under the License.

  // Remove authorization if changing hostnames (but not if just
  // changing ports or protocols).  This matches the behavior of request:
  // https://github.com/request/request/blob/b12a6245/lib/redirect.js#L134-L138
  if (new url.URL(request.url).hostname !== redirectUrl.hostname)
    request.headers.delete('authorization')

  // for POST request with 301/302 response, or any request with 303 response,
  // use GET when following redirect
  if (response.status === 303 || (request.method === 'POST' && [301, 302].includes(response.status))) {
    _opts.method = 'GET'
    _opts.body = null
    request.headers.delete('content-length')
  }

  _opts.headers = {}
  request.headers.forEach((value, key) => {
    _opts.headers[key] = value
  })

  _opts.counter = ++request.counter
  const redirectReq = new Request(url.format(redirectUrl), _opts)
  return {
    request: redirectReq,
    options: _opts,
  }
}

const fetch = async (request, options) => {
  const response = CachePolicy.storable(request, options)
    ? await cache(request, options)
    : await remote(request, options)

  // if the request wasn't a GET or HEAD, and the response
  // status is between 200 and 399 inclusive, invalidate the
  // request url
  if (!['GET', 'HEAD'].includes(request.method) &&
      response.status >= 200 &&
      response.status <= 399)
    await cache.invalidate(request, options)

  if (!canFollowRedirect(request, response, options))
    return response

  const redirect = getRedirect(request, response, options)
  return fetch(redirect.request, redirect.options)
}

module.exports = fetch
