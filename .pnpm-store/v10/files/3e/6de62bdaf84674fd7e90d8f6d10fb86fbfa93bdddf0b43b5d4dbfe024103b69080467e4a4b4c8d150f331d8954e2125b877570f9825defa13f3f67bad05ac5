var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/submodules/cbor/index.ts
var cbor_exports = {};
__export(cbor_exports, {
  buildHttpRpcRequest: () => buildHttpRpcRequest,
  cbor: () => cbor,
  checkCborResponse: () => checkCborResponse,
  dateToTag: () => dateToTag,
  loadSmithyRpcV2CborErrorCode: () => loadSmithyRpcV2CborErrorCode,
  parseCborBody: () => parseCborBody,
  parseCborErrorBody: () => parseCborErrorBody,
  tag: () => tag,
  tagSymbol: () => tagSymbol
});
module.exports = __toCommonJS(cbor_exports);

// src/submodules/cbor/cbor-decode.ts
var import_util_utf8 = require("@smithy/util-utf8");

// src/submodules/cbor/cbor-types.ts
var majorUint64 = 0;
var majorNegativeInt64 = 1;
var majorUnstructuredByteString = 2;
var majorUtf8String = 3;
var majorList = 4;
var majorMap = 5;
var majorTag = 6;
var majorSpecial = 7;
var specialFalse = 20;
var specialTrue = 21;
var specialNull = 22;
var specialUndefined = 23;
var extendedOneByte = 24;
var extendedFloat16 = 25;
var extendedFloat32 = 26;
var extendedFloat64 = 27;
var minorIndefinite = 31;
function alloc(size) {
  return typeof Buffer !== "undefined" ? Buffer.alloc(size) : new Uint8Array(size);
}
var tagSymbol = Symbol("@smithy/core/cbor::tagSymbol");
function tag(data2) {
  data2[tagSymbol] = true;
  return data2;
}

