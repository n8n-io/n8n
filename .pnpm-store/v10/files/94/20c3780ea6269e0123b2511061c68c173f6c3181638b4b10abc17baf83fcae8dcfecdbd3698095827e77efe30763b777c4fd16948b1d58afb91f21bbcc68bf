'use strict';

// populates missing values
module.exports = function (dst, src) {
  Object.keys(src).forEach(function (prop) {
    dst[prop] = dst[prop] || src[prop]; // eslint-disable-line no-param-reassign
  });

  return dst;
};
