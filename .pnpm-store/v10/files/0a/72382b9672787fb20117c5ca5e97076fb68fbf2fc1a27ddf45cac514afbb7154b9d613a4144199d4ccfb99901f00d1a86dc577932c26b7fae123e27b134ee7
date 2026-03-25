const conditionalHeaders = [
  'if-modified-since',
  'if-none-match',
  'if-unmodified-since',
  'if-match',
  'if-range',
]

const configureOptions = (opts) => {
  const {strictSSL, ...options} = { ...opts }
  options.method = options.method ? options.method.toUpperCase() : 'GET'
  options.rejectUnauthorized = strictSSL !== false

  if (!options.retry)
    options.retry = { retries: 0 }
  else if (typeof options.retry === 'string') {
    const retries = parseInt(options.retry, 10)
    if (isFinite(retries))
      options.retry = { retries }
    else
      options.retry = { retries: 0 }
  } else if (typeof options.retry === 'number')
    options.retry = { retries: options.retry }
  else
    options.retry = { retries: 0, ...options.retry }

  options.cache = options.cache || 'default'
  if (options.cache === 'default') {
    const hasConditionalHeader = Object.keys(options.headers || {}).some((name) => {
      return conditionalHeaders.includes(name.toLowerCase())
    })
    if (hasConditionalHeader)
      options.cache = 'no-store'
  }

  // cacheManager is deprecated, but if it's set and
  // cachePath is not we should copy it to the new field
  if (options.cacheManager && !options.cachePath)
    options.cachePath = options.cacheManager

  return options
}

module.exports = configureOptions
