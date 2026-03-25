"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isPLPStream = isPLPStream;
exports.readPLPStream = readPLPStream;
exports.readValue = readValue;
var _metadataParser = require("./metadata-parser");
var _dataType = require("./data-type");
var _iconvLite = _interopRequireDefault(require("iconv-lite"));
var _sprintfJs = require("sprintf-js");
var _guidParser = require("./guid-parser");
var _helpers = require("./token/helpers");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const NULL = (1 << 16) - 1;
const MAX = (1 << 16) - 1;
const THREE_AND_A_THIRD = 3 + 1 / 3;
const MONEY_DIVISOR = 10000;
const PLP_NULL = 0xFFFFFFFFFFFFFFFFn;
const UNKNOWN_PLP_LEN = 0xFFFFFFFFFFFFFFFEn;
const DEFAULT_ENCODING = 'utf8';
function readTinyInt(buf, offset) {
  return (0, _helpers.readUInt8)(buf, offset);
}
function readSmallInt(buf, offset) {
  return (0, _helpers.readInt16LE)(buf, offset);
}
function readInt(buf, offset) {
  return (0, _helpers.readInt32LE)(buf, offset);
}
function readBigInt(buf, offset) {
  let value;
  ({
    offset,
    value
  } = (0, _helpers.readBigInt64LE)(buf, offset));
  return new _helpers.Result(value.toString(), offset);
}
function readReal(buf, offset) {
  return (0, _helpers.readFloatLE)(buf, offset);
}
function readFloat(buf, offset) {
  return (0, _helpers.readDoubleLE)(buf, offset);
}
function readSmallMoney(buf, offset) {
  let value;
  ({
    offset,
    value
  } = (0, _helpers.readInt32LE)(buf, offset));
  return new _helpers.Result(value / MONEY_DIVISOR, offset);
}
function readMoney(buf, offset) {
  let high;
  ({
    offset,
    value: high
  } = (0, _helpers.readInt32LE)(buf, offset));
  let low;
  ({
    offset,
    value: low
  } = (0, _helpers.readUInt32LE)(buf, offset));
  return new _helpers.Result((low + 0x100000000 * high) / MONEY_DIVISOR, offset);
}
function readBit(buf, offset) {
  let value;
  ({
    offset,
    value
  } = (0, _helpers.readUInt8)(buf, offset));
  return new _helpers.Result(!!value, offset);
}
function readValue(buf, offset, metadata, options) {
  const type = metadata.type;
  switch (type.name) {
    case 'Null':
      return new _helpers.Result(null, offset);
    case 'TinyInt':
      {
        return readTinyInt(buf, offset);
      }
    case 'SmallInt':
      {
        return readSmallInt(buf, offset);
      }
    case 'Int':
      {
        return readInt(buf, offset);
      }
    case 'BigInt':
      {
        return readBigInt(buf, offset);
      }
    case 'IntN':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        switch (dataLength) {
          case 0:
            return new _helpers.Result(null, offset);
          case 1:
            return readTinyInt(buf, offset);
          case 2:
            return readSmallInt(buf, offset);
          case 4:
            return readInt(buf, offset);
          case 8:
            return readBigInt(buf, offset);
          default:
            throw new Error('Unsupported dataLength ' + dataLength + ' for IntN');
        }
      }
    case 'Real':
      {
        return readReal(buf, offset);
      }
    case 'Float':
      {
        return readFloat(buf, offset);
      }
    case 'FloatN':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        switch (dataLength) {
          case 0:
            return new _helpers.Result(null, offset);
          case 4:
            return readReal(buf, offset);
          case 8:
            return readFloat(buf, offset);
          default:
            throw new Error('Unsupported dataLength ' + dataLength + ' for FloatN');
        }
      }
    case 'SmallMoney':
      {
        return readSmallMoney(buf, offset);
      }
    case 'Money':
      return readMoney(buf, offset);
    case 'MoneyN':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        switch (dataLength) {
          case 0:
            return new _helpers.Result(null, offset);
          case 4:
            return readSmallMoney(buf, offset);
          case 8:
            return readMoney(buf, offset);
          default:
            throw new Error('Unsupported dataLength ' + dataLength + ' for MoneyN');
        }
      }
    case 'Bit':
      {
        return readBit(buf, offset);
      }
    case 'BitN':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        switch (dataLength) {
          case 0:
            return new _helpers.Result(null, offset);
          case 1:
            return readBit(buf, offset);
          default:
            throw new Error('Unsupported dataLength ' + dataLength + ' for BitN');
        }
      }
    case 'VarChar':
    case 'Char':
      {
        const codepage = metadata.collation.codepage;
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt16LE)(buf, offset));
        if (dataLength === NULL) {
          return new _helpers.Result(null, offset);
        }
        return readChars(buf, offset, dataLength, codepage);
      }
    case 'NVarChar':
    case 'NChar':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt16LE)(buf, offset));
        if (dataLength === NULL) {
          return new _helpers.Result(null, offset);
        }
        return readNChars(buf, offset, dataLength);
      }
    case 'VarBinary':
    case 'Binary':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt16LE)(buf, offset));
        if (dataLength === NULL) {
          return new _helpers.Result(null, offset);
        }
        return readBinary(buf, offset, dataLength);
      }
    case 'Text':
      {
        let textPointerLength;
        ({
          offset,
          value: textPointerLength
        } = (0, _helpers.readUInt8)(buf, offset));
        if (textPointerLength === 0) {
          return new _helpers.Result(null, offset);
        }

        // Textpointer
        ({
          offset
        } = readBinary(buf, offset, textPointerLength));

        // Timestamp
        ({
          offset
        } = readBinary(buf, offset, 8));
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt32LE)(buf, offset));
        return readChars(buf, offset, dataLength, metadata.collation.codepage);
      }
    case 'NText':
      {
        let textPointerLength;
        ({
          offset,
          value: textPointerLength
        } = (0, _helpers.readUInt8)(buf, offset));
        if (textPointerLength === 0) {
          return new _helpers.Result(null, offset);
        }

        // Textpointer
        ({
          offset
        } = readBinary(buf, offset, textPointerLength));

        // Timestamp
        ({
          offset
        } = readBinary(buf, offset, 8));
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt32LE)(buf, offset));
        return readNChars(buf, offset, dataLength);
      }
    case 'Image':
      {
        let textPointerLength;
        ({
          offset,
          value: textPointerLength
        } = (0, _helpers.readUInt8)(buf, offset));
        if (textPointerLength === 0) {
          return new _helpers.Result(null, offset);
        }

        // Textpointer
        ({
          offset
        } = readBinary(buf, offset, textPointerLength));

        // Timestamp
        ({
          offset
        } = readBinary(buf, offset, 8));
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt32LE)(buf, offset));
        return readBinary(buf, offset, dataLength);
      }
    case 'SmallDateTime':
      {
        return readSmallDateTime(buf, offset, options.useUTC);
      }
    case 'DateTime':
      {
        return readDateTime(buf, offset, options.useUTC);
      }
    case 'DateTimeN':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        switch (dataLength) {
          case 0:
            return new _helpers.Result(null, offset);
          case 4:
            return readSmallDateTime(buf, offset, options.useUTC);
          case 8:
            return readDateTime(buf, offset, options.useUTC);
          default:
            throw new Error('Unsupported dataLength ' + dataLength + ' for DateTimeN');
        }
      }
    case 'Time':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        if (dataLength === 0) {
          return new _helpers.Result(null, offset);
        }
        return readTime(buf, offset, dataLength, metadata.scale, options.useUTC);
      }
    case 'Date':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        if (dataLength === 0) {
          return new _helpers.Result(null, offset);
        }
        return readDate(buf, offset, options.useUTC);
      }
    case 'DateTime2':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        if (dataLength === 0) {
          return new _helpers.Result(null, offset);
        }
        return readDateTime2(buf, offset, dataLength, metadata.scale, options.useUTC);
      }
    case 'DateTimeOffset':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        if (dataLength === 0) {
          return new _helpers.Result(null, offset);
        }
        return readDateTimeOffset(buf, offset, dataLength, metadata.scale);
      }
    case 'NumericN':
    case 'DecimalN':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        if (dataLength === 0) {
          return new _helpers.Result(null, offset);
        }
        return readNumeric(buf, offset, dataLength, metadata.precision, metadata.scale);
      }
    case 'UniqueIdentifier':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt8)(buf, offset));
        switch (dataLength) {
          case 0:
            return new _helpers.Result(null, offset);
          case 0x10:
            return readUniqueIdentifier(buf, offset, options);
          default:
            throw new Error((0, _sprintfJs.sprintf)('Unsupported guid size %d', dataLength - 1));
        }
      }
    case 'Variant':
      {
        let dataLength;
        ({
          offset,
          value: dataLength
        } = (0, _helpers.readUInt32LE)(buf, offset));
        if (dataLength === 0) {
          return new _helpers.Result(null, offset);
        }
        return readVariant(buf, offset, options, dataLength);
      }
    default:
      {
        throw new Error('Invalid type!');
      }
  }
}
function isPLPStream(metadata) {
  switch (metadata.type.name) {
    case 'VarChar':
    case 'NVarChar':
    case 'VarBinary':
      {
        return metadata.dataLength === MAX;
      }
    case 'Xml':
      {
        return true;
      }
    case 'UDT':
      {
        return true;
      }
  }
}
function readUniqueIdentifier(buf, offset, options) {
  let data;
  ({
    value: data,
    offset
  } = readBinary(buf, offset, 0x10));
  return new _helpers.Result(options.lowerCaseGuids ? (0, _guidParser.bufferToLowerCaseGuid)(data) : (0, _guidParser.bufferToUpperCaseGuid)(data), offset);
}
function readNumeric(buf, offset, dataLength, _precision, scale) {
  let sign;
  ({
    offset,
    value: sign
  } = (0, _helpers.readUInt8)(buf, offset));
  sign = sign === 1 ? 1 : -1;
  let value;
  if (dataLength === 5) {
    ({
      offset,
      value
    } = (0, _helpers.readUInt32LE)(buf, offset));
  } else if (dataLength === 9) {
    ({
      offset,
      value
    } = (0, _helpers.readUNumeric64LE)(buf, offset));
  } else if (dataLength === 13) {
    ({
      offset,
      value
    } = (0, _helpers.readUNumeric96LE)(buf, offset));
  } else if (dataLength === 17) {
    ({
      offset,
      value
    } = (0, _helpers.readUNumeric128LE)(buf, offset));
  } else {
    throw new Error((0, _sprintfJs.sprintf)('Unsupported numeric dataLength %d', dataLength));
  }
  return new _helpers.Result(value * sign / Math.pow(10, scale), offset);
}
function readVariant(buf, offset, options, dataLength) {
  let baseType;
  ({
    value: baseType,
    offset
  } = (0, _helpers.readUInt8)(buf, offset));
  const type = _dataType.TYPE[baseType];
  let propBytes;
  ({
    value: propBytes,
    offset
  } = (0, _helpers.readUInt8)(buf, offset));
  dataLength = dataLength - propBytes - 2;
  switch (type.name) {
    case 'UniqueIdentifier':
      return readUniqueIdentifier(buf, offset, options);
    case 'Bit':
      return readBit(buf, offset);
    case 'TinyInt':
      return readTinyInt(buf, offset);
    case 'SmallInt':
      return readSmallInt(buf, offset);
    case 'Int':
      return readInt(buf, offset);
    case 'BigInt':
      return readBigInt(buf, offset);
    case 'SmallDateTime':
      return readSmallDateTime(buf, offset, options.useUTC);
    case 'DateTime':
      return readDateTime(buf, offset, options.useUTC);
    case 'Real':
      return readReal(buf, offset);
    case 'Float':
      return readFloat(buf, offset);
    case 'SmallMoney':
      return readSmallMoney(buf, offset);
    case 'Money':
      return readMoney(buf, offset);
    case 'Date':
      return readDate(buf, offset, options.useUTC);
    case 'Time':
      {
        let scale;
        ({
          value: scale,
          offset
        } = (0, _helpers.readUInt8)(buf, offset));
        return readTime(buf, offset, dataLength, scale, options.useUTC);
      }
    case 'DateTime2':
      {
        let scale;
        ({
          value: scale,
          offset
        } = (0, _helpers.readUInt8)(buf, offset));
        return readDateTime2(buf, offset, dataLength, scale, options.useUTC);
      }
    case 'DateTimeOffset':
      {
        let scale;
        ({
          value: scale,
          offset
        } = (0, _helpers.readUInt8)(buf, offset));
        return readDateTimeOffset(buf, offset, dataLength, scale);
      }
    case 'VarBinary':
    case 'Binary':
      {
        // maxLength (unused?)
        ({
          offset
        } = (0, _helpers.readUInt16LE)(buf, offset));
        return readBinary(buf, offset, dataLength);
      }
    case 'NumericN':
    case 'DecimalN':
      {
        let precision;
        ({
          value: precision,
          offset
        } = (0, _helpers.readUInt8)(buf, offset));
        let scale;
        ({
          value: scale,
          offset
        } = (0, _helpers.readUInt8)(buf, offset));
        return readNumeric(buf, offset, dataLength, precision, scale);
      }
    case 'VarChar':
    case 'Char':
      {
        // maxLength (unused?)
        ({
          offset
        } = (0, _helpers.readUInt16LE)(buf, offset));
        let collation;
        ({
          value: collation,
          offset
        } = (0, _metadataParser.readCollation)(buf, offset));
        return readChars(buf, offset, dataLength, collation.codepage);
      }
    case 'NVarChar':
    case 'NChar':
      {
        // maxLength (unused?)
        ({
          offset
        } = (0, _helpers.readUInt16LE)(buf, offset));

        // collation (unused?)
        ({
          offset
        } = (0, _metadataParser.readCollation)(buf, offset));
        return readNChars(buf, offset, dataLength);
      }
    default:
      throw new Error('Invalid type!');
  }
}
function readBinary(buf, offset, dataLength) {
  if (buf.length < offset + dataLength) {
    throw new _helpers.NotEnoughDataError(offset + dataLength);
  }
  return new _helpers.Result(buf.slice(offset, offset + dataLength), offset + dataLength);
}
function readChars(buf, offset, dataLength, codepage) {
  if (buf.length < offset + dataLength) {
    throw new _helpers.NotEnoughDataError(offset + dataLength);
  }
  return new _helpers.Result(_iconvLite.default.decode(buf.slice(offset, offset + dataLength), codepage ?? DEFAULT_ENCODING), offset + dataLength);
}
function readNChars(buf, offset, dataLength) {
  if (buf.length < offset + dataLength) {
    throw new _helpers.NotEnoughDataError(offset + dataLength);
  }
  return new _helpers.Result(buf.toString('ucs2', offset, offset + dataLength), offset + dataLength);
}
async function readPLPStream(parser) {
  while (parser.buffer.length < parser.position + 8) {
    await parser.waitForChunk();
  }
  const expectedLength = parser.buffer.readBigUInt64LE(parser.position);
  parser.position += 8;
  if (expectedLength === PLP_NULL) {
    return null;
  }
  const chunks = [];
  let currentLength = 0;
  while (true) {
    while (parser.buffer.length < parser.position + 4) {
      await parser.waitForChunk();
    }
    const chunkLength = parser.buffer.readUInt32LE(parser.position);
    parser.position += 4;
    if (!chunkLength) {
      break;
    }
    while (parser.buffer.length < parser.position + chunkLength) {
      await parser.waitForChunk();
    }
    chunks.push(parser.buffer.slice(parser.position, parser.position + chunkLength));
    parser.position += chunkLength;
    currentLength += chunkLength;
  }
  if (expectedLength !== UNKNOWN_PLP_LEN) {
    if (currentLength !== Number(expectedLength)) {
      throw new Error('Partially Length-prefixed Bytes unmatched lengths : expected ' + expectedLength + ', but got ' + currentLength + ' bytes');
    }
  }
  return chunks;
}
function readSmallDateTime(buf, offset, useUTC) {
  let days;
  ({
    offset,
    value: days
  } = (0, _helpers.readUInt16LE)(buf, offset));
  let minutes;
  ({
    offset,
    value: minutes
  } = (0, _helpers.readUInt16LE)(buf, offset));
  let value;
  if (useUTC) {
    value = new Date(Date.UTC(1900, 0, 1 + days, 0, minutes));
  } else {
    value = new Date(1900, 0, 1 + days, 0, minutes);
  }
  return new _helpers.Result(value, offset);
}
function readDateTime(buf, offset, useUTC) {
  let days;
  ({
    offset,
    value: days
  } = (0, _helpers.readInt32LE)(buf, offset));
  let threeHundredthsOfSecond;
  ({
    offset,
    value: threeHundredthsOfSecond
  } = (0, _helpers.readInt32LE)(buf, offset));
  const milliseconds = Math.round(threeHundredthsOfSecond * THREE_AND_A_THIRD);
  let value;
  if (useUTC) {
    value = new Date(Date.UTC(1900, 0, 1 + days, 0, 0, 0, milliseconds));
  } else {
    value = new Date(1900, 0, 1 + days, 0, 0, 0, milliseconds);
  }
  return new _helpers.Result(value, offset);
}
function readTime(buf, offset, dataLength, scale, useUTC) {
  let value;
  switch (dataLength) {
    case 3:
      {
        ({
          value,
          offset
        } = (0, _helpers.readUInt24LE)(buf, offset));
        break;
      }
    case 4:
      {
        ({
          value,
          offset
        } = (0, _helpers.readUInt32LE)(buf, offset));
        break;
      }
    case 5:
      {
        ({
          value,
          offset
        } = (0, _helpers.readUInt40LE)(buf, offset));
        break;
      }
    default:
      {
        throw new Error('unreachable');
      }
  }
  if (scale < 7) {
    for (let i = scale; i < 7; i++) {
      value *= 10;
    }
  }
  let date;
  if (useUTC) {
    date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, value / 10000));
  } else {
    date = new Date(1970, 0, 1, 0, 0, 0, value / 10000);
  }
  Object.defineProperty(date, 'nanosecondsDelta', {
    enumerable: false,
    value: value % 10000 / Math.pow(10, 7)
  });
  return new _helpers.Result(date, offset);
}
function readDate(buf, offset, useUTC) {
  let days;
  ({
    offset,
    value: days
  } = (0, _helpers.readUInt24LE)(buf, offset));
  if (useUTC) {
    return new _helpers.Result(new Date(Date.UTC(2000, 0, days - 730118)), offset);
  } else {
    return new _helpers.Result(new Date(2000, 0, days - 730118), offset);
  }
}
function readDateTime2(buf, offset, dataLength, scale, useUTC) {
  let time;
  ({
    offset,
    value: time
  } = readTime(buf, offset, dataLength - 3, scale, useUTC));
  let days;
  ({
    offset,
    value: days
  } = (0, _helpers.readUInt24LE)(buf, offset));
  let date;
  if (useUTC) {
    date = new Date(Date.UTC(2000, 0, days - 730118, 0, 0, 0, +time));
  } else {
    date = new Date(2000, 0, days - 730118, time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
  }
  Object.defineProperty(date, 'nanosecondsDelta', {
    enumerable: false,
    value: time.nanosecondsDelta
  });
  return new _helpers.Result(date, offset);
}
function readDateTimeOffset(buf, offset, dataLength, scale) {
  let time;
  ({
    offset,
    value: time
  } = readTime(buf, offset, dataLength - 5, scale, true));
  let days;
  ({
    offset,
    value: days
  } = (0, _helpers.readUInt24LE)(buf, offset));

  // time offset?
  ({
    offset
  } = (0, _helpers.readUInt16LE)(buf, offset));
  const date = new Date(Date.UTC(2000, 0, days - 730118, 0, 0, 0, +time));
  Object.defineProperty(date, 'nanosecondsDelta', {
    enumerable: false,
    value: time.nanosecondsDelta
  });
  return new _helpers.Result(date, offset);
}
module.exports.readValue = readValue;
module.exports.isPLPStream = isPLPStream;
module.exports.readPLPStream = readPLPStream;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfbWV0YWRhdGFQYXJzZXIiLCJyZXF1aXJlIiwiX2RhdGFUeXBlIiwiX2ljb252TGl0ZSIsIl9pbnRlcm9wUmVxdWlyZURlZmF1bHQiLCJfc3ByaW50ZkpzIiwiX2d1aWRQYXJzZXIiLCJfaGVscGVycyIsIm9iaiIsIl9fZXNNb2R1bGUiLCJkZWZhdWx0IiwiTlVMTCIsIk1BWCIsIlRIUkVFX0FORF9BX1RISVJEIiwiTU9ORVlfRElWSVNPUiIsIlBMUF9OVUxMIiwiVU5LTk9XTl9QTFBfTEVOIiwiREVGQVVMVF9FTkNPRElORyIsInJlYWRUaW55SW50IiwiYnVmIiwib2Zmc2V0IiwicmVhZFVJbnQ4IiwicmVhZFNtYWxsSW50IiwicmVhZEludDE2TEUiLCJyZWFkSW50IiwicmVhZEludDMyTEUiLCJyZWFkQmlnSW50IiwidmFsdWUiLCJyZWFkQmlnSW50NjRMRSIsIlJlc3VsdCIsInRvU3RyaW5nIiwicmVhZFJlYWwiLCJyZWFkRmxvYXRMRSIsInJlYWRGbG9hdCIsInJlYWREb3VibGVMRSIsInJlYWRTbWFsbE1vbmV5IiwicmVhZE1vbmV5IiwiaGlnaCIsImxvdyIsInJlYWRVSW50MzJMRSIsInJlYWRCaXQiLCJyZWFkVmFsdWUiLCJtZXRhZGF0YSIsIm9wdGlvbnMiLCJ0eXBlIiwibmFtZSIsImRhdGFMZW5ndGgiLCJFcnJvciIsImNvZGVwYWdlIiwiY29sbGF0aW9uIiwicmVhZFVJbnQxNkxFIiwicmVhZENoYXJzIiwicmVhZE5DaGFycyIsInJlYWRCaW5hcnkiLCJ0ZXh0UG9pbnRlckxlbmd0aCIsInJlYWRTbWFsbERhdGVUaW1lIiwidXNlVVRDIiwicmVhZERhdGVUaW1lIiwicmVhZFRpbWUiLCJzY2FsZSIsInJlYWREYXRlIiwicmVhZERhdGVUaW1lMiIsInJlYWREYXRlVGltZU9mZnNldCIsInJlYWROdW1lcmljIiwicHJlY2lzaW9uIiwicmVhZFVuaXF1ZUlkZW50aWZpZXIiLCJzcHJpbnRmIiwicmVhZFZhcmlhbnQiLCJpc1BMUFN0cmVhbSIsImRhdGEiLCJsb3dlckNhc2VHdWlkcyIsImJ1ZmZlclRvTG93ZXJDYXNlR3VpZCIsImJ1ZmZlclRvVXBwZXJDYXNlR3VpZCIsIl9wcmVjaXNpb24iLCJzaWduIiwicmVhZFVOdW1lcmljNjRMRSIsInJlYWRVTnVtZXJpYzk2TEUiLCJyZWFkVU51bWVyaWMxMjhMRSIsIk1hdGgiLCJwb3ciLCJiYXNlVHlwZSIsIlRZUEUiLCJwcm9wQnl0ZXMiLCJyZWFkQ29sbGF0aW9uIiwibGVuZ3RoIiwiTm90RW5vdWdoRGF0YUVycm9yIiwic2xpY2UiLCJpY29udiIsImRlY29kZSIsInJlYWRQTFBTdHJlYW0iLCJwYXJzZXIiLCJidWZmZXIiLCJwb3NpdGlvbiIsIndhaXRGb3JDaHVuayIsImV4cGVjdGVkTGVuZ3RoIiwicmVhZEJpZ1VJbnQ2NExFIiwiY2h1bmtzIiwiY3VycmVudExlbmd0aCIsImNodW5rTGVuZ3RoIiwicHVzaCIsIk51bWJlciIsImRheXMiLCJtaW51dGVzIiwiRGF0ZSIsIlVUQyIsInRocmVlSHVuZHJlZHRoc09mU2Vjb25kIiwibWlsbGlzZWNvbmRzIiwicm91bmQiLCJyZWFkVUludDI0TEUiLCJyZWFkVUludDQwTEUiLCJpIiwiZGF0ZSIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZW51bWVyYWJsZSIsInRpbWUiLCJnZXRIb3VycyIsImdldE1pbnV0ZXMiLCJnZXRTZWNvbmRzIiwiZ2V0TWlsbGlzZWNvbmRzIiwibmFub3NlY29uZHNEZWx0YSIsIm1vZHVsZSIsImV4cG9ydHMiXSwic291cmNlcyI6WyIuLi9zcmMvdmFsdWUtcGFyc2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXJzZXIsIHsgdHlwZSBQYXJzZXJPcHRpb25zIH0gZnJvbSAnLi90b2tlbi9zdHJlYW0tcGFyc2VyJztcbmltcG9ydCB7IHR5cGUgTWV0YWRhdGEsIHJlYWRDb2xsYXRpb24gfSBmcm9tICcuL21ldGFkYXRhLXBhcnNlcic7XG5pbXBvcnQgeyBUWVBFIH0gZnJvbSAnLi9kYXRhLXR5cGUnO1xuXG5pbXBvcnQgaWNvbnYgZnJvbSAnaWNvbnYtbGl0ZSc7XG5pbXBvcnQgeyBzcHJpbnRmIH0gZnJvbSAnc3ByaW50Zi1qcyc7XG5pbXBvcnQgeyBidWZmZXJUb0xvd2VyQ2FzZUd1aWQsIGJ1ZmZlclRvVXBwZXJDYXNlR3VpZCB9IGZyb20gJy4vZ3VpZC1wYXJzZXInO1xuaW1wb3J0IHsgTm90RW5vdWdoRGF0YUVycm9yLCBSZXN1bHQsIHJlYWRCaWdJbnQ2NExFLCByZWFkRG91YmxlTEUsIHJlYWRGbG9hdExFLCByZWFkSW50MTZMRSwgcmVhZEludDMyTEUsIHJlYWRVSW50MTZMRSwgcmVhZFVJbnQzMkxFLCByZWFkVUludDgsIHJlYWRVSW50MjRMRSwgcmVhZFVJbnQ0MExFLCByZWFkVU51bWVyaWM2NExFLCByZWFkVU51bWVyaWM5NkxFLCByZWFkVU51bWVyaWMxMjhMRSB9IGZyb20gJy4vdG9rZW4vaGVscGVycyc7XG5cbmNvbnN0IE5VTEwgPSAoMSA8PCAxNikgLSAxO1xuY29uc3QgTUFYID0gKDEgPDwgMTYpIC0gMTtcbmNvbnN0IFRIUkVFX0FORF9BX1RISVJEID0gMyArICgxIC8gMyk7XG5jb25zdCBNT05FWV9ESVZJU09SID0gMTAwMDA7XG5jb25zdCBQTFBfTlVMTCA9IDB4RkZGRkZGRkZGRkZGRkZGRm47XG5jb25zdCBVTktOT1dOX1BMUF9MRU4gPSAweEZGRkZGRkZGRkZGRkZGRkVuO1xuY29uc3QgREVGQVVMVF9FTkNPRElORyA9ICd1dGY4JztcblxuZnVuY3Rpb24gcmVhZFRpbnlJbnQoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyKTogUmVzdWx0PG51bWJlcj4ge1xuICByZXR1cm4gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZFNtYWxsSW50KGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlcik6IFJlc3VsdDxudW1iZXI+IHtcbiAgcmV0dXJuIHJlYWRJbnQxNkxFKGJ1Ziwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZEludChidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIpOiBSZXN1bHQ8bnVtYmVyPiB7XG4gIHJldHVybiByZWFkSW50MzJMRShidWYsIG9mZnNldCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRCaWdJbnQoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyKTogUmVzdWx0PHN0cmluZz4ge1xuICBsZXQgdmFsdWU7XG4gICh7IG9mZnNldCwgdmFsdWUgfSA9IHJlYWRCaWdJbnQ2NExFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQodmFsdWUudG9TdHJpbmcoKSwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZFJlYWwoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyKTogUmVzdWx0PG51bWJlcj4ge1xuICByZXR1cm4gcmVhZEZsb2F0TEUoYnVmLCBvZmZzZXQpO1xufVxuXG5mdW5jdGlvbiByZWFkRmxvYXQoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyKTogUmVzdWx0PG51bWJlcj4ge1xuICByZXR1cm4gcmVhZERvdWJsZUxFKGJ1Ziwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZFNtYWxsTW9uZXkoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyKTogUmVzdWx0PG51bWJlcj4ge1xuICBsZXQgdmFsdWU7XG4gICh7IG9mZnNldCwgdmFsdWUgfSA9IHJlYWRJbnQzMkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQodmFsdWUgLyBNT05FWV9ESVZJU09SLCBvZmZzZXQpO1xufVxuXG5mdW5jdGlvbiByZWFkTW9uZXkoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyKTogUmVzdWx0PG51bWJlcj4ge1xuICBsZXQgaGlnaDtcbiAgKHsgb2Zmc2V0LCB2YWx1ZTogaGlnaCB9ID0gcmVhZEludDMyTEUoYnVmLCBvZmZzZXQpKTtcblxuICBsZXQgbG93O1xuICAoeyBvZmZzZXQsIHZhbHVlOiBsb3cgfSA9IHJlYWRVSW50MzJMRShidWYsIG9mZnNldCkpO1xuXG4gIHJldHVybiBuZXcgUmVzdWx0KChsb3cgKyAoMHgxMDAwMDAwMDAgKiBoaWdoKSkgLyBNT05FWV9ESVZJU09SLCBvZmZzZXQpO1xufVxuXG5mdW5jdGlvbiByZWFkQml0KGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlcik6IFJlc3VsdDxib29sZWFuPiB7XG4gIGxldCB2YWx1ZTtcbiAgKHsgb2Zmc2V0LCB2YWx1ZSB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQoISF2YWx1ZSwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZFZhbHVlKGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlciwgbWV0YWRhdGE6IE1ldGFkYXRhLCBvcHRpb25zOiBQYXJzZXJPcHRpb25zKTogUmVzdWx0PHVua25vd24+IHtcbiAgY29uc3QgdHlwZSA9IG1ldGFkYXRhLnR5cGU7XG5cbiAgc3dpdGNoICh0eXBlLm5hbWUpIHtcbiAgICBjYXNlICdOdWxsJzpcbiAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG5cbiAgICBjYXNlICdUaW55SW50Jzoge1xuICAgICAgcmV0dXJuIHJlYWRUaW55SW50KGJ1Ziwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICBjYXNlICdTbWFsbEludCc6IHtcbiAgICAgIHJldHVybiByZWFkU21hbGxJbnQoYnVmLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIGNhc2UgJ0ludCc6IHtcbiAgICAgIHJldHVybiByZWFkSW50KGJ1Ziwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICBjYXNlICdCaWdJbnQnOiB7XG4gICAgICByZXR1cm4gcmVhZEJpZ0ludChidWYsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgY2FzZSAnSW50Tic6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHN3aXRjaCAoZGF0YUxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZXN1bHQobnVsbCwgb2Zmc2V0KTtcblxuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgcmV0dXJuIHJlYWRUaW55SW50KGJ1Ziwgb2Zmc2V0KTtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHJldHVybiByZWFkU21hbGxJbnQoYnVmLCBvZmZzZXQpO1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgcmV0dXJuIHJlYWRJbnQoYnVmLCBvZmZzZXQpO1xuICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgcmV0dXJuIHJlYWRCaWdJbnQoYnVmLCBvZmZzZXQpO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnN1cHBvcnRlZCBkYXRhTGVuZ3RoICcgKyBkYXRhTGVuZ3RoICsgJyBmb3IgSW50TicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhc2UgJ1JlYWwnOiB7XG4gICAgICByZXR1cm4gcmVhZFJlYWwoYnVmLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIGNhc2UgJ0Zsb2F0Jzoge1xuICAgICAgcmV0dXJuIHJlYWRGbG9hdChidWYsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgY2FzZSAnRmxvYXROJzoge1xuICAgICAgbGV0IGRhdGFMZW5ndGg7XG4gICAgICAoeyBvZmZzZXQsIHZhbHVlOiBkYXRhTGVuZ3RoIH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgc3dpdGNoIChkYXRhTGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICByZXR1cm4gcmVhZFJlYWwoYnVmLCBvZmZzZXQpO1xuICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgcmV0dXJuIHJlYWRGbG9hdChidWYsIG9mZnNldCk7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIGRhdGFMZW5ndGggJyArIGRhdGFMZW5ndGggKyAnIGZvciBGbG9hdE4nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjYXNlICdTbWFsbE1vbmV5Jzoge1xuICAgICAgcmV0dXJuIHJlYWRTbWFsbE1vbmV5KGJ1Ziwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICBjYXNlICdNb25leSc6XG4gICAgICByZXR1cm4gcmVhZE1vbmV5KGJ1Ziwgb2Zmc2V0KTtcblxuICAgIGNhc2UgJ01vbmV5Tic6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHN3aXRjaCAoZGF0YUxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZXN1bHQobnVsbCwgb2Zmc2V0KTtcblxuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgcmV0dXJuIHJlYWRTbWFsbE1vbmV5KGJ1Ziwgb2Zmc2V0KTtcbiAgICAgICAgY2FzZSA4OlxuICAgICAgICAgIHJldHVybiByZWFkTW9uZXkoYnVmLCBvZmZzZXQpO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnN1cHBvcnRlZCBkYXRhTGVuZ3RoICcgKyBkYXRhTGVuZ3RoICsgJyBmb3IgTW9uZXlOJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FzZSAnQml0Jzoge1xuICAgICAgcmV0dXJuIHJlYWRCaXQoYnVmLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIGNhc2UgJ0JpdE4nOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBzd2l0Y2ggKGRhdGFMZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG5cbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHJldHVybiByZWFkQml0KGJ1Ziwgb2Zmc2V0KTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgZGF0YUxlbmd0aCAnICsgZGF0YUxlbmd0aCArICcgZm9yIEJpdE4nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjYXNlICdWYXJDaGFyJzpcbiAgICBjYXNlICdDaGFyJzoge1xuICAgICAgY29uc3QgY29kZXBhZ2UgPSBtZXRhZGF0YS5jb2xsYXRpb24hLmNvZGVwYWdlITtcblxuICAgICAgbGV0IGRhdGFMZW5ndGg7XG4gICAgICAoeyBvZmZzZXQsIHZhbHVlOiBkYXRhTGVuZ3RoIH0gPSByZWFkVUludDE2TEUoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgaWYgKGRhdGFMZW5ndGggPT09IE5VTEwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXN1bHQobnVsbCwgb2Zmc2V0KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlYWRDaGFycyhidWYsIG9mZnNldCwgZGF0YUxlbmd0aCwgY29kZXBhZ2UpO1xuICAgIH1cblxuICAgIGNhc2UgJ05WYXJDaGFyJzpcbiAgICBjYXNlICdOQ2hhcic6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQxNkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIGlmIChkYXRhTGVuZ3RoID09PSBOVUxMKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWFkTkNoYXJzKGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoKTtcbiAgICB9XG5cbiAgICBjYXNlICdWYXJCaW5hcnknOlxuICAgIGNhc2UgJ0JpbmFyeSc6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQxNkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIGlmIChkYXRhTGVuZ3RoID09PSBOVUxMKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWFkQmluYXJ5KGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoKTtcbiAgICB9XG5cbiAgICBjYXNlICdUZXh0Jzoge1xuICAgICAgbGV0IHRleHRQb2ludGVyTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogdGV4dFBvaW50ZXJMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBpZiAodGV4dFBvaW50ZXJMZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXN1bHQobnVsbCwgb2Zmc2V0KTtcbiAgICAgIH1cblxuICAgICAgLy8gVGV4dHBvaW50ZXJcbiAgICAgICh7IG9mZnNldCB9ID0gcmVhZEJpbmFyeShidWYsIG9mZnNldCwgdGV4dFBvaW50ZXJMZW5ndGgpKTtcblxuICAgICAgLy8gVGltZXN0YW1wXG4gICAgICAoeyBvZmZzZXQgfSA9IHJlYWRCaW5hcnkoYnVmLCBvZmZzZXQsIDgpKTtcblxuICAgICAgbGV0IGRhdGFMZW5ndGg7XG4gICAgICAoeyBvZmZzZXQsIHZhbHVlOiBkYXRhTGVuZ3RoIH0gPSByZWFkVUludDMyTEUoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgcmV0dXJuIHJlYWRDaGFycyhidWYsIG9mZnNldCwgZGF0YUxlbmd0aCwgbWV0YWRhdGEuY29sbGF0aW9uIS5jb2RlcGFnZSEpO1xuICAgIH1cblxuICAgIGNhc2UgJ05UZXh0Jzoge1xuICAgICAgbGV0IHRleHRQb2ludGVyTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogdGV4dFBvaW50ZXJMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBpZiAodGV4dFBvaW50ZXJMZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXN1bHQobnVsbCwgb2Zmc2V0KTtcbiAgICAgIH1cblxuICAgICAgLy8gVGV4dHBvaW50ZXJcbiAgICAgICh7IG9mZnNldCB9ID0gcmVhZEJpbmFyeShidWYsIG9mZnNldCwgdGV4dFBvaW50ZXJMZW5ndGgpKTtcblxuICAgICAgLy8gVGltZXN0YW1wXG4gICAgICAoeyBvZmZzZXQgfSA9IHJlYWRCaW5hcnkoYnVmLCBvZmZzZXQsIDgpKTtcblxuICAgICAgbGV0IGRhdGFMZW5ndGg7XG4gICAgICAoeyBvZmZzZXQsIHZhbHVlOiBkYXRhTGVuZ3RoIH0gPSByZWFkVUludDMyTEUoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgcmV0dXJuIHJlYWROQ2hhcnMoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgpO1xuICAgIH1cblxuICAgIGNhc2UgJ0ltYWdlJzoge1xuICAgICAgbGV0IHRleHRQb2ludGVyTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogdGV4dFBvaW50ZXJMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBpZiAodGV4dFBvaW50ZXJMZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXN1bHQobnVsbCwgb2Zmc2V0KTtcbiAgICAgIH1cblxuICAgICAgLy8gVGV4dHBvaW50ZXJcbiAgICAgICh7IG9mZnNldCB9ID0gcmVhZEJpbmFyeShidWYsIG9mZnNldCwgdGV4dFBvaW50ZXJMZW5ndGgpKTtcblxuICAgICAgLy8gVGltZXN0YW1wXG4gICAgICAoeyBvZmZzZXQgfSA9IHJlYWRCaW5hcnkoYnVmLCBvZmZzZXQsIDgpKTtcblxuICAgICAgbGV0IGRhdGFMZW5ndGg7XG4gICAgICAoeyBvZmZzZXQsIHZhbHVlOiBkYXRhTGVuZ3RoIH0gPSByZWFkVUludDMyTEUoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgcmV0dXJuIHJlYWRCaW5hcnkoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgpO1xuICAgIH1cblxuICAgIGNhc2UgJ1NtYWxsRGF0ZVRpbWUnOiB7XG4gICAgICByZXR1cm4gcmVhZFNtYWxsRGF0ZVRpbWUoYnVmLCBvZmZzZXQsIG9wdGlvbnMudXNlVVRDKTtcbiAgICB9XG5cbiAgICBjYXNlICdEYXRlVGltZSc6IHtcbiAgICAgIHJldHVybiByZWFkRGF0ZVRpbWUoYnVmLCBvZmZzZXQsIG9wdGlvbnMudXNlVVRDKTtcbiAgICB9XG5cbiAgICBjYXNlICdEYXRlVGltZU4nOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBzd2l0Y2ggKGRhdGFMZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG5cbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHJldHVybiByZWFkU21hbGxEYXRlVGltZShidWYsIG9mZnNldCwgb3B0aW9ucy51c2VVVEMpO1xuICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgcmV0dXJuIHJlYWREYXRlVGltZShidWYsIG9mZnNldCwgb3B0aW9ucy51c2VVVEMpO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnN1cHBvcnRlZCBkYXRhTGVuZ3RoICcgKyBkYXRhTGVuZ3RoICsgJyBmb3IgRGF0ZVRpbWVOJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FzZSAnVGltZSc6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIGlmIChkYXRhTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWFkVGltZShidWYsIG9mZnNldCwgZGF0YUxlbmd0aCwgbWV0YWRhdGEuc2NhbGUhLCBvcHRpb25zLnVzZVVUQyk7XG4gICAgfVxuXG4gICAgY2FzZSAnRGF0ZSc6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIGlmIChkYXRhTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWFkRGF0ZShidWYsIG9mZnNldCwgb3B0aW9ucy51c2VVVEMpO1xuICAgIH1cblxuICAgIGNhc2UgJ0RhdGVUaW1lMic6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIGlmIChkYXRhTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWFkRGF0ZVRpbWUyKGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoLCBtZXRhZGF0YS5zY2FsZSEsIG9wdGlvbnMudXNlVVRDKTtcbiAgICB9XG5cbiAgICBjYXNlICdEYXRlVGltZU9mZnNldCc6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIGlmIChkYXRhTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWFkRGF0ZVRpbWVPZmZzZXQoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgsIG1ldGFkYXRhLnNjYWxlISk7XG4gICAgfVxuXG4gICAgY2FzZSAnTnVtZXJpY04nOlxuICAgIGNhc2UgJ0RlY2ltYWxOJzoge1xuICAgICAgbGV0IGRhdGFMZW5ndGg7XG4gICAgICAoeyBvZmZzZXQsIHZhbHVlOiBkYXRhTGVuZ3RoIH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgaWYgKGRhdGFMZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXN1bHQobnVsbCwgb2Zmc2V0KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlYWROdW1lcmljKGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoLCBtZXRhZGF0YS5wcmVjaXNpb24hLCBtZXRhZGF0YS5zY2FsZSEpO1xuICAgIH1cblxuICAgIGNhc2UgJ1VuaXF1ZUlkZW50aWZpZXInOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBzd2l0Y2ggKGRhdGFMZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG5cbiAgICAgICAgY2FzZSAweDEwOlxuICAgICAgICAgIHJldHVybiByZWFkVW5pcXVlSWRlbnRpZmllcihidWYsIG9mZnNldCwgb3B0aW9ucyk7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3ByaW50ZignVW5zdXBwb3J0ZWQgZ3VpZCBzaXplICVkJywgZGF0YUxlbmd0aCEgLSAxKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FzZSAnVmFyaWFudCc6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQzMkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIGlmIChkYXRhTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWFkVmFyaWFudChidWYsIG9mZnNldCwgb3B0aW9ucywgZGF0YUxlbmd0aCk7XG4gICAgfVxuXG4gICAgZGVmYXVsdDoge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHR5cGUhJyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzUExQU3RyZWFtKG1ldGFkYXRhOiBNZXRhZGF0YSkge1xuICBzd2l0Y2ggKG1ldGFkYXRhLnR5cGUubmFtZSkge1xuICAgIGNhc2UgJ1ZhckNoYXInOlxuICAgIGNhc2UgJ05WYXJDaGFyJzpcbiAgICBjYXNlICdWYXJCaW5hcnknOiB7XG4gICAgICByZXR1cm4gbWV0YWRhdGEuZGF0YUxlbmd0aCA9PT0gTUFYO1xuICAgIH1cblxuICAgIGNhc2UgJ1htbCc6IHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGNhc2UgJ1VEVCc6IHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkVW5pcXVlSWRlbnRpZmllcihidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIsIG9wdGlvbnM6IFBhcnNlck9wdGlvbnMpOiBSZXN1bHQ8c3RyaW5nPiB7XG4gIGxldCBkYXRhO1xuICAoeyB2YWx1ZTogZGF0YSwgb2Zmc2V0IH0gPSByZWFkQmluYXJ5KGJ1Ziwgb2Zmc2V0LCAweDEwKSk7XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQob3B0aW9ucy5sb3dlckNhc2VHdWlkcyA/IGJ1ZmZlclRvTG93ZXJDYXNlR3VpZChkYXRhKSA6IGJ1ZmZlclRvVXBwZXJDYXNlR3VpZChkYXRhKSwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZE51bWVyaWMoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCBkYXRhTGVuZ3RoOiBudW1iZXIsIF9wcmVjaXNpb246IG51bWJlciwgc2NhbGU6IG51bWJlcik6IFJlc3VsdDxudW1iZXI+IHtcbiAgbGV0IHNpZ247XG4gICh7IG9mZnNldCwgdmFsdWU6IHNpZ24gfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gIHNpZ24gPSBzaWduID09PSAxID8gMSA6IC0xO1xuXG4gIGxldCB2YWx1ZTtcbiAgaWYgKGRhdGFMZW5ndGggPT09IDUpIHtcbiAgICAoeyBvZmZzZXQsIHZhbHVlIH0gPSByZWFkVUludDMyTEUoYnVmLCBvZmZzZXQpKTtcbiAgfSBlbHNlIGlmIChkYXRhTGVuZ3RoID09PSA5KSB7XG4gICAgKHsgb2Zmc2V0LCB2YWx1ZSB9ID0gcmVhZFVOdW1lcmljNjRMRShidWYsIG9mZnNldCkpO1xuICB9IGVsc2UgaWYgKGRhdGFMZW5ndGggPT09IDEzKSB7XG4gICAgKHsgb2Zmc2V0LCB2YWx1ZSB9ID0gcmVhZFVOdW1lcmljOTZMRShidWYsIG9mZnNldCkpO1xuICB9IGVsc2UgaWYgKGRhdGFMZW5ndGggPT09IDE3KSB7XG4gICAgKHsgb2Zmc2V0LCB2YWx1ZSB9ID0gcmVhZFVOdW1lcmljMTI4TEUoYnVmLCBvZmZzZXQpKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3Ioc3ByaW50ZignVW5zdXBwb3J0ZWQgbnVtZXJpYyBkYXRhTGVuZ3RoICVkJywgZGF0YUxlbmd0aCkpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQoKHZhbHVlICogc2lnbikgLyBNYXRoLnBvdygxMCwgc2NhbGUpLCBvZmZzZXQpO1xufVxuXG5mdW5jdGlvbiByZWFkVmFyaWFudChidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIsIG9wdGlvbnM6IFBhcnNlck9wdGlvbnMsIGRhdGFMZW5ndGg6IG51bWJlcik6IFJlc3VsdDx1bmtub3duPiB7XG4gIGxldCBiYXNlVHlwZTtcbiAgKHsgdmFsdWU6IGJhc2VUeXBlLCBvZmZzZXQgfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gIGNvbnN0IHR5cGUgPSBUWVBFW2Jhc2VUeXBlXTtcblxuICBsZXQgcHJvcEJ5dGVzO1xuICAoeyB2YWx1ZTogcHJvcEJ5dGVzLCBvZmZzZXQgfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gIGRhdGFMZW5ndGggPSBkYXRhTGVuZ3RoIC0gcHJvcEJ5dGVzIC0gMjtcblxuICBzd2l0Y2ggKHR5cGUubmFtZSkge1xuICAgIGNhc2UgJ1VuaXF1ZUlkZW50aWZpZXInOlxuICAgICAgcmV0dXJuIHJlYWRVbmlxdWVJZGVudGlmaWVyKGJ1Ziwgb2Zmc2V0LCBvcHRpb25zKTtcblxuICAgIGNhc2UgJ0JpdCc6XG4gICAgICByZXR1cm4gcmVhZEJpdChidWYsIG9mZnNldCk7XG5cbiAgICBjYXNlICdUaW55SW50JzpcbiAgICAgIHJldHVybiByZWFkVGlueUludChidWYsIG9mZnNldCk7XG5cbiAgICBjYXNlICdTbWFsbEludCc6XG4gICAgICByZXR1cm4gcmVhZFNtYWxsSW50KGJ1Ziwgb2Zmc2V0KTtcblxuICAgIGNhc2UgJ0ludCc6XG4gICAgICByZXR1cm4gcmVhZEludChidWYsIG9mZnNldCk7XG5cbiAgICBjYXNlICdCaWdJbnQnOlxuICAgICAgcmV0dXJuIHJlYWRCaWdJbnQoYnVmLCBvZmZzZXQpO1xuXG4gICAgY2FzZSAnU21hbGxEYXRlVGltZSc6XG4gICAgICByZXR1cm4gcmVhZFNtYWxsRGF0ZVRpbWUoYnVmLCBvZmZzZXQsIG9wdGlvbnMudXNlVVRDKTtcblxuICAgIGNhc2UgJ0RhdGVUaW1lJzpcbiAgICAgIHJldHVybiByZWFkRGF0ZVRpbWUoYnVmLCBvZmZzZXQsIG9wdGlvbnMudXNlVVRDKTtcblxuICAgIGNhc2UgJ1JlYWwnOlxuICAgICAgcmV0dXJuIHJlYWRSZWFsKGJ1Ziwgb2Zmc2V0KTtcblxuICAgIGNhc2UgJ0Zsb2F0JzpcbiAgICAgIHJldHVybiByZWFkRmxvYXQoYnVmLCBvZmZzZXQpO1xuXG4gICAgY2FzZSAnU21hbGxNb25leSc6XG4gICAgICByZXR1cm4gcmVhZFNtYWxsTW9uZXkoYnVmLCBvZmZzZXQpO1xuXG4gICAgY2FzZSAnTW9uZXknOlxuICAgICAgcmV0dXJuIHJlYWRNb25leShidWYsIG9mZnNldCk7XG5cbiAgICBjYXNlICdEYXRlJzpcbiAgICAgIHJldHVybiByZWFkRGF0ZShidWYsIG9mZnNldCwgb3B0aW9ucy51c2VVVEMpO1xuXG4gICAgY2FzZSAnVGltZSc6IHtcbiAgICAgIGxldCBzY2FsZTtcbiAgICAgICh7IHZhbHVlOiBzY2FsZSwgb2Zmc2V0IH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgcmV0dXJuIHJlYWRUaW1lKGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoLCBzY2FsZSwgb3B0aW9ucy51c2VVVEMpO1xuICAgIH1cblxuICAgIGNhc2UgJ0RhdGVUaW1lMic6IHtcbiAgICAgIGxldCBzY2FsZTtcbiAgICAgICh7IHZhbHVlOiBzY2FsZSwgb2Zmc2V0IH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgcmV0dXJuIHJlYWREYXRlVGltZTIoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgsIHNjYWxlLCBvcHRpb25zLnVzZVVUQyk7XG4gICAgfVxuXG4gICAgY2FzZSAnRGF0ZVRpbWVPZmZzZXQnOiB7XG4gICAgICBsZXQgc2NhbGU7XG4gICAgICAoeyB2YWx1ZTogc2NhbGUsIG9mZnNldCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHJldHVybiByZWFkRGF0ZVRpbWVPZmZzZXQoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgsIHNjYWxlKTtcbiAgICB9XG5cbiAgICBjYXNlICdWYXJCaW5hcnknOlxuICAgIGNhc2UgJ0JpbmFyeSc6IHtcbiAgICAgIC8vIG1heExlbmd0aCAodW51c2VkPylcbiAgICAgICh7IG9mZnNldCB9ID0gcmVhZFVJbnQxNkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHJldHVybiByZWFkQmluYXJ5KGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoKTtcbiAgICB9XG5cbiAgICBjYXNlICdOdW1lcmljTic6XG4gICAgY2FzZSAnRGVjaW1hbE4nOiB7XG4gICAgICBsZXQgcHJlY2lzaW9uO1xuICAgICAgKHsgdmFsdWU6IHByZWNpc2lvbiwgb2Zmc2V0IH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgbGV0IHNjYWxlO1xuICAgICAgKHsgdmFsdWU6IHNjYWxlLCBvZmZzZXQgfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICByZXR1cm4gcmVhZE51bWVyaWMoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgsIHByZWNpc2lvbiwgc2NhbGUpO1xuICAgIH1cblxuICAgIGNhc2UgJ1ZhckNoYXInOlxuICAgIGNhc2UgJ0NoYXInOiB7XG4gICAgICAvLyBtYXhMZW5ndGggKHVudXNlZD8pXG4gICAgICAoeyBvZmZzZXQgfSA9IHJlYWRVSW50MTZMRShidWYsIG9mZnNldCkpO1xuXG4gICAgICBsZXQgY29sbGF0aW9uO1xuICAgICAgKHsgdmFsdWU6IGNvbGxhdGlvbiwgb2Zmc2V0IH0gPSByZWFkQ29sbGF0aW9uKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHJldHVybiByZWFkQ2hhcnMoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgsIGNvbGxhdGlvbi5jb2RlcGFnZSEpO1xuICAgIH1cblxuICAgIGNhc2UgJ05WYXJDaGFyJzpcbiAgICBjYXNlICdOQ2hhcic6IHtcbiAgICAgIC8vIG1heExlbmd0aCAodW51c2VkPylcbiAgICAgICh7IG9mZnNldCB9ID0gcmVhZFVJbnQxNkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIC8vIGNvbGxhdGlvbiAodW51c2VkPylcbiAgICAgICh7IG9mZnNldCB9ID0gcmVhZENvbGxhdGlvbihidWYsIG9mZnNldCkpO1xuXG4gICAgICByZXR1cm4gcmVhZE5DaGFycyhidWYsIG9mZnNldCwgZGF0YUxlbmd0aCk7XG4gICAgfVxuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0eXBlIScpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRCaW5hcnkoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCBkYXRhTGVuZ3RoOiBudW1iZXIpOiBSZXN1bHQ8QnVmZmVyPiB7XG4gIGlmIChidWYubGVuZ3RoIDwgb2Zmc2V0ICsgZGF0YUxlbmd0aCkge1xuICAgIHRocm93IG5ldyBOb3RFbm91Z2hEYXRhRXJyb3Iob2Zmc2V0ICsgZGF0YUxlbmd0aCk7XG4gIH1cblxuICByZXR1cm4gbmV3IFJlc3VsdChidWYuc2xpY2Uob2Zmc2V0LCBvZmZzZXQgKyBkYXRhTGVuZ3RoKSwgb2Zmc2V0ICsgZGF0YUxlbmd0aCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRDaGFycyhidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIsIGRhdGFMZW5ndGg6IG51bWJlciwgY29kZXBhZ2U6IHN0cmluZyk6IFJlc3VsdDxzdHJpbmc+IHtcbiAgaWYgKGJ1Zi5sZW5ndGggPCBvZmZzZXQgKyBkYXRhTGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IE5vdEVub3VnaERhdGFFcnJvcihvZmZzZXQgKyBkYXRhTGVuZ3RoKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUmVzdWx0KGljb252LmRlY29kZShidWYuc2xpY2Uob2Zmc2V0LCBvZmZzZXQgKyBkYXRhTGVuZ3RoKSwgY29kZXBhZ2UgPz8gREVGQVVMVF9FTkNPRElORyksIG9mZnNldCArIGRhdGFMZW5ndGgpO1xufVxuXG5mdW5jdGlvbiByZWFkTkNoYXJzKGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlciwgZGF0YUxlbmd0aDogbnVtYmVyKTogUmVzdWx0PHN0cmluZz4ge1xuICBpZiAoYnVmLmxlbmd0aCA8IG9mZnNldCArIGRhdGFMZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgTm90RW5vdWdoRGF0YUVycm9yKG9mZnNldCArIGRhdGFMZW5ndGgpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQoYnVmLnRvU3RyaW5nKCd1Y3MyJywgb2Zmc2V0LCBvZmZzZXQgKyBkYXRhTGVuZ3RoKSwgb2Zmc2V0ICsgZGF0YUxlbmd0aCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlYWRQTFBTdHJlYW0ocGFyc2VyOiBQYXJzZXIpOiBQcm9taXNlPG51bGwgfCBCdWZmZXJbXT4ge1xuICB3aGlsZSAocGFyc2VyLmJ1ZmZlci5sZW5ndGggPCBwYXJzZXIucG9zaXRpb24gKyA4KSB7XG4gICAgYXdhaXQgcGFyc2VyLndhaXRGb3JDaHVuaygpO1xuICB9XG5cbiAgY29uc3QgZXhwZWN0ZWRMZW5ndGggPSBwYXJzZXIuYnVmZmVyLnJlYWRCaWdVSW50NjRMRShwYXJzZXIucG9zaXRpb24pO1xuICBwYXJzZXIucG9zaXRpb24gKz0gODtcblxuICBpZiAoZXhwZWN0ZWRMZW5ndGggPT09IFBMUF9OVUxMKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XG4gIGxldCBjdXJyZW50TGVuZ3RoID0gMDtcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHdoaWxlIChwYXJzZXIuYnVmZmVyLmxlbmd0aCA8IHBhcnNlci5wb3NpdGlvbiArIDQpIHtcbiAgICAgIGF3YWl0IHBhcnNlci53YWl0Rm9yQ2h1bmsoKTtcbiAgICB9XG5cbiAgICBjb25zdCBjaHVua0xlbmd0aCA9IHBhcnNlci5idWZmZXIucmVhZFVJbnQzMkxFKHBhcnNlci5wb3NpdGlvbik7XG4gICAgcGFyc2VyLnBvc2l0aW9uICs9IDQ7XG5cbiAgICBpZiAoIWNodW5rTGVuZ3RoKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICB3aGlsZSAocGFyc2VyLmJ1ZmZlci5sZW5ndGggPCBwYXJzZXIucG9zaXRpb24gKyBjaHVua0xlbmd0aCkge1xuICAgICAgYXdhaXQgcGFyc2VyLndhaXRGb3JDaHVuaygpO1xuICAgIH1cblxuICAgIGNodW5rcy5wdXNoKHBhcnNlci5idWZmZXIuc2xpY2UocGFyc2VyLnBvc2l0aW9uLCBwYXJzZXIucG9zaXRpb24gKyBjaHVua0xlbmd0aCkpO1xuICAgIHBhcnNlci5wb3NpdGlvbiArPSBjaHVua0xlbmd0aDtcbiAgICBjdXJyZW50TGVuZ3RoICs9IGNodW5rTGVuZ3RoO1xuICB9XG5cbiAgaWYgKGV4cGVjdGVkTGVuZ3RoICE9PSBVTktOT1dOX1BMUF9MRU4pIHtcbiAgICBpZiAoY3VycmVudExlbmd0aCAhPT0gTnVtYmVyKGV4cGVjdGVkTGVuZ3RoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdQYXJ0aWFsbHkgTGVuZ3RoLXByZWZpeGVkIEJ5dGVzIHVubWF0Y2hlZCBsZW5ndGhzIDogZXhwZWN0ZWQgJyArIGV4cGVjdGVkTGVuZ3RoICsgJywgYnV0IGdvdCAnICsgY3VycmVudExlbmd0aCArICcgYnl0ZXMnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY2h1bmtzO1xufVxuXG5mdW5jdGlvbiByZWFkU21hbGxEYXRlVGltZShidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIsIHVzZVVUQzogYm9vbGVhbik6IFJlc3VsdDxEYXRlPiB7XG4gIGxldCBkYXlzO1xuICAoeyBvZmZzZXQsIHZhbHVlOiBkYXlzIH0gPSByZWFkVUludDE2TEUoYnVmLCBvZmZzZXQpKTtcblxuICBsZXQgbWludXRlcztcbiAgKHsgb2Zmc2V0LCB2YWx1ZTogbWludXRlcyB9ID0gcmVhZFVJbnQxNkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgbGV0IHZhbHVlO1xuICBpZiAodXNlVVRDKSB7XG4gICAgdmFsdWUgPSBuZXcgRGF0ZShEYXRlLlVUQygxOTAwLCAwLCAxICsgZGF5cywgMCwgbWludXRlcykpO1xuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gbmV3IERhdGUoMTkwMCwgMCwgMSArIGRheXMsIDAsIG1pbnV0ZXMpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQodmFsdWUsIG9mZnNldCk7XG59XG5cbmZ1bmN0aW9uIHJlYWREYXRlVGltZShidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIsIHVzZVVUQzogYm9vbGVhbik6IFJlc3VsdDxEYXRlPiB7XG4gIGxldCBkYXlzO1xuICAoeyBvZmZzZXQsIHZhbHVlOiBkYXlzIH0gPSByZWFkSW50MzJMRShidWYsIG9mZnNldCkpO1xuXG4gIGxldCB0aHJlZUh1bmRyZWR0aHNPZlNlY29uZDtcbiAgKHsgb2Zmc2V0LCB2YWx1ZTogdGhyZWVIdW5kcmVkdGhzT2ZTZWNvbmQgfSA9IHJlYWRJbnQzMkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgY29uc3QgbWlsbGlzZWNvbmRzID0gTWF0aC5yb3VuZCh0aHJlZUh1bmRyZWR0aHNPZlNlY29uZCAqIFRIUkVFX0FORF9BX1RISVJEKTtcblxuICBsZXQgdmFsdWU7XG4gIGlmICh1c2VVVEMpIHtcbiAgICB2YWx1ZSA9IG5ldyBEYXRlKERhdGUuVVRDKDE5MDAsIDAsIDEgKyBkYXlzLCAwLCAwLCAwLCBtaWxsaXNlY29uZHMpKTtcbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IG5ldyBEYXRlKDE5MDAsIDAsIDEgKyBkYXlzLCAwLCAwLCAwLCBtaWxsaXNlY29uZHMpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQodmFsdWUsIG9mZnNldCk7XG59XG5cbmludGVyZmFjZSBEYXRlV2l0aE5hbm9zZWNvbmRzRGVsdGEgZXh0ZW5kcyBEYXRlIHtcbiAgbmFub3NlY29uZHNEZWx0YTogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiByZWFkVGltZShidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIsIGRhdGFMZW5ndGg6IG51bWJlciwgc2NhbGU6IG51bWJlciwgdXNlVVRDOiBib29sZWFuKTogUmVzdWx0PERhdGVXaXRoTmFub3NlY29uZHNEZWx0YT4ge1xuICBsZXQgdmFsdWU7XG5cbiAgc3dpdGNoIChkYXRhTGVuZ3RoKSB7XG4gICAgY2FzZSAzOiB7XG4gICAgICAoeyB2YWx1ZSwgb2Zmc2V0IH0gPSByZWFkVUludDI0TEUoYnVmLCBvZmZzZXQpKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNhc2UgNDoge1xuICAgICAgKHsgdmFsdWUsIG9mZnNldCB9ID0gcmVhZFVJbnQzMkxFKGJ1Ziwgb2Zmc2V0KSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjYXNlIDU6IHtcbiAgICAgICh7IHZhbHVlLCBvZmZzZXQgfSA9IHJlYWRVSW50NDBMRShidWYsIG9mZnNldCkpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgZGVmYXVsdDoge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnJlYWNoYWJsZScpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzY2FsZSA8IDcpIHtcbiAgICBmb3IgKGxldCBpID0gc2NhbGU7IGkgPCA3OyBpKyspIHtcbiAgICAgIHZhbHVlICo9IDEwO1xuICAgIH1cbiAgfVxuXG4gIGxldCBkYXRlO1xuICBpZiAodXNlVVRDKSB7XG4gICAgZGF0ZSA9IG5ldyBEYXRlKERhdGUuVVRDKDE5NzAsIDAsIDEsIDAsIDAsIDAsIHZhbHVlIC8gMTAwMDApKSBhcyBEYXRlV2l0aE5hbm9zZWNvbmRzRGVsdGE7XG4gIH0gZWxzZSB7XG4gICAgZGF0ZSA9IG5ldyBEYXRlKDE5NzAsIDAsIDEsIDAsIDAsIDAsIHZhbHVlIC8gMTAwMDApIGFzIERhdGVXaXRoTmFub3NlY29uZHNEZWx0YTtcbiAgfVxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZGF0ZSwgJ25hbm9zZWNvbmRzRGVsdGEnLCB7XG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgdmFsdWU6ICh2YWx1ZSAlIDEwMDAwKSAvIE1hdGgucG93KDEwLCA3KVxuICB9KTtcblxuICByZXR1cm4gbmV3IFJlc3VsdChkYXRlLCBvZmZzZXQpO1xufVxuXG5mdW5jdGlvbiByZWFkRGF0ZShidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIsIHVzZVVUQzogYm9vbGVhbik6IFJlc3VsdDxEYXRlPiB7XG4gIGxldCBkYXlzO1xuICAoeyBvZmZzZXQsIHZhbHVlOiBkYXlzIH0gPSByZWFkVUludDI0TEUoYnVmLCBvZmZzZXQpKTtcblxuICBpZiAodXNlVVRDKSB7XG4gICAgcmV0dXJuIG5ldyBSZXN1bHQobmV3IERhdGUoRGF0ZS5VVEMoMjAwMCwgMCwgZGF5cyAtIDczMDExOCkpLCBvZmZzZXQpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgUmVzdWx0KG5ldyBEYXRlKDIwMDAsIDAsIGRheXMgLSA3MzAxMTgpLCBvZmZzZXQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWREYXRlVGltZTIoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCBkYXRhTGVuZ3RoOiBudW1iZXIsIHNjYWxlOiBudW1iZXIsIHVzZVVUQzogYm9vbGVhbik6IFJlc3VsdDxEYXRlV2l0aE5hbm9zZWNvbmRzRGVsdGE+IHtcbiAgbGV0IHRpbWU7XG4gICh7IG9mZnNldCwgdmFsdWU6IHRpbWUgfSA9IHJlYWRUaW1lKGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoIC0gMywgc2NhbGUsIHVzZVVUQykpO1xuXG4gIGxldCBkYXlzO1xuICAoeyBvZmZzZXQsIHZhbHVlOiBkYXlzIH0gPSByZWFkVUludDI0TEUoYnVmLCBvZmZzZXQpKTtcblxuICBsZXQgZGF0ZTtcbiAgaWYgKHVzZVVUQykge1xuICAgIGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQygyMDAwLCAwLCBkYXlzIC0gNzMwMTE4LCAwLCAwLCAwLCArdGltZSkpIGFzIERhdGVXaXRoTmFub3NlY29uZHNEZWx0YTtcbiAgfSBlbHNlIHtcbiAgICBkYXRlID0gbmV3IERhdGUoMjAwMCwgMCwgZGF5cyAtIDczMDExOCwgdGltZS5nZXRIb3VycygpLCB0aW1lLmdldE1pbnV0ZXMoKSwgdGltZS5nZXRTZWNvbmRzKCksIHRpbWUuZ2V0TWlsbGlzZWNvbmRzKCkpIGFzIERhdGVXaXRoTmFub3NlY29uZHNEZWx0YTtcbiAgfVxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZGF0ZSwgJ25hbm9zZWNvbmRzRGVsdGEnLCB7XG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgdmFsdWU6IHRpbWUubmFub3NlY29uZHNEZWx0YVxuICB9KTtcblxuICByZXR1cm4gbmV3IFJlc3VsdChkYXRlLCBvZmZzZXQpO1xufVxuXG5mdW5jdGlvbiByZWFkRGF0ZVRpbWVPZmZzZXQoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCBkYXRhTGVuZ3RoOiBudW1iZXIsIHNjYWxlOiBudW1iZXIpOiBSZXN1bHQ8RGF0ZVdpdGhOYW5vc2Vjb25kc0RlbHRhPiB7XG4gIGxldCB0aW1lO1xuICAoeyBvZmZzZXQsIHZhbHVlOiB0aW1lIH0gPSByZWFkVGltZShidWYsIG9mZnNldCwgZGF0YUxlbmd0aCAtIDUsIHNjYWxlLCB0cnVlKSk7XG5cbiAgbGV0IGRheXM7XG4gICh7IG9mZnNldCwgdmFsdWU6IGRheXMgfSA9IHJlYWRVSW50MjRMRShidWYsIG9mZnNldCkpO1xuXG4gIC8vIHRpbWUgb2Zmc2V0P1xuICAoeyBvZmZzZXQgfSA9IHJlYWRVSW50MTZMRShidWYsIG9mZnNldCkpO1xuXG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQygyMDAwLCAwLCBkYXlzIC0gNzMwMTE4LCAwLCAwLCAwLCArdGltZSkpIGFzIERhdGVXaXRoTmFub3NlY29uZHNEZWx0YTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRhdGUsICduYW5vc2Vjb25kc0RlbHRhJywge1xuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHZhbHVlOiB0aW1lLm5hbm9zZWNvbmRzRGVsdGFcbiAgfSk7XG4gIHJldHVybiBuZXcgUmVzdWx0KGRhdGUsIG9mZnNldCk7XG59XG5cbm1vZHVsZS5leHBvcnRzLnJlYWRWYWx1ZSA9IHJlYWRWYWx1ZTtcbm1vZHVsZS5leHBvcnRzLmlzUExQU3RyZWFtID0gaXNQTFBTdHJlYW07XG5tb2R1bGUuZXhwb3J0cy5yZWFkUExQU3RyZWFtID0gcmVhZFBMUFN0cmVhbTtcblxuZXhwb3J0IHsgcmVhZFZhbHVlLCBpc1BMUFN0cmVhbSwgcmVhZFBMUFN0cmVhbSB9O1xuIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUNBLElBQUFBLGVBQUEsR0FBQUMsT0FBQTtBQUNB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