// src/submodules/cbor/cbor-decode.ts
var USE_TEXT_DECODER = typeof TextDecoder !== "undefined";
var USE_BUFFER = typeof Buffer !== "undefined";
var payload = alloc(0);
var dataView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
var textDecoder = USE_TEXT_DECODER ? new TextDecoder() : null;
var _offset = 0;
function setPayload(bytes) {
  payload = bytes;
  dataView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
}
function decode(at, to) {
  if (at >= to) {
    throw new Error("unexpected end of (decode) payload.");
  }
  const major = (payload[at] & 224) >> 5;
  const minor = payload[at] & 31;
  switch (major) {
    case majorUint64:
    case majorNegativeInt64:
    case majorTag:
      let unsignedInt;
      let offset;
      if (minor < 24) {
        unsignedInt = minor;
        offset = 1;
      } else {
        switch (minor) {
          case extendedOneByte:
          case extendedFloat16:
          case extendedFloat32:
          case extendedFloat64:
            const countLength = minorValueToArgumentLength[minor];
            const countOffset = countLength + 1;
            offset = countOffset;
            if (to - at < countOffset) {
              throw new Error(`countLength ${countLength} greater than remaining buf len.`);
            }
            const countIndex = at + 1;
            if (countLength === 1) {
              unsignedInt = payload[countIndex];
            } else if (countLength === 2) {
              unsignedInt = dataView.getUint16(countIndex);
            } else if (countLength === 4) {
              unsignedInt = dataView.getUint32(countIndex);
            } else {
              unsignedInt = dataView.getBigUint64(countIndex);
            }
            break;
          default:
            throw new Error(`unexpected minor value ${minor}.`);
        }
      }
      if (major === majorUint64) {
        _offset = offset;
        return castBigInt(unsignedInt);
      } else if (major === majorNegativeInt64) {
        let negativeInt;
        if (typeof unsignedInt === "bigint") {
          negativeInt = BigInt(-1) - unsignedInt;
        } else {
          negativeInt = -1 - unsignedInt;
        }
        _offset = offset;
        return castBigInt(negativeInt);
      } else {
        const value = decode(at + offset, to);
        const valueOffset = _offset;
        _offset = offset + valueOffset;
        return tag({ tag: castBigInt(unsignedInt), value });
      }
    case majorUtf8String:
    case majorMap:
    case majorList:
    case majorUnstructuredByteString:
      if (minor === minorIndefinite) {
        switch (major) {
          case majorUtf8String:
            return decodeUtf8StringIndefinite(at, to);
          case majorMap:
            return decodeMapIndefinite(at, to);
          case majorList:
            return decodeListIndefinite(at, to);
          case majorUnstructuredByteString:
            return decodeUnstructuredByteStringIndefinite(at, to);
        }
      } else {
        switch (major) {
          case majorUtf8String:
            return decodeUtf8String(at, to);
          case majorMap:
            return decodeMap(at, to);
          case majorList:
            return decodeList(at, to);
          case majorUnstructuredByteString:
            return decodeUnstructuredByteString(at, to);
        }
      }
    default:
      return decodeSpecial(at, to);
  }
}
function bytesToUtf8(bytes, at, to) {
  if (USE_BUFFER && bytes.constructor?.name === "Buffer") {
    return bytes.toString("utf-8", at, to);
  }
  if (textDecoder) {
    return textDecoder.decode(bytes.subarray(at, to));
  }
  return (0, import_util_utf8.toUtf8)(bytes.subarray(at, to));
}
function demote(bigInteger) {
  const num = Number(bigInteger);
  if (num < Number.MIN_SAFE_INTEGER || Number.MAX_SAFE_INTEGER < num) {
    console.warn(new Error(`@smithy/core/cbor - truncating BigInt(${bigInteger}) to ${num} with loss of precision.`));
  }
  return num;
}
var minorValueToArgumentLength = {
  [extendedOneByte]: 1,
  [extendedFloat16]: 2,
  [extendedFloat32]: 4,
  [extendedFloat64]: 8
};
function bytesToFloat16(a, b) {
  const sign = a >> 7;
  const exponent = (a & 124) >> 2;
  const fraction = (a & 3) << 8 | b;
  const scalar = sign === 0 ? 1 : -1;
  let exponentComponent;
  let summation;
  if (exponent === 0) {
    if (fraction === 0) {
      return 0;
    } else {
      exponentComponent = Math.pow(2, 1 - 15);
      summation = 0;
    }
  } else if (exponent === 31) {
    if (fraction === 0) {
      return scalar * Infinity;
    } else {
      return NaN;
    }
  } else {
    exponentComponent = Math.pow(2, exponent - 15);
    summation = 1;
  }
  summation += fraction / 1024;
  return scalar * (exponentComponent * summation);
}
function decodeCount(at, to) {
  const minor = payload[at] & 31;
  if (minor < 24) {
    _offset = 1;
    return minor;
  }
  if (minor === extendedOneByte || minor === extendedFloat16 || minor === extendedFloat32 || minor === extendedFloat64) {
    const countLength = minorValueToArgumentLength[minor];
    _offset = countLength + 1;
    if (to - at < _offset) {
      throw new Error(`countLength ${countLength} greater than remaining buf len.`);
    }
    const countIndex = at + 1;
    if (countLength === 1) {
      return payload[countIndex];
    } else if (countLength === 2) {
      return dataView.getUint16(countIndex);
    } else if (countLength === 4) {
      return dataView.getUint32(countIndex);
    }
    return demote(dataView.getBigUint64(countIndex));
  }
  throw new Error(`unexpected minor value ${minor}.`);
}
function decodeUtf8String(at, to) {
  const length = decodeCount(at, to);
  const offset = _offset;
  at += offset;
  if (to - at < length) {
    throw new Error(`string len ${length} greater than remaining buf len.`);
  }
  const value = bytesToUtf8(payload, at, at + length);
  _offset = offset + length;
  return value;
}
function decodeUtf8StringIndefinite(at, to) {
  at += 1;
  const vector = [];
  for (const base = at; at < to; ) {
    if (payload[at] === 255) {
      const data2 = alloc(vector.length);
      data2.set(vector, 0);
      _offset = at - base + 2;
      return bytesToUtf8(data2, 0, data2.length);
    }
    const major = (payload[at] & 224) >> 5;
    const minor = payload[at] & 31;
    if (major !== majorUtf8String) {
      throw new Error(`unexpected major type ${major} in indefinite string.`);
    }
    if (minor === minorIndefinite) {
      throw new Error("nested indefinite string.");
    }
    const bytes = decodeUnstructuredByteString(at, to);
    const length = _offset;
    at += length;
    for (let i = 0; i < bytes.length; ++i) {
      vector.push(bytes[i]);
    }
  }
  throw new Error("expected break marker.");
}
function decodeUnstructuredByteString(at, to) {
  const length = decodeCount(at, to);
  const offset = _offset;
  at += offset;
  if (to - at < length) {
    throw new Error(`unstructured byte string len ${length} greater than remaining buf len.`);
  }
  const value = payload.subarray(at, at + length);
  _offset = offset + length;
  return value;
}
function decodeUnstructuredByteStringIndefinite(at, to) {
  at += 1;
  const vector = [];
  for (const base = at; at < to; ) {
    if (payload[at] === 255) {
      const data2 = alloc(vector.length);
      data2.set(vector, 0);
      _offset = at - base + 2;
      return data2;
    }
    const major = (payload[at] & 224) >> 5;
    const minor = payload[at] & 31;
    if (major !== majorUnstructuredByteString) {
      throw new Error(`unexpected major type ${major} in indefinite string.`);
    }
    if (minor === minorIndefinite) {
      throw new Error("nested indefinite string.");
    }
    const bytes = decodeUnstructuredByteString(at, to);
    const length = _offset;
    at += length;
    for (let i = 0; i < bytes.length; ++i) {
      vector.push(bytes[i]);
    }
  }
  throw new Error("expected break marker.");
}
function decodeList(at, to) {
  const listDataLength = decodeCount(at, to);
  const offset = _offset;
  at += offset;
  const base = at;
  const list = Array(listDataLength);
  for (let i = 0; i < listDataLength; ++i) {
    const item = decode(at, to);
    const itemOffset = _offset;
    list[i] = item;
    at += itemOffset;
  }
  _offset = offset + (at - base);
  return list;
}
function decodeListIndefinite(at, to) {
  at += 1;
  const list = [];
  for (const base = at; at < to; ) {
    if (payload[at] === 255) {
      _offset = at - base + 2;
      return list;
    }
    const item = decode(at, to);
    const n = _offset;
    at += n;
    list.push(item);
  }
  throw new Error("expected break marker.");
}
function decodeMap(at, to) {
  const mapDataLength = decodeCount(at, to);
  const offset = _offset;
  at += offset;
  const base = at;
  const map = {};
  for (let i = 0; i < mapDataLength; ++i) {
    if (at >= to) {
      throw new Error("unexpected end of map payload.");
    }
    const major = (payload[at] & 224) >> 5;
    if (major !== majorUtf8String) {
      throw new Error(`unexpected major type ${major} for map key at index ${at}.`);
    }
    const key = decode(at, to);
    at += _offset;
    const value = decode(at, to);
    at += _offset;
    map[key] = value;
  }
  _offset = offset + (at - base);
  return map;
}
function decodeMapIndefinite(at, to) {
  at += 1;
  const base = at;
  const map = {};
  for (; at < to; ) {
    if (at >= to) {
      throw new Error("unexpected end of map payload.");
    }
    if (payload[at] === 255) {
      _offset = at - base + 2;
      return map;
    }
    const major = (payload[at] & 224) >> 5;
    if (major !== majorUtf8String) {
      throw new Error(`unexpected major type ${major} for map key.`);
    }
    const key = decode(at, to);
    at += _offset;
    const value = decode(at, to);
    at += _offset;
    map[key] = value;
  }
  throw new Error("expected break marker.");
}
function decodeSpecial(at, to) {
  const minor = payload[at] & 31;
  switch (minor) {
    case specialTrue:
    case specialFalse:
      _offset = 1;
      return minor === specialTrue;
    case specialNull:
      _offset = 1;
      return null;
    case specialUndefined:
      _offset = 1;
      return null;
    case extendedFloat16:
      if (to - at < 3) {
        throw new Error("incomplete float16 at end of buf.");
      }
      _offset = 3;
      return bytesToFloat16(payload[at + 1], payload[at + 2]);
    case extendedFloat32:
      if (to - at < 5) {
        throw new Error("incomplete float32 at end of buf.");
      }
      _offset = 5;
      return dataView.getFloat32(at + 1);
    case extendedFloat64:
      if (to - at < 9) {
        throw new Error("incomplete float64 at end of buf.");
      }
      _offset = 9;
      return dataView.getFloat64(at + 1);
    default:
      throw new Error(`unexpected minor value ${minor}.`);
  }
}
function castBigInt(bigInt) {
  if (typeof bigInt === "number") {
    return bigInt;
  }
  const num = Number(bigInt);
  if (Number.MIN_SAFE_INTEGER <= num && num <= Number.MAX_SAFE_INTEGER) {
    return num;
  }
  return bigInt;
}

