//#if CSP
// note that the path must be relative to the dist/ folder
import safeEval from '../src/notevil' //eslint-disable-line no-unused-vars
//#endif

//#if 0
/* global tmpl, brackets, window */
/* eslint-disable no-void */
/* eslint-env amd */
//#endif
//#if NODE
/* riot-tmpl WIP, @license MIT, (c) 2015 Muut Inc. + contributors */
;(function (window) {     // eslint-disable-line no-extra-semi
  'use strict'
//#else

/**
 * The riot template engine
 * @version WIP
 */
//#endif

  //#include skip-regex

  //#include brackets

  //#include tmpl

//#if NODE
  tmpl.version = brackets.version = 'WIP'

  // support CommonJS, AMD & browser
  /* istanbul ignore else */
  if (typeof module === 'object' && module.exports) {
    module.exports = {
      tmpl: tmpl, brackets: brackets
    }
  } else if (typeof define === 'function' && typeof define.amd !== 'undefined') {
    define(function () {
      return {
        tmpl: tmpl, brackets: brackets
      }
    })
  } else if (window) {
    window.tmpl = tmpl
    window.brackets = brackets
  }

})(typeof window === 'object' ? /* istanbul ignore next */ window : void 0)
//#endif
