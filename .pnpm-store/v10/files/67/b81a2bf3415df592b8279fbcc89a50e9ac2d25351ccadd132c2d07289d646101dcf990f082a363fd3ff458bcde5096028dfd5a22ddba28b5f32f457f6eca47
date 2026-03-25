const ocsp = require('../ocsp')

class Cache {
  constructor (options) {
    this.options = options || {}
    this.cache = {}

    // Override methods
    if (this.options.probe) {
      this.probe = this.options.probe
    }
    if (this.options.store) {
      this.store = this.options.store
    }
    if (this.options.filter) {
      this.filter = this.options.filter
    }
  }

  filter (url, callback) {
    callback(null)
  }

  probe (id, callback) {
    if (Object.prototype.hasOwnProperty.call(this.cache, id)) {
      callback(null, this.cache[id])
    } else {
      callback(null, false)
    }
  }

  store (id, response, maxTime, callback) {
    if (Object.prototype.hasOwnProperty.call(this.cache, id)) {
      clearTimeout(this.cache[id].timer)
    }

    this.cache[id] = {
      response,
      timer: setTimeout(() => { delete this.cache[id] }, maxTime)
    }

    callback(null, null)
  }

  request (id, data, callback) {
    function done (err, response) {
      if (callback) {
        callback(err, response)
      }
      callback = null
    }

    const onResponse = (err, ocsp) => {
      if (err) {
        return done(err)
      }

      // Respond early
      done(null, ocsp)

      // Try parsing and caching response
      this.getMaxStoreTime(ocsp, (err, maxTime) => {
        if (err) {
          return
        }

        this.store(id, ocsp, maxTime, () => {
          // No-op
        })
      })
    }

    // Check that url isn't blacklisted
    this.filter(data.url, function (err) {
      if (err) {
        return done(err, null)
      }

      ocsp.utils.getResponse(data.url, data.ocsp, onResponse)
    })
  }

  getMaxStoreTime (response, callback) {
    let basic
    try {
      basic = ocsp.utils.parseResponse(response).value
    } catch (e) {
      return callback(e)
    }

    // Not enough responses
    if (basic.tbsResponseData.responses.length === 0) { return callback(new Error('No OCSP responses')) }

    const responses = basic.tbsResponseData.responses

    // Every response should be positive
    const good = responses.every(function (response) {
      return response.certStatus.type === 'good'
    })

    // No good - no cache
    if (!good) {
      return callback(new Error('Some OCSP responses are not good'))
    }

    // Find minimum nextUpdate time
    let nextUpdate = 0
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]
      const responseNext = response.nextUpdate
      if (!responseNext) {
        continue
      }
      if (nextUpdate === 0 || nextUpdate > responseNext) {
        nextUpdate = responseNext
      }
    }

    return callback(null, Math.min(Math.max(0, nextUpdate - new Date()), 0x7FFFFFFF))
  }

  clear () {
    const cacheIds = Object.keys(this.cache)
    cacheIds.forEach((cacheId) => {
      clearTimeout(this.cache[cacheId].timer)
      delete this.cache[cacheId]
    })
  }
}

module.exports = Cache