// src/submodules/cbor/cbor-encode.ts
var import_util_utf82 = require("@smithy/util-utf8");
var USE_BUFFER2 = typeof Buffer !== "undefined";
var initialSize = 2048;
var data = alloc(initialSize);
var dataView2 = new DataView(data.buffer, data.byteOffset, data.byteLength);
var cursor = 0;
function ensureSpace(bytes) {
  const remaining = data.byteLength - cursor;
  if (remaining < bytes) {
    if (cursor < 16e6) {
      resize(Math.max(data.byteLength * 4, data.byteLength + bytes));
    } else {
      resize(data.byteLength + bytes + 16e6);
    }
  }
}
function toUint8Array() {
  const out = alloc(cursor);
  out.set(data.subarray(0, cursor), 0);
  cursor = 0;
  return out;
}
function resize(size) {
  const old = data;
  data = alloc(size);
  if (old) {
    if (old.copy) {
      old.copy(data, 0, 0, old.byteLength);
    } else {
      data.set(old, 0);
    }
  }
  dataView2 = new DataView(data.buffer, data.byteOffset, data.byteLength);
}
function encodeHeader(major, value) {
  if (value < 24) {
    data[cursor++] = major << 5 | value;
  } else if (value < 1 << 8) {
    data[cursor++] = major << 5 | 24;
    data[cursor++] = value;
  } else if (value < 1 << 16) {
    data[cursor++] = major << 5 | extendedFloat16;
    dataView2.setUint16(cursor, value);
    cursor += 2;
  } else if (value < 2 ** 32) {
    data[cursor++] = major << 5 | extendedFloat32;
    dataView2.setUint32(cursor, value);
    cursor += 4;
  } else {
    data[cursor++] = major << 5 | extendedFloat64;
    dataView2.setBigUint64(cursor, typeof value === "bigint" ? value : BigInt(value));
    cursor += 8;
  }
}
function encode(_input) {
  const encodeStack = [_input];
  while (encodeStack.length) {
    const input = encodeStack.pop();
    ensureSpace(typeof input === "string" ? input.length * 4 : 64);
    if (typeof input === "string") {
      if (USE_BUFFER2) {
        encodeHeader(majorUtf8String, Buffer.byteLength(input));
        cursor += data.write(input, cursor);
      } else {
        const bytes = (0, import_util_utf82.fromUtf8)(input);
        encodeHeader(majorUtf8String, bytes.byteLength);
        data.set(bytes, cursor);
        cursor += bytes.byteLength;
      }
      continue;
    } else if (typeof input === "number") {
      if (Number.isInteger(input)) {
        const nonNegative = input >= 0;
        const major = nonNegative ? majorUint64 : majorNegativeInt64;
        const value = nonNegative ? input : -input - 1;
        if (value < 24) {
          data[cursor++] = major << 5 | value;
        } else if (value < 256) {
          data[cursor++] = major << 5 | 24;
          data[cursor++] = value;
        } else if (value < 65536) {
          data[cursor++] = major << 5 | extendedFloat16;
          data[cursor++] = value >> 8;
          data[cursor++] = value;
        } else if (value < 4294967296) {
          data[cursor++] = major << 5 | extendedFloat32;
          dataView2.setUint32(cursor, value);
          cursor += 4;
        } else {
          data[cursor++] = major << 5 | extendedFloat64;
          dataView2.setBigUint64(cursor, BigInt(value));
          cursor += 8;
        }
        continue;
      }
      data[cursor++] = majorSpecial << 5 | extendedFloat64;
      dataView2.setFloat64(cursor, input);
      cursor += 8;
      continue;
    } else if (typeof input === "bigint") {
      const nonNegative = input >= 0;
      const major = nonNegative ? majorUint64 : majorNegativeInt64;
      const value = nonNegative ? input : -input - BigInt(1);
      const n = Number(value);
      if (n < 24) {
        data[cursor++] = major << 5 | n;
      } else if (n < 256) {
        data[cursor++] = major << 5 | 24;
        data[cursor++] = n;
      } else if (n < 65536) {
        data[cursor++] = major << 5 | extendedFloat16;
        data[cursor++] = n >> 8;
        data[cursor++] = n & 255;
      } else if (n < 4294967296) {
        data[cursor++] = major << 5 | extendedFloat32;
        dataView2.setUint32(cursor, n);
        cursor += 4;
      } else {
        data[cursor++] = major << 5 | extendedFloat64;
        dataView2.setBigUint64(cursor, value);
        cursor += 8;
      }
      continue;
    } else if (input === null) {
      data[cursor++] = majorSpecial << 5 | specialNull;
      continue;
    } else if (typeof input === "boolean") {
      data[cursor++] = majorSpecial << 5 | (input ? specialTrue : specialFalse);
      continue;
    } else if (typeof input === "undefined") {
      throw new Error("@smithy/core/cbor: client may not serialize undefined value.");
    } else if (Array.isArray(input)) {
      for (let i = input.length - 1; i >= 0; --i) {
        encodeStack.push(input[i]);
      }
      encodeHeader(majorList, input.length);
      continue;
    } else if (typeof input.byteLength === "number") {
      ensureSpace(input.length * 2);
      encodeHeader(majorUnstructuredByteString, input.length);
      data.set(input, cursor);
      cursor += input.byteLength;
      continue;
    } else if (typeof input === "object") {
      if (input[tagSymbol]) {
        if ("tag" in input && "value" in input) {
          encodeStack.push(input.value);
          encodeHeader(majorTag, input.tag);
          continue;
        } else {
          throw new Error(
            "tag encountered with missing fields, need 'tag' and 'value', found: " + JSON.stringify(input)
          );
        }
      }
      const keys = Object.keys(input);
      for (let i = keys.length - 1; i >= 0; --i) {
        const key = keys[i];
        encodeStack.push(input[key]);
        encodeStack.push(key);
      }
      encodeHeader(majorMap, keys.length);
      continue;
    }
    throw new Error(`data type ${input?.constructor?.name ?? typeof input} not compatible for encoding.`);
  }
}

