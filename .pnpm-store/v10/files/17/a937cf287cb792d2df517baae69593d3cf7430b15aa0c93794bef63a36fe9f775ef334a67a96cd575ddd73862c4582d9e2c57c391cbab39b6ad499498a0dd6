//
//
//

// Stringifying various things

'use strict';

var defs = require('./defs');
var format = require('util').format;
var HEARTBEAT = require('./frame').HEARTBEAT;

module.exports.closeMessage = function(close) {
  var code = close.fields.replyCode;
  return format('%d (%s) with message "%s"',
                code, defs.constant_strs[code],
                close.fields.replyText);
}

module.exports.methodName = function(id) {
  return defs.info(id).name;
};

module.exports.inspect = function(frame, showFields) {
  if (frame === HEARTBEAT) {
    return '<Heartbeat>';
  }
  else if (!frame.id) {
    return format('<Content channel:%d size:%d>',
                  frame.channel, frame.size);
  }
  else {
    var info = defs.info(frame.id);
    return format('<%s channel:%d%s>', info.name, frame.channel,
                  (showFields)
                  ? ' ' + JSON.stringify(frame.fields, undefined, 2)
                  : '');
  }
}
