/**
 * node-compress-commons
 *
 * Copyright (c) 2014 Chris Talkington, contributors.
 * Licensed under the MIT license.
 * https://github.com/archiverjs/node-compress-commons/blob/master/LICENSE-MIT
 */
var Stream = require('stream').Stream;
var PassThrough = require('readable-stream').PassThrough;
var isStream = require('is-stream');

var util = module.exports = {};

util.normalizeInputSource = function(source) {
  if (source === null) {
    return Buffer.alloc(0);
  } else if (typeof source === 'string') {
    return Buffer.from(source);
  } else if (isStream(source) && !source._readableState) {
    var normalized = new PassThrough();
    source.pipe(normalized);

    return normalized;
  }

  return source;
};