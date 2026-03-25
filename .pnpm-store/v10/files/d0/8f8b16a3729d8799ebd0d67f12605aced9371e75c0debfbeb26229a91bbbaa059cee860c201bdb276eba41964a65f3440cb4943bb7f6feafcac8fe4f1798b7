import {
  __commonJS
} from "./chunk-A242L54C.js";

// ../node_modules/picoquery/lib/string-util.js
var require_string_util = __commonJS({
  "../node_modules/picoquery/lib/string-util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.encodeString = encodeString;
    var hexTable = Array.from({ length: 256 }, (_, i) => "%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase()), noEscape = new Int8Array([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      0
    ]);
    function encodeString(str) {
      let len = str.length;
      if (len === 0)
        return "";
      let out = "", lastPos = 0, i = 0;
      outer: for (; i < len; i++) {
        let c = str.charCodeAt(i);
        for (; c < 128; ) {
          if (noEscape[c] !== 1 && (lastPos < i && (out += str.slice(lastPos, i)), lastPos = i + 1, out += hexTable[c]), ++i === len)
            break outer;
          c = str.charCodeAt(i);
        }
        if (lastPos < i && (out += str.slice(lastPos, i)), c < 2048) {
          lastPos = i + 1, out += hexTable[192 | c >> 6] + hexTable[128 | c & 63];
          continue;
        }
        if (c < 55296 || c >= 57344) {
          lastPos = i + 1, out += hexTable[224 | c >> 12] + hexTable[128 | c >> 6 & 63] + hexTable[128 | c & 63];
          continue;
        }
        if (++i, i >= len)
          throw new Error("URI malformed");
        let c2 = str.charCodeAt(i) & 1023;
        lastPos = i + 1, c = 65536 + ((c & 1023) << 10 | c2), out += hexTable[240 | c >> 18] + hexTable[128 | c >> 12 & 63] + hexTable[128 | c >> 6 & 63] + hexTable[128 | c & 63];
      }
      return lastPos === 0 ? str : lastPos < len ? out + str.slice(lastPos) : out;
    }
  }
});

// ../node_modules/picoquery/lib/shared.js
var require_shared = __commonJS({
  "../node_modules/picoquery/lib/shared.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.defaultOptions = exports.defaultShouldSerializeObject = exports.defaultValueSerializer = void 0;
    var string_util_js_1 = require_string_util(), defaultValueSerializer = (value) => {
      switch (typeof value) {
        case "string":
          return (0, string_util_js_1.encodeString)(value);
        case "bigint":
        case "boolean":
          return "" + value;
        case "number":
          if (Number.isFinite(value))
            return value < 1e21 ? "" + value : (0, string_util_js_1.encodeString)("" + value);
          break;
      }
      return value instanceof Date ? (0, string_util_js_1.encodeString)(value.toISOString()) : "";
    };
    exports.defaultValueSerializer = defaultValueSerializer;
    var defaultShouldSerializeObject = (val) => val instanceof Date;
    exports.defaultShouldSerializeObject = defaultShouldSerializeObject;
    var identityFunc = (v) => v;
    exports.defaultOptions = {
      nesting: !0,
      nestingSyntax: "dot",
      arrayRepeat: !1,
      arrayRepeatSyntax: "repeat",
      delimiter: 38,
      valueDeserializer: identityFunc,
      valueSerializer: exports.defaultValueSerializer,
      keyDeserializer: identityFunc,
      shouldSerializeObject: exports.defaultShouldSerializeObject
    };
  }
});

