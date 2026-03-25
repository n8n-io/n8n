"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.jsonrepairTransform = jsonrepairTransform;
var _nodeStream = require("node:stream");
var _core = require("./core.js");
function jsonrepairTransform(options) {
  const repair = (0, _core.jsonrepairCore)({
    onData: chunk => transform.push(chunk),
    bufferSize: options?.bufferSize,
    chunkSize: options?.chunkSize
  });
  const transform = new _nodeStream.Transform({
    transform(chunk, _encoding, callback) {
      try {
        repair.transform(chunk.toString());
      } catch (err) {
        this.emit('error', err);
      } finally {
        callback();
      }
    },
    flush(callback) {
      try {
        repair.flush();
      } catch (err) {
        this.emit('error', err);
      } finally {
        callback();
      }
    }
  });
  return transform;
}
//# sourceMappingURL=stream.js.map