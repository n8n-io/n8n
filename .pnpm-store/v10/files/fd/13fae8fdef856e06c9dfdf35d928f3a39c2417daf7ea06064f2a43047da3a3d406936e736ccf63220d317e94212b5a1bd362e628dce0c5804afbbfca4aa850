// src/middleware/etag/digest.ts
var mergeBuffers = (buffer1, buffer2) => {
  if (!buffer1) {
    return buffer2;
  }
  const merged = new Uint8Array(
    new ArrayBuffer(buffer1.byteLength + buffer2.byteLength)
  );
  merged.set(new Uint8Array(buffer1), 0);
  merged.set(buffer2, buffer1.byteLength);
  return merged;
};
var generateDigest = async (stream, generator) => {
  if (!stream) {
    return null;
  }
  let result = void 0;
  const reader = stream.getReader();
  for (; ; ) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    result = await generator(mergeBuffers(result, value));
  }
  if (!result) {
    return null;
  }
  return Array.prototype.map.call(new Uint8Array(result), (x) => x.toString(16).padStart(2, "0")).join("");
};
export {
  generateDigest
};