// ../node_modules/picoquery/lib/object-util.js
var require_object_util = __commonJS({
  "../node_modules/picoquery/lib/object-util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.getDeepObject = getDeepObject;
    exports.stringifyObject = stringifyObject;
    var shared_js_1 = require_shared(), string_util_js_1 = require_string_util();
    function isPrototypeKey(value) {
      return value === "__proto__" || value === "constructor" || value === "prototype";
    }
    function getDeepObject(obj, key, nextKey, forceObject, forceArray) {
      if (isPrototypeKey(key))
        return obj;
      let currObj = obj[key];
      return typeof currObj == "object" && currObj !== null ? currObj : !forceObject && (forceArray || typeof nextKey == "number" || typeof nextKey == "string" && nextKey * 0 === 0 && nextKey.indexOf(".") === -1) ? obj[key] = [] : obj[key] = {};
    }
    var MAX_DEPTH = 20, strBracketPair = "[]", strBracketLeft = "[", strBracketRight = "]", strDot = ".";
    function stringifyObject(obj, options, depth = 0, parentKey, isProbableArray) {
      let { nestingSyntax = shared_js_1.defaultOptions.nestingSyntax, arrayRepeat = shared_js_1.defaultOptions.arrayRepeat, arrayRepeatSyntax = shared_js_1.defaultOptions.arrayRepeatSyntax, nesting = shared_js_1.defaultOptions.nesting, delimiter = shared_js_1.defaultOptions.delimiter, valueSerializer = shared_js_1.defaultOptions.valueSerializer, shouldSerializeObject = shared_js_1.defaultOptions.shouldSerializeObject } = options, strDelimiter = typeof delimiter == "number" ? String.fromCharCode(delimiter) : delimiter, useArrayRepeatKey = isProbableArray === !0 && arrayRepeat, shouldUseDot = nestingSyntax === "dot" || nestingSyntax === "js" && !isProbableArray;
      if (depth > MAX_DEPTH)
        return "";
      let result = "", firstKey = !0, valueIsProbableArray = !1;
      for (let key in obj) {
        let value = obj[key];
        if (value === void 0)
          continue;
        let path;
        parentKey ? (path = parentKey, useArrayRepeatKey ? arrayRepeatSyntax === "bracket" && (path += strBracketPair) : shouldUseDot ? (path += strDot, path += key) : (path += strBracketLeft, path += key, path += strBracketRight)) : path = key, firstKey || (result += strDelimiter), typeof value == "object" && value !== null && !shouldSerializeObject(value) ? (valueIsProbableArray = value.pop !== void 0, (nesting || arrayRepeat && valueIsProbableArray) && (result += stringifyObject(value, options, depth + 1, path, valueIsProbableArray))) : (result += (0, string_util_js_1.encodeString)(path), result += "=", result += valueSerializer(value, key)), firstKey && (firstKey = !1);
      }
      return result;
    }
  }
});

// ../node_modules/picoquery/lib/decode-uri-component.js
var require_decode_uri_component = __commonJS({
  "../node_modules/picoquery/lib/decode-uri-component.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.decodeURIComponent = decodeURIComponent;
    var UTF8_ACCEPT = 12, UTF8_REJECT = 0, UTF8_DATA = [
      // The first part of the table maps bytes to character to a transition.
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      4,
      4,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      6,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      8,
      7,
      7,
      10,
      9,
      9,
      9,
      11,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      // The second part of the table maps a state to a new state when adding a
      // transition.
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      24,
      36,
      48,
      60,
      72,
      84,
      96,
      0,
      12,
      12,
      12,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      24,
      24,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      24,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      48,
      48,
      48,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      48,
      48,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // The third part maps the current transition to a mask that needs to apply
      // to the byte.
      127,
      63,
      63,
      63,
      0,
      31,
      15,
      15,
      15,
      7,
      7,
      7
    ];
    function decodeURIComponent(uri) {
      let percentPosition = uri.indexOf("%");
      if (percentPosition === -1)
        return uri;
      let length = uri.length, decoded = "", last = 0, codepoint = 0, startOfOctets = percentPosition, state = UTF8_ACCEPT;
      for (; percentPosition > -1 && percentPosition < length; ) {
        let high = hexCodeToInt(uri[percentPosition + 1], 4), low = hexCodeToInt(uri[percentPosition + 2], 0), byte = high | low, type = UTF8_DATA[byte];
        if (state = UTF8_DATA[256 + state + type], codepoint = codepoint << 6 | byte & UTF8_DATA[364 + type], state === UTF8_ACCEPT)
          decoded += uri.slice(last, startOfOctets), decoded += codepoint <= 65535 ? String.fromCharCode(codepoint) : String.fromCharCode(55232 + (codepoint >> 10), 56320 + (codepoint & 1023)), codepoint = 0, last = percentPosition + 3, percentPosition = startOfOctets = uri.indexOf("%", last);
        else {
          if (state === UTF8_REJECT)
            return null;
          if (percentPosition += 3, percentPosition < length && uri.charCodeAt(percentPosition) === 37)
            continue;
          return null;
        }
      }
      return decoded + uri.slice(last);
    }
    var HEX = {
      0: 0,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      a: 10,
      A: 10,
      b: 11,
      B: 11,
      c: 12,
      C: 12,
      d: 13,
      D: 13,
      e: 14,
      E: 14,
      f: 15,
      F: 15
    };
    function hexCodeToInt(c, shift) {
      let i = HEX[c];
      return i === void 0 ? 255 : i << shift;
    }
  }
});

