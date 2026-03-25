/**
 * tail-file.js: TODO: add file header description.
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 */

'use strict';

var fs = require('fs');
var _require = require('string_decoder'),
  StringDecoder = _require.StringDecoder;
var _require2 = require('readable-stream'),
  Stream = _require2.Stream;

/**
 * Simple no-op function.
 * @returns {undefined}
 */
function noop() {}

/**
 * TODO: add function description.
 * @param {Object} options - Options for tail.
 * @param {function} iter - Iterator function to execute on every line.
* `tail -f` a file. Options must include file.
 * @returns {mixed} - TODO: add return description.
 */
module.exports = function (options, iter) {
  var buffer = Buffer.alloc(64 * 1024);
  var decode = new StringDecoder('utf8');
  var stream = new Stream();
  var buff = '';
  var pos = 0;
  var row = 0;
  if (options.start === -1) {
    delete options.start;
  }
  stream.readable = true;
  stream.destroy = function () {
    stream.destroyed = true;
    stream.emit('end');
    stream.emit('close');
  };
  fs.open(options.file, 'a+', '0644', function (err, fd) {
    if (err) {
      if (!iter) {
        stream.emit('error', err);
      } else {
        iter(err);
      }
      stream.destroy();
      return;
    }
    (function read() {
      if (stream.destroyed) {
        fs.close(fd, noop);
        return;
      }
      return fs.read(fd, buffer, 0, buffer.length, pos, function (error, bytes) {
        if (error) {
          if (!iter) {
            stream.emit('error', error);
          } else {
            iter(error);
          }
          stream.destroy();
          return;
        }
        if (!bytes) {
          if (buff) {
            // eslint-disable-next-line eqeqeq
            if (options.start == null || row > options.start) {
              if (!iter) {
                stream.emit('line', buff);
              } else {
                iter(null, buff);
              }
            }
            row++;
            buff = '';
          }
          return setTimeout(read, 1000);
        }
        var data = decode.write(buffer.slice(0, bytes));
        if (!iter) {
          stream.emit('data', data);
        }
        data = (buff + data).split(/\n+/);
        var l = data.length - 1;
        var i = 0;
        for (; i < l; i++) {
          // eslint-disable-next-line eqeqeq
          if (options.start == null || row > options.start) {
            if (!iter) {
              stream.emit('line', data[i]);
            } else {
              iter(null, data[i]);
            }
          }
          row++;
        }
        buff = data[l];
        pos += bytes;
        return read();
      });
    })();
  });
  if (!iter) {
    return stream;
  }
  return stream.destroy;
};