export function createInputBuffer() {
  let buffer = '';
  let offset = 0;
  let currentLength = 0;
  let closed = false;
  function ensure(index) {
    if (index < offset) {
      throw new Error(`${indexOutOfRangeMessage} (index: ${index}, offset: ${offset})`);
    }
    if (index >= currentLength) {
      if (!closed) {
        throw new Error(`${indexOutOfRangeMessage} (index: ${index})`);
      }
    }
  }
  function push(chunk) {
    buffer += chunk;
    currentLength += chunk.length;
  }
  function flush(position) {
    if (position > currentLength) {
      return;
    }
    buffer = buffer.substring(position - offset);
    offset = position;
  }
  function charAt(index) {
    ensure(index);
    return buffer.charAt(index - offset);
  }
  function charCodeAt(index) {
    ensure(index);
    return buffer.charCodeAt(index - offset);
  }
  function substring(start, end) {
    ensure(end - 1); // -1 because end is excluded
    ensure(start);
    return buffer.slice(start - offset, end - offset);
  }
  function length() {
    if (!closed) {
      throw new Error('Cannot get length: input is not yet closed');
    }
    return currentLength;
  }
  function isEnd(index) {
    if (!closed) {
      ensure(index);
    }
    return index >= currentLength;
  }
  function close() {
    closed = true;
  }
  return {
    push,
    flush,
    charAt,
    charCodeAt,
    substring,
    length,
    currentLength: () => currentLength,
    currentBufferSize: () => buffer.length,
    isEnd,
    close
  };
}
const indexOutOfRangeMessage = 'Index out of range, please configure a larger buffer size';
//# sourceMappingURL=InputBuffer.js.map