// ../node_modules/picoquery/lib/parse.js
var require_parse = __commonJS({
  "../node_modules/picoquery/lib/parse.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.numberValueDeserializer = exports.numberKeyDeserializer = void 0;
    exports.parse = parse;
    var object_util_js_1 = require_object_util(), shared_js_1 = require_shared(), decode_uri_component_js_1 = require_decode_uri_component(), numberKeyDeserializer = (key) => {
      let asNumber = Number(key);
      return Number.isNaN(asNumber) ? key : asNumber;
    };
    exports.numberKeyDeserializer = numberKeyDeserializer;
    var numberValueDeserializer = (value) => {
      let asNumber = Number(value);
      return Number.isNaN(asNumber) ? value : asNumber;
    };
    exports.numberValueDeserializer = numberValueDeserializer;
    var regexPlus = /\+/g, Empty = function() {
    };
    Empty.prototype = /* @__PURE__ */ Object.create(null);
    function computeKeySlice(input, startIndex, endIndex, keyHasPlus, shouldDecodeKey) {
      let chunk = input.substring(startIndex, endIndex);
      return keyHasPlus && (chunk = chunk.replace(regexPlus, " ")), shouldDecodeKey && (chunk = (0, decode_uri_component_js_1.decodeURIComponent)(chunk) || chunk), chunk;
    }
    function parse(input, options) {
      let { valueDeserializer = shared_js_1.defaultOptions.valueDeserializer, keyDeserializer = shared_js_1.defaultOptions.keyDeserializer, arrayRepeatSyntax = shared_js_1.defaultOptions.arrayRepeatSyntax, nesting = shared_js_1.defaultOptions.nesting, arrayRepeat = shared_js_1.defaultOptions.arrayRepeat, nestingSyntax = shared_js_1.defaultOptions.nestingSyntax, delimiter = shared_js_1.defaultOptions.delimiter } = options ?? {}, charDelimiter = typeof delimiter == "string" ? delimiter.charCodeAt(0) : delimiter, isJsNestingSyntax = nestingSyntax === "js", result = new Empty();
      if (typeof input != "string")
        return result;
      let inputLength = input.length, value = "", startingIndex = -1, equalityIndex = -1, keySeparatorIndex = -1, currentObj = result, lastKey, currentKey = "", keyChunk = "", shouldDecodeKey = !1, shouldDecodeValue = !1, keyHasPlus = !1, valueHasPlus = !1, keyIsDot = !1, hasBothKeyValuePair = !1, c = 0, arrayRepeatBracketIndex = -1, prevIndex = -1, prevChar = -1;
      for (let i = 0; i < inputLength + 1; i++) {
        if (c = i !== inputLength ? input.charCodeAt(i) : charDelimiter, c === charDelimiter) {
          if (hasBothKeyValuePair = equalityIndex > startingIndex, hasBothKeyValuePair || (equalityIndex = i), keySeparatorIndex !== equalityIndex - 1 && (keyChunk = computeKeySlice(input, keySeparatorIndex + 1, arrayRepeatBracketIndex > -1 ? arrayRepeatBracketIndex : equalityIndex, keyHasPlus, shouldDecodeKey), currentKey = keyDeserializer(keyChunk), lastKey !== void 0 && (currentObj = (0, object_util_js_1.getDeepObject)(currentObj, lastKey, currentKey, isJsNestingSyntax && keyIsDot, void 0))), hasBothKeyValuePair || currentKey !== "") {
            hasBothKeyValuePair && (value = input.slice(equalityIndex + 1, i), valueHasPlus && (value = value.replace(regexPlus, " ")), shouldDecodeValue && (value = (0, decode_uri_component_js_1.decodeURIComponent)(value) || value));
            let newValue = valueDeserializer(value, currentKey);
            if (arrayRepeat) {
              let currentValue = currentObj[currentKey];
              currentValue === void 0 ? arrayRepeatBracketIndex > -1 ? currentObj[currentKey] = [newValue] : currentObj[currentKey] = newValue : currentValue.pop ? currentValue.push(newValue) : currentObj[currentKey] = [currentValue, newValue];
            } else
              currentObj[currentKey] = newValue;
          }
          value = "", startingIndex = i, equalityIndex = i, shouldDecodeKey = !1, shouldDecodeValue = !1, keyHasPlus = !1, valueHasPlus = !1, keyIsDot = !1, arrayRepeatBracketIndex = -1, keySeparatorIndex = i, currentObj = result, lastKey = void 0, currentKey = "";
        } else c === 93 ? (arrayRepeat && arrayRepeatSyntax === "bracket" && prevChar === 91 && (arrayRepeatBracketIndex = prevIndex), nesting && (nestingSyntax === "index" || isJsNestingSyntax) && equalityIndex <= startingIndex && (keySeparatorIndex !== prevIndex && (keyChunk = computeKeySlice(input, keySeparatorIndex + 1, i, keyHasPlus, shouldDecodeKey), currentKey = keyDeserializer(keyChunk), lastKey !== void 0 && (currentObj = (0, object_util_js_1.getDeepObject)(currentObj, lastKey, currentKey, void 0, void 0)), lastKey = currentKey, keyHasPlus = !1, shouldDecodeKey = !1), keySeparatorIndex = i, keyIsDot = !1)) : c === 46 ? nesting && (nestingSyntax === "dot" || isJsNestingSyntax) && equalityIndex <= startingIndex && (keySeparatorIndex !== prevIndex && (keyChunk = computeKeySlice(input, keySeparatorIndex + 1, i, keyHasPlus, shouldDecodeKey), currentKey = keyDeserializer(keyChunk), lastKey !== void 0 && (currentObj = (0, object_util_js_1.getDeepObject)(currentObj, lastKey, currentKey, isJsNestingSyntax)), lastKey = currentKey, keyHasPlus = !1, shouldDecodeKey = !1), keyIsDot = !0, keySeparatorIndex = i) : c === 91 ? nesting && (nestingSyntax === "index" || isJsNestingSyntax) && equalityIndex <= startingIndex && (keySeparatorIndex !== prevIndex && (keyChunk = computeKeySlice(input, keySeparatorIndex + 1, i, keyHasPlus, shouldDecodeKey), currentKey = keyDeserializer(keyChunk), isJsNestingSyntax && lastKey !== void 0 && (currentObj = (0, object_util_js_1.getDeepObject)(currentObj, lastKey, currentKey, isJsNestingSyntax)), lastKey = currentKey, keyHasPlus = !1, shouldDecodeKey = !1, keyIsDot = !1), keySeparatorIndex = i) : c === 61 ? equalityIndex <= startingIndex ? equalityIndex = i : shouldDecodeValue = !0 : c === 43 ? equalityIndex > startingIndex ? valueHasPlus = !0 : keyHasPlus = !0 : c === 37 && (equalityIndex > startingIndex ? shouldDecodeValue = !0 : shouldDecodeKey = !0);
        prevIndex = i, prevChar = c;
      }
      return result;
    }
  }
});

