'use strict'
const RetryHandler = require('../handler/retry-handler')

module.exports = globalOpts => {
  return dispatch => {
    return function retryInterceptor (opts, handler) {
      return dispatch(
        opts,
        new RetryHandler(
          { ...opts, retryOptions: { ...globalOpts, ...opts.retryOptions } },
          {
            handler,
            dispatch
          }
        )
      )
    }
  }
}
