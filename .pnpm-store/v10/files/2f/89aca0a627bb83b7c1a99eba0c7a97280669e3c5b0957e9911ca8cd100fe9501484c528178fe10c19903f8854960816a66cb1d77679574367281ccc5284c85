'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var node_perf_hooks = require('node:perf_hooks');
var _function = require('./function-314580f7.cjs');
var time = require('./time-d8438852.cjs');
require('./array-78849c95.cjs');
require('./set-5b47859e.cjs');
require('./object-c0c9435b.cjs');
require('./equality.cjs');
require('./metric.cjs');
require('./math-96d5e8c4.cjs');

/**
 * @type {typeof performance.measure}
 */
/* c8 ignore next */
const measure = node_perf_hooks.performance.measure ? node_perf_hooks.performance.measure.bind(node_perf_hooks.performance) : /** @type {any} */ (_function.nop);

/**
 * @type {typeof performance.now}
 */
/* c8 ignore next */
const now = node_perf_hooks.performance.now ? node_perf_hooks.performance.now.bind(node_perf_hooks.performance) : time.getUnixTime;

/**
 * @type {typeof performance.mark}
 */
/* c8 ignore next */
const mark = node_perf_hooks.performance.mark ? node_perf_hooks.performance.mark.bind(node_perf_hooks.performance) : /** @type {any} */ (_function.nop);

exports.mark = mark;
exports.measure = measure;
exports.now = now;
//# sourceMappingURL=performance.node.cjs.map
