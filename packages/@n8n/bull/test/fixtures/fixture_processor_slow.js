/**
 * A processor file to be used in tests.
 *
 */
'use strict';

const delay = require('delay');

module.exports = function(/*job*/) {
  return delay(1000).then(() => {
    return 42;
  });
};
