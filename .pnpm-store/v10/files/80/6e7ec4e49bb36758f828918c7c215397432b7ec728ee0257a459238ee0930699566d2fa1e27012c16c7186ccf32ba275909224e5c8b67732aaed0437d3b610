"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createOutputBuffer = createOutputBuffer;
var _stringUtils = require("../../utils/stringUtils.js");
function createOutputBuffer(_ref) {
  let {
    write,
    chunkSize,
    bufferSize
  } = _ref;
  let buffer = '';
  let offset = 0;
  function flushChunks() {
    let minSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : bufferSize;
    while (buffer.length >= minSize + chunkSize) {
      const chunk = buffer.substring(0, chunkSize);
      write(chunk);
      offset += chunkSize;
      buffer = buffer.substring(chunkSize);
    }
  }
  function flush() {
    flushChunks(0);
    if (buffer.length > 0) {
      write(buffer);
      offset += buffer.length;
      buffer = '';
    }
  }
  function push(text) {
    buffer += text;
    flushChunks();
  }
  function unshift(text) {
    if (offset > 0) {
      throw new Error(`Cannot unshift: ${flushedMessage}`);
    }
    buffer = text + buffer;
    flushChunks();
  }
  function remove(start, end) {
    if (start < offset) {
      throw new Error(`Cannot remove: ${flushedMessage}`);
    }
    if (end !== undefined) {
      buffer = buffer.substring(0, start - offset) + buffer.substring(end - offset);
    } else {
      buffer = buffer.substring(0, start - offset);
    }
  }
  function insertAt(index, text) {
    if (index < offset) {
      throw new Error(`Cannot insert: ${flushedMessage}`);
    }
    buffer = buffer.substring(0, index - offset) + text + buffer.substring(index - offset);
  }
  function length() {
    return offset + buffer.length;
  }
  function stripLastOccurrence(textToStrip) {
    let stripRemainingText = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    const bufferIndex = buffer.lastIndexOf(textToStrip);
    if (bufferIndex !== -1) {
      if (stripRemainingText) {
        buffer = buffer.substring(0, bufferIndex);
      } else {
        buffer = buffer.substring(0, bufferIndex) + buffer.substring(bufferIndex + textToStrip.length);
      }
    }
  }
  function insertBeforeLastWhitespace(textToInsert) {
    let bufferIndex = buffer.length; // index relative to the start of the buffer, not taking `offset` into account

    if (!(0, _stringUtils.isWhitespace)(buffer, bufferIndex - 1)) {
      // no trailing whitespaces
      push(textToInsert);
      return;
    }
    while ((0, _stringUtils.isWhitespace)(buffer, bufferIndex - 1)) {
      bufferIndex--;
    }
    if (bufferIndex <= 0) {
      throw new Error(`Cannot insert: ${flushedMessage}`);
    }
    buffer = buffer.substring(0, bufferIndex) + textToInsert + buffer.substring(bufferIndex);
    flushChunks();
  }
  function endsWithIgnoringWhitespace(char) {
    let i = buffer.length - 1;
    while (i > 0) {
      if (char === buffer.charAt(i)) {
        return true;
      }
      if (!(0, _stringUtils.isWhitespace)(buffer, i)) {
        return false;
      }
      i--;
    }
    return false;
  }
  return {
    push,
    unshift,
    remove,
    insertAt,
    length,
    flush,
    stripLastOccurrence,
    insertBeforeLastWhitespace,
    endsWithIgnoringWhitespace
  };
}
const flushedMessage = 'start of the output is already flushed from the buffer';
//# sourceMappingURL=OutputBuffer.js.map