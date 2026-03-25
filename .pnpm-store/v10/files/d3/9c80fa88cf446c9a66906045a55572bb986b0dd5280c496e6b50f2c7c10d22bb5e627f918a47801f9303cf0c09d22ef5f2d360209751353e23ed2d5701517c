'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readStdin = exports.read = exports.write = undefined;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var stdinToBuffer = function stdinToBuffer(stream, done) {
  var buffer = '';

  stream.on('data', function (chunck) {
    buffer += chunck;
  });

  stream.on('end', function () {
    done(null, buffer);
  });
};

var promisify = function promisify(fn) {
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return new Promise(function (resolve, reject) {
      return fn.apply(undefined, _toConsumableArray(args.concat(function (err) {
        for (var _len2 = arguments.length, data = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          data[_key2 - 1] = arguments[_key2];
        }

        return err ? reject(err) : resolve.apply(undefined, data);
      })));
    });
  };
};

var write = exports.write = promisify(_fs2.default.writeFile);
var read = exports.read = promisify(_fs2.default.readFile);
var readStdin = exports.readStdin = promisify(stdinToBuffer);