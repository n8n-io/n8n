/*global define */

// Detecting data URLs
// data URI - MDN https://developer.mozilla.org/en-US/docs/data_URIs
// The "data" URL scheme: http://tools.ietf.org/html/rfc2397
// Valid URL Characters: http://tools.ietf.org/html/rfc2396#section2

(function (root, factory) {
  // https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md#ignore-a-umd-wrapper
  /* istanbul ignore next */
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.validDataUrl = factory();
  }
}(this, function () {
  'use strict';

  function validDataUrl(s) {
    return validDataUrl.regex.test((s || '').trim());
  }
  validDataUrl.regex = /^data:([a-z]+\/[a-z0-9-+.]+(;[a-z0-9-.!#$%*+.{}|~`]+=[a-z0-9-.!#$%*+.{}()|~`]+)*)?(;base64)?,([a-z0-9!$&',()*+;=\-._~:@\/?%\s]*?)$/i;

  return validDataUrl;
}));
