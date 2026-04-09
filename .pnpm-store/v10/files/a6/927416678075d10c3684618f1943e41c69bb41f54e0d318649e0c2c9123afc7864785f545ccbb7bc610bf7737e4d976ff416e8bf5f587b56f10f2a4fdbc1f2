// src/utils/index.ts
var _process;
var getNanoSeconds;
var loadTime;
try {
  _process = eval(
    'typeof __TEST_WEB__ === "undefined" && typeof process === "object" ? process : undefined'
  );
} catch (_e) {
}
var hasProcessHrtime = () => {
  return typeof _process !== "undefined" && _process !== null && _process.hrtime;
};
if (hasProcessHrtime()) {
  getNanoSeconds = () => {
    const hr = _process.hrtime();
    return hr[0] * 1e9 + hr[1];
  };
  loadTime = getNanoSeconds();
}
var R20 = /%20/g;
var isNeitherNullNorUndefined = (x) => x !== null && x !== void 0;
var validKeys = (entry) => Object.keys(entry).filter((key) => isNeitherNullNorUndefined(entry[key]));
var buildRecursive = (key, value, suffix = "", encoderFn = encodeURIComponent) => {
  if (Array.isArray(value)) {
    return value.map((v) => buildRecursive(key, v, suffix + "[]", encoderFn)).join("&");
  }
  if (typeof value !== "object") {
    return `${encoderFn(key + suffix)}=${encoderFn(value)}`;
  }
  return Object.keys(value).map((nestedKey) => {
    const nestedValue = value[nestedKey];
    if (isNeitherNullNorUndefined(nestedValue)) {
      return buildRecursive(key, nestedValue, suffix + "[" + nestedKey + "]", encoderFn);
    }
    return null;
  }).filter(isNeitherNullNorUndefined).join("&");
};
var toQueryString = (entry, encoderFn = encodeURIComponent) => {
  if (!isPlainObject(entry)) {
    return entry;
  }
  return Object.keys(entry).map((key) => {
    const value = entry[key];
    if (isNeitherNullNorUndefined(value)) {
      return buildRecursive(key, value, "", encoderFn);
    }
    return null;
  }).filter(isNeitherNullNorUndefined).join("&").replace(R20, "+");
};
var performanceNow = () => {
  if (hasProcessHrtime() && getNanoSeconds !== void 0) {
    const now = getNanoSeconds();
    if (now !== void 0 && loadTime !== void 0) {
      return (now - loadTime) / 1e6;
    }
  }
  return Date.now();
};
var parseResponseHeaders = (headerStr) => {
  const headers = {};
  if (!headerStr) {
    return headers;
  }
  const headerPairs = headerStr.split("\r\n");
  for (let i = 0; i < headerPairs.length; i++) {
    const headerPair = headerPairs[i];
    const index = headerPair.indexOf(": ");
    if (index > 0) {
      const key = headerPair.substring(0, index).toLowerCase().trim();
      const val = headerPair.substring(index + 2).trim();
      headers[key] = val;
    }
  }
  return headers;
};
var lowerCaseObjectKeys = (obj) => {
  return Object.keys(obj).reduce((target, key) => {
    target[key.toLowerCase()] = obj[key];
    return target;
  }, {});
};
var hasOwnProperty = Object.prototype.hasOwnProperty;
var assign = Object.assign || function(target) {
  for (let i = 1; i < arguments.length; i++) {
    const source = arguments[i];
    for (const key in source) {
      if (hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};
var toString = Object.prototype.toString;
var isPlainObject = (value) => {
  return toString.call(value) === "[object Object]" && Object.getPrototypeOf(value) === Object.getPrototypeOf({});
};
var isObject = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var btoa = (input) => {
  let output = "";
  let map = CHARS;
  const str = String(input);
  for (
    let block = 0, charCode, idx = 0;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = "=", idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)
  ) {
    charCode = str.charCodeAt(idx += 3 / 4);
    if (charCode > 255) {
      throw new Error(
        "[Mappersmith] 'btoa' failed: The string to be encoded contains characters outside of the Latin1 range."
      );
    }
    block = block << 8 | charCode;
  }
  return output;
};
export {
  assign,
  btoa,
  buildRecursive,
  isObject,
  isPlainObject,
  lowerCaseObjectKeys,
  parseResponseHeaders,
  performanceNow,
  toQueryString,
  validKeys
};
//# sourceMappingURL=index.mjs.map