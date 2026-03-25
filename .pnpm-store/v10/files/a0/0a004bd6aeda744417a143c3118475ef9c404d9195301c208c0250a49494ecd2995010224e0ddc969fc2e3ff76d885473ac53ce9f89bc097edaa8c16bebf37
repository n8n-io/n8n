const CacheSemantics = require('http-cache-semantics')
const Negotiator = require('negotiator')
const ssri = require('ssri')

// HACK: negotiator lazy loads several of its own modules
// as a micro optimization. we need to be sure that they're
// in memory as soon as possible at startup so that we do
// not try to lazy load them after the directory has been
// retired during a self update of the npm CLI, we do this
// by calling all of the methods that trigger a lazy load
// on a fake instance.
const preloadNegotiator = new Negotiator({ headers: {} })
preloadNegotiator.charsets()
preloadNegotiator.encodings()
preloadNegotiator.languages()
preloadNegotiator.mediaTypes()

// options passed to http-cache-semantics constructor
const policyOptions = {
  shared: false,
  ignoreCargoCult: true,
}

// a fake empty response, used when only testing the
// request for storability
const emptyResponse = { status: 200, headers: {} }

// returns a plain object representation of the Request
const requestObject = (request) => {
  const _obj = {
    method: request.method,
    url: request.url,
    headers: {},
  }

  request.headers.forEach((value, key) => {
    _obj.headers[key] = value
  })

  return _obj
}

// returns a plain object representation of the Response
const responseObject = (response) => {
  const _obj = {
    status: response.status,
    headers: {},
  }

  response.headers.forEach((value, key) => {
    _obj.headers[key] = value
  })

  return _obj
}

class CachePolicy {
  constructor ({ entry, request, response, options }) {
    this.entry = entry
    this.request = requestObject(request)
    this.response = responseObject(response)
    this.options = options
    this.policy = new CacheSemantics(this.request, this.response, policyOptions)

    if (this.entry) {
      // if we have an entry, copy the timestamp to the _responseTime
      // this is necessary because the CacheSemantics constructor forces
      // the value to Date.now() which means a policy created from a
      // cache entry is likely to always identify itself as stale
      this.policy._responseTime = this.entry.metadata.time
    }
  }

  // static method to quickly determine if a request alone is storable
  static storable (request, options) {
    // no cachePath means no caching
    if (!options.cachePath)
      return false

    // user explicitly asked not to cache
    if (options.cache === 'no-store')
      return false

    // we only cache GET and HEAD requests
    if (!['GET', 'HEAD'].includes(request.method))
      return false

    // otherwise, let http-cache-semantics make the decision
    // based on the request's headers
    const policy = new CacheSemantics(requestObject(request), emptyResponse, policyOptions)
    return policy.storable()
  }

  // returns true if the policy satisfies the request
  satisfies (request) {
    const _req = requestObject(request)
    if (this.request.headers.host !== _req.headers.host)
      return false

    const negotiatorA = new Negotiator(this.request)
    const negotiatorB = new Negotiator(_req)

    if (JSON.stringify(negotiatorA.mediaTypes()) !== JSON.stringify(negotiatorB.mediaTypes()))
      return false

    if (JSON.stringify(negotiatorA.languages()) !== JSON.stringify(negotiatorB.languages()))
      return false

    if (JSON.stringify(negotiatorA.encodings()) !== JSON.stringify(negotiatorB.encodings()))
      return false

    if (this.options.integrity)
      return ssri.parse(this.options.integrity).match(this.entry.integrity)

    return true
  }

  // returns true if the request and response allow caching
  storable () {
    return this.policy.storable()
  }

  // NOTE: this is a hack to avoid parsing the cache-control
  // header ourselves, it returns true if the response's
  // cache-control contains must-revalidate
  get mustRevalidate () {
    return !!this.policy._rescc['must-revalidate']
  }

  // returns true if the cached response requires revalidation
  // for the given request
  needsRevalidation (request) {
    const _req = requestObject(request)
    // force method to GET because we only cache GETs
    // but can serve a HEAD from a cached GET
    _req.method = 'GET'
    return !this.policy.satisfiesWithoutRevalidation(_req)
  }

  responseHeaders () {
    return this.policy.responseHeaders()
  }

  // returns a new object containing the appropriate headers
  // to send a revalidation request
  revalidationHeaders (request) {
    const _req = requestObject(request)
    return this.policy.revalidationHeaders(_req)
  }

  // returns true if the request/response was revalidated
  // successfully. returns false if a new response was received
  revalidated (request, response) {
    const _req = requestObject(request)
    const _res = responseObject(response)
    const policy = this.policy.revalidatedPolicy(_req, _res)
    return !policy.modified
  }
}

module.exports = CachePolicy
