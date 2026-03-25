'use strict';

var stubs = require('stubs')

/*
 * StreamEvents can be used 2 ways:
 *
 * 1:
 * function MyStream() {
 *   require('stream-events').call(this)
 * }
 *
 * 2:
 * require('stream-events')(myStream)
 */
function StreamEvents(stream) {
  stream = stream || this

  var cfg = {
    callthrough: true,
    calls: 1
  }

  stubs(stream, '_read', cfg, stream.emit.bind(stream, 'reading'))
  stubs(stream, '_write', cfg, stream.emit.bind(stream, 'writing'))

  return stream
}

module.exports = StreamEvents
