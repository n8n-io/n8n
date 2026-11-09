/**
 * A processor file to be used in tests.
 *
 */
'use strict';

const delay = require('delay');

module.exports = function(job, done) {
  delay(500).then(() => {
    done(null, 42);
  });
};
