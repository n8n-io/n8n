// src/utils/buffer.ts
import { sha256 } from "./crypto.js";
var equal = (a, b) => {
  if (a === b) {
    return true;
  }
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  const va = new DataView(a);
  const vb = new DataView(b);
  let i = va.byteLength;
  while (i--) {
    if (va.getUint8(i) !== vb.getUint8(i)) {
      return false;
    }
  }
  return true;
};
var constantTimeEqualString = (a, b) => {
  const aLen = a.length;
  const bLen = b.length;
  const maxLen = Math.max(aLen, bLen);
  let out = aLen ^ bLen;
  for (let i = 0; i < maxLen; i++) {
    const aChar = i < aLen ? a.charCodeAt(i) : 0;
    const bChar = i < bLen ? b.charCodeAt(i) : 0;
    out |= aChar ^ bChar;
  }
  return out === 0;
};
var timingSafeEqualString = async (a, b, hashFunction) => {
  if (!hashFunction) {
    hashFunction = sha256;
  }
  const [sa, sb] = await Promise.all([hashFunction(a), hashFunction(b)]);
  if (sa == null || sb == null || typeof sa !== "string" || typeof sb !== "string") {
    return false;
  }
  const hashEqual = constantTimeEqualString(sa, sb);
  const originalEqual = constantTimeEqualString(a, b);
  return hashEqual && originalEqual;
};
var timingSafeEqual = async (a, b, hashFunction) => {
  if (typeof a === "string" && typeof b === "string") {
    return timingSafeEqualString(a, b, hashFunction);
  }
  if (!hashFunction) {
    hashFunction = sha256;
  }
  const [sa, sb] = await Promise.all([hashFunction(a), hashFunction(b)]);
  if (!sa || !sb || typeof sa !== "string" || typeof sb !== "string") {
    return false;
  }
  return timingSafeEqualString(sa, sb);
};
var bufferToString = (buffer) => {
  if (buffer instanceof ArrayBuffer) {
    const enc = new TextDecoder("utf-8");
    return enc.decode(buffer);
  }
  return buffer;
};
var bufferToFormData = (arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      "Content-Type": contentType
    }
  });
  return response.formData();
};
export {
  bufferToFormData,
  bufferToString,
  equal,
  timingSafeEqual
};
