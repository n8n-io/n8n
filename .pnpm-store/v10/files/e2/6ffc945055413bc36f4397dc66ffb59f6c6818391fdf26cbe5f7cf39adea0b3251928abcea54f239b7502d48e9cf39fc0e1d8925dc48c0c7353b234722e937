class NotCachedError extends Error {
  constructor (url) {
    super(`request to ${url} failed: cache mode is 'only-if-cached' but no cached response is available.`)
    this.code = 'ENOTCACHED'
  }
}

module.exports = {
  NotCachedError,
}
