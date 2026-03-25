'use strict';

var format = require('./format');
var _require = require('triple-beam'),
  MESSAGE = _require.MESSAGE;
var jsonStringify = require('safe-stable-stringify');

/*
 * function logstash (info)
 * Returns a new instance of the LogStash Format that turns a
 * log `info` object into pure JSON with the appropriate logstash
 * options. This was previously exposed as { logstash: true }
 * to transports in `winston < 3.0.0`.
 */
module.exports = format(function (info) {
  var logstash = {};
  if (info.message) {
    logstash['@message'] = info.message;
    delete info.message;
  }
  if (info.timestamp) {
    logstash['@timestamp'] = info.timestamp;
    delete info.timestamp;
  }
  logstash['@fields'] = info;
  info[MESSAGE] = jsonStringify(logstash);
  return info;
});