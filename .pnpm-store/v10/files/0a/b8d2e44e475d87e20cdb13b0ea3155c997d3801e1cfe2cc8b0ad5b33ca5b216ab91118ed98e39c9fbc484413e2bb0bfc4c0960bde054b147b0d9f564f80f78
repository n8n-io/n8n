const { URL, format } = require('url')

// options passed to url.format() when generating a key
const formatOptions = {
  auth: false,
  fragment: false,
  search: true,
  unicode: false,
}

// returns a string to be used as the cache key for the Request
const cacheKey = (request) => {
  const parsed = new URL(request.url)
  return `make-fetch-happen:request-cache:${format(parsed, formatOptions)}`
}

module.exports = cacheKey
