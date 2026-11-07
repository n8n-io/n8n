/**
 * A processor file to be used in tests.
 *
 */
'use strict';

const delay = require('delay');

module.exports = function(job) {
  return delay(50)
    .then(() => {
      job.progress(10);
      job.log(job.progress());
      return delay(100);
    })
    .then(() => {
      job.progress(27);
      job.log(job.progress());
      return delay(150);
    })
    .then(() => {
      job.progress(78);
      job.log(job.progress());
      return delay(100);
    })
    .then(() => {
      job.progress(100);
      job.log(job.progress());
    })
    .then(() => {
      return 37;
    });
};
