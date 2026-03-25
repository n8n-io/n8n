'use strict';

var metric = require('./metric.cjs');
var math = require('./math-96d5e8c4.cjs');

/**
 * Utility module to work with time.
 *
 * @module time
 */

/**
 * Return current time.
 *
 * @return {Date}
 */
const getDate = () => new Date();

/**
 * Return current unix time.
 *
 * @return {number}
 */
const getUnixTime = Date.now;

/**
 * Transform time (in ms) to a human readable format. E.g. 1100 => 1.1s. 60s => 1min. .001 => 10μs.
 *
 * @param {number} d duration in milliseconds
 * @return {string} humanized approximation of time
 */
const humanizeDuration = d => {
  if (d < 60000) {
    const p = metric.prefix(d, -1);
    return math.round(p.n * 100) / 100 + p.prefix + 's'
  }
  d = math.floor(d / 1000);
  const seconds = d % 60;
  const minutes = math.floor(d / 60) % 60;
  const hours = math.floor(d / 3600) % 24;
  const days = math.floor(d / 86400);
  if (days > 0) {
    return days + 'd' + ((hours > 0 || minutes > 30) ? ' ' + (minutes > 30 ? hours + 1 : hours) + 'h' : '')
  }
  if (hours > 0) {
    /* c8 ignore next */
    return hours + 'h' + ((minutes > 0 || seconds > 30) ? ' ' + (seconds > 30 ? minutes + 1 : minutes) + 'min' : '')
  }
  return minutes + 'min' + (seconds > 0 ? ' ' + seconds + 's' : '')
};

var time = /*#__PURE__*/Object.freeze({
  __proto__: null,
  getDate: getDate,
  getUnixTime: getUnixTime,
  humanizeDuration: humanizeDuration
});

exports.getDate = getDate;
exports.getUnixTime = getUnixTime;
exports.humanizeDuration = humanizeDuration;
exports.time = time;
//# sourceMappingURL=time-d8438852.cjs.map
