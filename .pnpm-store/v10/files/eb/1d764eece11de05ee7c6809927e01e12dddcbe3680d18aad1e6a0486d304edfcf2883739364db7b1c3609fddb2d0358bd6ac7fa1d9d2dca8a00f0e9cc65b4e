'use strict';

var format = require('./format');

/*
 * function label (info)
 * Returns a new instance of the label Format which adds the specified
 * `opts.label` before the message. This was previously exposed as
 * { label: 'my label' } to transports in `winston < 3.0.0`.
 */
module.exports = format(function (info, opts) {
  if (opts.message) {
    info.message = "[".concat(opts.label, "] ").concat(info.message);
    return info;
  }
  info.label = opts.label;
  return info;
});