// src/submodules/cbor/cbor.ts
var cbor = {
  deserialize(payload2) {
    setPayload(payload2);
    return decode(0, payload2.length);
  },
  serialize(input) {
    try {
      encode(input);
      return toUint8Array();
    } catch (e) {
      toUint8Array();
      throw e;
    }
  },
  /**
   * @public
   * @param size - byte length to allocate.
   *
   * This may be used to garbage collect the CBOR
   * shared encoding buffer space,
   * e.g. resizeEncodingBuffer(0);
   *
   * This may also be used to pre-allocate more space for
   * CBOR encoding, e.g. resizeEncodingBuffer(100_000_000);
   */
  resizeEncodingBuffer(size) {
    resize(size);
  }
};

// src/submodules/cbor/parseCborBody.ts
var import_protocols = require("@smithy/core/protocols");
var import_protocol_http = require("@smithy/protocol-http");
var import_util_body_length_browser = require("@smithy/util-body-length-browser");
var parseCborBody = (streamBody, context) => {
  return (0, import_protocols.collectBody)(streamBody, context).then(async (bytes) => {
    if (bytes.length) {
      try {
        return cbor.deserialize(bytes);
      } catch (e) {
        Object.defineProperty(e, "$responseBodyText", {
          value: context.utf8Encoder(bytes)
        });
        throw e;
      }
    }
    return {};
  });
};
var dateToTag = (date) => {
  return tag({
    tag: 1,
    value: date.getTime() / 1e3
  });
};
var parseCborErrorBody = async (errorBody, context) => {
  const value = await parseCborBody(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
var loadSmithyRpcV2CborErrorCode = (output, data2) => {
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  if (data2["__type"] !== void 0) {
    return sanitizeErrorCode(data2["__type"]);
  }
  if (data2.code !== void 0) {
    return sanitizeErrorCode(data2.code);
  }
};
var checkCborResponse = (response) => {
  if (String(response.headers["smithy-protocol"]).toLowerCase() !== "rpc-v2-cbor") {
    throw new Error("Malformed RPCv2 CBOR response, status: " + response.statusCode);
  }
};
var buildHttpRpcRequest = async (context, headers, path, resolvedHostname, body) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const contents = {
    protocol,
    hostname,
    port,
    method: "POST",
    path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
    headers: {
      // intentional copy.
      ...headers
    }
  };
  if (resolvedHostname !== void 0) {
    contents.hostname = resolvedHostname;
  }
  if (body !== void 0) {
    contents.body = body;
    try {
      contents.headers["content-length"] = String((0, import_util_body_length_browser.calculateBodyLength)(body));
    } catch (e) {
    }
  }
  return new import_protocol_http.HttpRequest(contents);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildHttpRpcRequest,
  cbor,
  checkCborResponse,
  dateToTag,
  loadSmithyRpcV2CborErrorCode,
  parseCborBody,
  parseCborErrorBody,
  tag,
  tagSymbol
});