// ../node_modules/picoquery/lib/stringify.js
var require_stringify = __commonJS({
  "../node_modules/picoquery/lib/stringify.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.stringify = stringify;
    var object_util_js_1 = require_object_util();
    function stringify(input, options) {
      if (input === null || typeof input != "object")
        return "";
      let optionsObj = options ?? {};
      return (0, object_util_js_1.stringifyObject)(input, optionsObj);
    }
  }
});

// ../node_modules/picoquery/lib/main.js
var require_main = __commonJS({
  "../node_modules/picoquery/lib/main.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      k2 === void 0 && (k2 = k);
      var desc = Object.getOwnPropertyDescriptor(m, k);
      (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) && (desc = { enumerable: !0, get: function() {
        return m[k];
      } }), Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      k2 === void 0 && (k2 = k), o[k2] = m[k];
    })), __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p) && __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.stringify = exports.parse = void 0;
    var parse_js_1 = require_parse();
    Object.defineProperty(exports, "parse", { enumerable: !0, get: function() {
      return parse_js_1.parse;
    } });
    var stringify_js_1 = require_stringify();
    Object.defineProperty(exports, "stringify", { enumerable: !0, get: function() {
      return stringify_js_1.stringify;
    } });
    __exportStar(require_shared(), exports);
  }
});

export {
  require_main
};
