'use strict'

const RedirectHandler = require('../handler/redirect-handler')

function createRedirectInterceptor ({ maxRedirections: defaultMaxRedirections } = {}) {
  return (dispatch) => {
    return function Intercept (opts, handler) {
      const { maxRedirections = defaultMaxRedirections, ...rest } = opts

      if (maxRedirections == null || maxRedirections === 0) {
        return dispatch(opts, handler)
      }

      const dispatchOpts = { ...rest } // Stop sub dispatcher from also redirecting.
      const redirectHandler = new RedirectHandler(dispatch, maxRedirections, dispatchOpts, handler)
      return dispatch(dispatchOpts, redirectHandler)
    }
  }
}

module.exports = createRedirectInterceptor
