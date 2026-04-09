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
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfbWV0YWRhdGFQYXJzZXIiLCJyZXF1aXJlIiwiX2RhdGFUeXBlIiwiX2ljb252TGl0ZSIsIl9pbnRlcm9wUmVxdWlyZURlZmF1bHQiLCJfc3ByaW50ZkpzIiwiX2d1aWRQYXJzZXIiLCJfaGVscGVycyIsImUiLCJfX2VzTW9kdWxlIiwiZGVmYXVsdCIsIk5VTEwiLCJNQVgiLCJUSFJFRV9BTkRfQV9USElSRCIsIk1PTkVZX0RJVklTT1IiLCJQTFBfTlVMTCIsIlVOS05PV05fUExQX0xFTiIsIkRFRkFVTFRfRU5DT0RJTkciLCJyZWFkVGlueUludCIsImJ1ZiIsIm9mZnNldCIsInJlYWRVSW50OCIsInJlYWRTbWFsbEludCIsInJlYWRJbnQxNkxFIiwicmVhZEludCIsInJlYWRJbnQzMkxFIiwicmVhZEJpZ0ludCIsInZhbHVlIiwicmVhZEJpZ0ludDY0TEUiLCJSZXN1bHQiLCJ0b1N0cmluZyIsInJlYWRSZWFsIiwicmVhZEZsb2F0TEUiLCJyZWFkRmxvYXQiLCJyZWFkRG91YmxlTEUiLCJyZWFkU21hbGxNb25leSIsInJlYWRNb25leSIsImhpZ2giLCJsb3ciLCJyZWFkVUludDMyTEUiLCJyZWFkQml0IiwicmVhZFZhbHVlIiwibWV0YWRhdGEiLCJvcHRpb25zIiwidHlwZSIsIm5hbWUiLCJkYXRhTGVuZ3RoIiwiRXJyb3IiLCJjb2RlcGFnZSIsImNvbGxhdGlvbiIsInJlYWRVSW50MTZMRSIsInJlYWRDaGFycyIsInJlYWROQ2hhcnMiLCJyZWFkQmluYXJ5IiwidGV4dFBvaW50ZXJMZW5ndGgiLCJyZWFkU21hbGxEYXRlVGltZSIsInVzZVVUQyIsInJlYWREYXRlVGltZSIsInJlYWRUaW1lIiwic2NhbGUiLCJyZWFkRGF0ZSIsInJlYWREYXRlVGltZTIiLCJyZWFkRGF0ZVRpbWVPZmZzZXQiLCJyZWFkTnVtZXJpYyIsInByZWNpc2lvbiIsInJlYWRVbmlxdWVJZGVudGlmaWVyIiwic3ByaW50ZiIsInJlYWRWYXJpYW50IiwiaXNQTFBTdHJlYW0iLCJkYXRhIiwibG93ZXJDYXNlR3VpZHMiLCJidWZmZXJUb0xvd2VyQ2FzZUd1aWQiLCJidWZmZXJUb1VwcGVyQ2FzZUd1aWQiLCJfcHJlY2lzaW9uIiwic2lnbiIsInJlYWRVTnVtZXJpYzY0TEUiLCJyZWFkVU51bWVyaWM5NkxFIiwicmVhZFVOdW1lcmljMTI4TEUiLCJNYXRoIiwicG93IiwiYmFzZVR5cGUiLCJUWVBFIiwicHJvcEJ5dGVzIiwicmVhZENvbGxhdGlvbiIsImxlbmd0aCIsIk5vdEVub3VnaERhdGFFcnJvciIsInNsaWNlIiwiaWNvbnYiLCJkZWNvZGUiLCJyZWFkUExQU3RyZWFtIiwicGFyc2VyIiwiYnVmZmVyIiwicG9zaXRpb24iLCJ3YWl0Rm9yQ2h1bmsiLCJleHBlY3RlZExlbmd0aCIsInJlYWRCaWdVSW50NjRMRSIsImNodW5rcyIsImN1cnJlbnRMZW5ndGgiLCJjaHVua0xlbmd0aCIsInB1c2giLCJOdW1iZXIiLCJkYXlzIiwibWludXRlcyIsIkRhdGUiLCJVVEMiLCJ0aHJlZUh1bmRyZWR0aHNPZlNlY29uZCIsIm1pbGxpc2Vjb25kcyIsInJvdW5kIiwicmVhZFVJbnQyNExFIiwicmVhZFVJbnQ0MExFIiwiaSIsImRhdGUiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImVudW1lcmFibGUiLCJ0aW1lIiwiZ2V0SG91cnMiLCJnZXRNaW51dGVzIiwiZ2V0U2Vjb25kcyIsImdldE1pbGxpc2Vjb25kcyIsIm5hbm9zZWNvbmRzRGVsdGEiLCJtb2R1bGUiLCJleHBvcnRzIl0sInNvdXJjZXMiOlsiLi4vc3JjL3ZhbHVlLXBhcnNlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGFyc2VyLCB7IHR5cGUgUGFyc2VyT3B0aW9ucyB9IGZyb20gJy4vdG9rZW4vc3RyZWFtLXBhcnNlcic7XG5pbXBvcnQgeyB0eXBlIE1ldGFkYXRhLCByZWFkQ29sbGF0aW9uIH0gZnJvbSAnLi9tZXRhZGF0YS1wYXJzZXInO1xuaW1wb3J0IHsgVFlQRSB9IGZyb20gJy4vZGF0YS10eXBlJztcblxuaW1wb3J0IGljb252IGZyb20gJ2ljb252LWxpdGUnO1xuaW1wb3J0IHsgc3ByaW50ZiB9IGZyb20gJ3NwcmludGYtanMnO1xuaW1wb3J0IHsgYnVmZmVyVG9Mb3dlckNhc2VHdWlkLCBidWZmZXJUb1VwcGVyQ2FzZUd1aWQgfSBmcm9tICcuL2d1aWQtcGFyc2VyJztcbmltcG9ydCB7IE5vdEVub3VnaERhdGFFcnJvciwgUmVzdWx0LCByZWFkQmlnSW50NjRMRSwgcmVhZERvdWJsZUxFLCByZWFkRmxvYXRMRSwgcmVhZEludDE2TEUsIHJlYWRJbnQzMkxFLCByZWFkVUludDE2TEUsIHJlYWRVSW50MzJMRSwgcmVhZFVJbnQ4LCByZWFkVUludDI0TEUsIHJlYWRVSW50NDBMRSwgcmVhZFVOdW1lcmljNjRMRSwgcmVhZFVOdW1lcmljOTZMRSwgcmVhZFVOdW1lcmljMTI4TEUgfSBmcm9tICcuL3Rva2VuL2hlbHBlcnMnO1xuXG5jb25zdCBOVUxMID0gKDEgPDwgMTYpIC0gMTtcbmNvbnN0IE1BWCA9ICgxIDw8IDE2KSAtIDE7XG5jb25zdCBUSFJFRV9BTkRfQV9USElSRCA9IDMgKyAoMSAvIDMpO1xuY29uc3QgTU9ORVlfRElWSVNPUiA9IDEwMDAwO1xuY29uc3QgUExQX05VTEwgPSAweEZGRkZGRkZGRkZGRkZGRkZuO1xuY29uc3QgVU5LTk9XTl9QTFBfTEVOID0gMHhGRkZGRkZGRkZGRkZGRkZFbjtcbmNvbnN0IERFRkFVTFRfRU5DT0RJTkcgPSAndXRmOCc7XG5cbmZ1bmN0aW9uIHJlYWRUaW55SW50KGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlcik6IFJlc3VsdDxudW1iZXI+IHtcbiAgcmV0dXJuIHJlYWRVSW50OChidWYsIG9mZnNldCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRTbWFsbEludChidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIpOiBSZXN1bHQ8bnVtYmVyPiB7XG4gIHJldHVybiByZWFkSW50MTZMRShidWYsIG9mZnNldCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRJbnQoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyKTogUmVzdWx0PG51bWJlcj4ge1xuICByZXR1cm4gcmVhZEludDMyTEUoYnVmLCBvZmZzZXQpO1xufVxuXG5mdW5jdGlvbiByZWFkQmlnSW50KGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlcik6IFJlc3VsdDxzdHJpbmc+IHtcbiAgbGV0IHZhbHVlO1xuICAoeyBvZmZzZXQsIHZhbHVlIH0gPSByZWFkQmlnSW50NjRMRShidWYsIG9mZnNldCkpO1xuXG4gIHJldHVybiBuZXcgUmVzdWx0KHZhbHVlLnRvU3RyaW5nKCksIG9mZnNldCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRSZWFsKGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlcik6IFJlc3VsdDxudW1iZXI+IHtcbiAgcmV0dXJuIHJlYWRGbG9hdExFKGJ1Ziwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZEZsb2F0KGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlcik6IFJlc3VsdDxudW1iZXI+IHtcbiAgcmV0dXJuIHJlYWREb3VibGVMRShidWYsIG9mZnNldCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRTbWFsbE1vbmV5KGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlcik6IFJlc3VsdDxudW1iZXI+IHtcbiAgbGV0IHZhbHVlO1xuICAoeyBvZmZzZXQsIHZhbHVlIH0gPSByZWFkSW50MzJMRShidWYsIG9mZnNldCkpO1xuXG4gIHJldHVybiBuZXcgUmVzdWx0KHZhbHVlIC8gTU9ORVlfRElWSVNPUiwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZE1vbmV5KGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlcik6IFJlc3VsdDxudW1iZXI+IHtcbiAgbGV0IGhpZ2g7XG4gICh7IG9mZnNldCwgdmFsdWU6IGhpZ2ggfSA9IHJlYWRJbnQzMkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgbGV0IGxvdztcbiAgKHsgb2Zmc2V0LCB2YWx1ZTogbG93IH0gPSByZWFkVUludDMyTEUoYnVmLCBvZmZzZXQpKTtcblxuICByZXR1cm4gbmV3IFJlc3VsdCgobG93ICsgKDB4MTAwMDAwMDAwICogaGlnaCkpIC8gTU9ORVlfRElWSVNPUiwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZEJpdChidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIpOiBSZXN1bHQ8Ym9vbGVhbj4ge1xuICBsZXQgdmFsdWU7XG4gICh7IG9mZnNldCwgdmFsdWUgfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gIHJldHVybiBuZXcgUmVzdWx0KCEhdmFsdWUsIG9mZnNldCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRWYWx1ZShidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIsIG1ldGFkYXRhOiBNZXRhZGF0YSwgb3B0aW9uczogUGFyc2VyT3B0aW9ucyk6IFJlc3VsdDx1bmtub3duPiB7XG4gIGNvbnN0IHR5cGUgPSBtZXRhZGF0YS50eXBlO1xuXG4gIHN3aXRjaCAodHlwZS5uYW1lKSB7XG4gICAgY2FzZSAnTnVsbCc6XG4gICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuXG4gICAgY2FzZSAnVGlueUludCc6IHtcbiAgICAgIHJldHVybiByZWFkVGlueUludChidWYsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgY2FzZSAnU21hbGxJbnQnOiB7XG4gICAgICByZXR1cm4gcmVhZFNtYWxsSW50KGJ1Ziwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICBjYXNlICdJbnQnOiB7XG4gICAgICByZXR1cm4gcmVhZEludChidWYsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgY2FzZSAnQmlnSW50Jzoge1xuICAgICAgcmV0dXJuIHJlYWRCaWdJbnQoYnVmLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIGNhc2UgJ0ludE4nOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBzd2l0Y2ggKGRhdGFMZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG5cbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIHJldHVybiByZWFkVGlueUludChidWYsIG9mZnNldCk7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICByZXR1cm4gcmVhZFNtYWxsSW50KGJ1Ziwgb2Zmc2V0KTtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHJldHVybiByZWFkSW50KGJ1Ziwgb2Zmc2V0KTtcbiAgICAgICAgY2FzZSA4OlxuICAgICAgICAgIHJldHVybiByZWFkQmlnSW50KGJ1Ziwgb2Zmc2V0KTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgZGF0YUxlbmd0aCAnICsgZGF0YUxlbmd0aCArICcgZm9yIEludE4nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjYXNlICdSZWFsJzoge1xuICAgICAgcmV0dXJuIHJlYWRSZWFsKGJ1Ziwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICBjYXNlICdGbG9hdCc6IHtcbiAgICAgIHJldHVybiByZWFkRmxvYXQoYnVmLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIGNhc2UgJ0Zsb2F0Tic6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHN3aXRjaCAoZGF0YUxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZXN1bHQobnVsbCwgb2Zmc2V0KTtcblxuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgcmV0dXJuIHJlYWRSZWFsKGJ1Ziwgb2Zmc2V0KTtcbiAgICAgICAgY2FzZSA4OlxuICAgICAgICAgIHJldHVybiByZWFkRmxvYXQoYnVmLCBvZmZzZXQpO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnN1cHBvcnRlZCBkYXRhTGVuZ3RoICcgKyBkYXRhTGVuZ3RoICsgJyBmb3IgRmxvYXROJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FzZSAnU21hbGxNb25leSc6IHtcbiAgICAgIHJldHVybiByZWFkU21hbGxNb25leShidWYsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgY2FzZSAnTW9uZXknOlxuICAgICAgcmV0dXJuIHJlYWRNb25leShidWYsIG9mZnNldCk7XG5cbiAgICBjYXNlICdNb25leU4nOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBzd2l0Y2ggKGRhdGFMZW5ndGgpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG5cbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHJldHVybiByZWFkU21hbGxNb25leShidWYsIG9mZnNldCk7XG4gICAgICAgIGNhc2UgODpcbiAgICAgICAgICByZXR1cm4gcmVhZE1vbmV5KGJ1Ziwgb2Zmc2V0KTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgZGF0YUxlbmd0aCAnICsgZGF0YUxlbmd0aCArICcgZm9yIE1vbmV5TicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhc2UgJ0JpdCc6IHtcbiAgICAgIHJldHVybiByZWFkQml0KGJ1Ziwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICBjYXNlICdCaXROJzoge1xuICAgICAgbGV0IGRhdGFMZW5ndGg7XG4gICAgICAoeyBvZmZzZXQsIHZhbHVlOiBkYXRhTGVuZ3RoIH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgc3dpdGNoIChkYXRhTGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuXG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICByZXR1cm4gcmVhZEJpdChidWYsIG9mZnNldCk7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIGRhdGFMZW5ndGggJyArIGRhdGFMZW5ndGggKyAnIGZvciBCaXROJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FzZSAnVmFyQ2hhcic6XG4gICAgY2FzZSAnQ2hhcic6IHtcbiAgICAgIGNvbnN0IGNvZGVwYWdlID0gbWV0YWRhdGEuY29sbGF0aW9uIS5jb2RlcGFnZSE7XG5cbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQxNkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIGlmIChkYXRhTGVuZ3RoID09PSBOVUxMKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWFkQ2hhcnMoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgsIGNvZGVwYWdlKTtcbiAgICB9XG5cbiAgICBjYXNlICdOVmFyQ2hhcic6XG4gICAgY2FzZSAnTkNoYXInOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50MTZMRShidWYsIG9mZnNldCkpO1xuXG4gICAgICBpZiAoZGF0YUxlbmd0aCA9PT0gTlVMTCkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVhZE5DaGFycyhidWYsIG9mZnNldCwgZGF0YUxlbmd0aCk7XG4gICAgfVxuXG4gICAgY2FzZSAnVmFyQmluYXJ5JzpcbiAgICBjYXNlICdCaW5hcnknOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50MTZMRShidWYsIG9mZnNldCkpO1xuXG4gICAgICBpZiAoZGF0YUxlbmd0aCA9PT0gTlVMTCkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVhZEJpbmFyeShidWYsIG9mZnNldCwgZGF0YUxlbmd0aCk7XG4gICAgfVxuXG4gICAgY2FzZSAnVGV4dCc6IHtcbiAgICAgIGxldCB0ZXh0UG9pbnRlckxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IHRleHRQb2ludGVyTGVuZ3RoIH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgaWYgKHRleHRQb2ludGVyTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRleHRwb2ludGVyXG4gICAgICAoeyBvZmZzZXQgfSA9IHJlYWRCaW5hcnkoYnVmLCBvZmZzZXQsIHRleHRQb2ludGVyTGVuZ3RoKSk7XG5cbiAgICAgIC8vIFRpbWVzdGFtcFxuICAgICAgKHsgb2Zmc2V0IH0gPSByZWFkQmluYXJ5KGJ1Ziwgb2Zmc2V0LCA4KSk7XG5cbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQzMkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHJldHVybiByZWFkQ2hhcnMoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgsIG1ldGFkYXRhLmNvbGxhdGlvbiEuY29kZXBhZ2UhKTtcbiAgICB9XG5cbiAgICBjYXNlICdOVGV4dCc6IHtcbiAgICAgIGxldCB0ZXh0UG9pbnRlckxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IHRleHRQb2ludGVyTGVuZ3RoIH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgaWYgKHRleHRQb2ludGVyTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRleHRwb2ludGVyXG4gICAgICAoeyBvZmZzZXQgfSA9IHJlYWRCaW5hcnkoYnVmLCBvZmZzZXQsIHRleHRQb2ludGVyTGVuZ3RoKSk7XG5cbiAgICAgIC8vIFRpbWVzdGFtcFxuICAgICAgKHsgb2Zmc2V0IH0gPSByZWFkQmluYXJ5KGJ1Ziwgb2Zmc2V0LCA4KSk7XG5cbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQzMkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHJldHVybiByZWFkTkNoYXJzKGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoKTtcbiAgICB9XG5cbiAgICBjYXNlICdJbWFnZSc6IHtcbiAgICAgIGxldCB0ZXh0UG9pbnRlckxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IHRleHRQb2ludGVyTGVuZ3RoIH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgaWYgKHRleHRQb2ludGVyTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRleHRwb2ludGVyXG4gICAgICAoeyBvZmZzZXQgfSA9IHJlYWRCaW5hcnkoYnVmLCBvZmZzZXQsIHRleHRQb2ludGVyTGVuZ3RoKSk7XG5cbiAgICAgIC8vIFRpbWVzdGFtcFxuICAgICAgKHsgb2Zmc2V0IH0gPSByZWFkQmluYXJ5KGJ1Ziwgb2Zmc2V0LCA4KSk7XG5cbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQzMkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHJldHVybiByZWFkQmluYXJ5KGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoKTtcbiAgICB9XG5cbiAgICBjYXNlICdTbWFsbERhdGVUaW1lJzoge1xuICAgICAgcmV0dXJuIHJlYWRTbWFsbERhdGVUaW1lKGJ1Ziwgb2Zmc2V0LCBvcHRpb25zLnVzZVVUQyk7XG4gICAgfVxuXG4gICAgY2FzZSAnRGF0ZVRpbWUnOiB7XG4gICAgICByZXR1cm4gcmVhZERhdGVUaW1lKGJ1Ziwgb2Zmc2V0LCBvcHRpb25zLnVzZVVUQyk7XG4gICAgfVxuXG4gICAgY2FzZSAnRGF0ZVRpbWVOJzoge1xuICAgICAgbGV0IGRhdGFMZW5ndGg7XG4gICAgICAoeyBvZmZzZXQsIHZhbHVlOiBkYXRhTGVuZ3RoIH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgc3dpdGNoIChkYXRhTGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICByZXR1cm4gcmVhZFNtYWxsRGF0ZVRpbWUoYnVmLCBvZmZzZXQsIG9wdGlvbnMudXNlVVRDKTtcbiAgICAgICAgY2FzZSA4OlxuICAgICAgICAgIHJldHVybiByZWFkRGF0ZVRpbWUoYnVmLCBvZmZzZXQsIG9wdGlvbnMudXNlVVRDKTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgZGF0YUxlbmd0aCAnICsgZGF0YUxlbmd0aCArICcgZm9yIERhdGVUaW1lTicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhc2UgJ1RpbWUnOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBpZiAoZGF0YUxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVhZFRpbWUoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgsIG1ldGFkYXRhLnNjYWxlISwgb3B0aW9ucy51c2VVVEMpO1xuICAgIH1cblxuICAgIGNhc2UgJ0RhdGUnOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBpZiAoZGF0YUxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVhZERhdGUoYnVmLCBvZmZzZXQsIG9wdGlvbnMudXNlVVRDKTtcbiAgICB9XG5cbiAgICBjYXNlICdEYXRlVGltZTInOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBpZiAoZGF0YUxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVhZERhdGVUaW1lMihidWYsIG9mZnNldCwgZGF0YUxlbmd0aCwgbWV0YWRhdGEuc2NhbGUhLCBvcHRpb25zLnVzZVVUQyk7XG4gICAgfVxuXG4gICAgY2FzZSAnRGF0ZVRpbWVPZmZzZXQnOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICBpZiAoZGF0YUxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVhZERhdGVUaW1lT2Zmc2V0KGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoLCBtZXRhZGF0YS5zY2FsZSEpO1xuICAgIH1cblxuICAgIGNhc2UgJ051bWVyaWNOJzpcbiAgICBjYXNlICdEZWNpbWFsTic6IHtcbiAgICAgIGxldCBkYXRhTGVuZ3RoO1xuICAgICAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF0YUxlbmd0aCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIGlmIChkYXRhTGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzdWx0KG51bGwsIG9mZnNldCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWFkTnVtZXJpYyhidWYsIG9mZnNldCwgZGF0YUxlbmd0aCwgbWV0YWRhdGEucHJlY2lzaW9uISwgbWV0YWRhdGEuc2NhbGUhKTtcbiAgICB9XG5cbiAgICBjYXNlICdVbmlxdWVJZGVudGlmaWVyJzoge1xuICAgICAgbGV0IGRhdGFMZW5ndGg7XG4gICAgICAoeyBvZmZzZXQsIHZhbHVlOiBkYXRhTGVuZ3RoIH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgc3dpdGNoIChkYXRhTGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuXG4gICAgICAgIGNhc2UgMHgxMDpcbiAgICAgICAgICByZXR1cm4gcmVhZFVuaXF1ZUlkZW50aWZpZXIoYnVmLCBvZmZzZXQsIG9wdGlvbnMpO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHNwcmludGYoJ1Vuc3VwcG9ydGVkIGd1aWQgc2l6ZSAlZCcsIGRhdGFMZW5ndGghIC0gMSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhc2UgJ1ZhcmlhbnQnOiB7XG4gICAgICBsZXQgZGF0YUxlbmd0aDtcbiAgICAgICh7IG9mZnNldCwgdmFsdWU6IGRhdGFMZW5ndGggfSA9IHJlYWRVSW50MzJMRShidWYsIG9mZnNldCkpO1xuXG4gICAgICBpZiAoZGF0YUxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc3VsdChudWxsLCBvZmZzZXQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVhZFZhcmlhbnQoYnVmLCBvZmZzZXQsIG9wdGlvbnMsIGRhdGFMZW5ndGgpO1xuICAgIH1cblxuICAgIGRlZmF1bHQ6IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0eXBlIScpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc1BMUFN0cmVhbShtZXRhZGF0YTogTWV0YWRhdGEpIHtcbiAgc3dpdGNoIChtZXRhZGF0YS50eXBlLm5hbWUpIHtcbiAgICBjYXNlICdWYXJDaGFyJzpcbiAgICBjYXNlICdOVmFyQ2hhcic6XG4gICAgY2FzZSAnVmFyQmluYXJ5Jzoge1xuICAgICAgcmV0dXJuIG1ldGFkYXRhLmRhdGFMZW5ndGggPT09IE1BWDtcbiAgICB9XG5cbiAgICBjYXNlICdYbWwnOiB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBjYXNlICdVRFQnOiB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZFVuaXF1ZUlkZW50aWZpZXIoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCBvcHRpb25zOiBQYXJzZXJPcHRpb25zKTogUmVzdWx0PHN0cmluZz4ge1xuICBsZXQgZGF0YTtcbiAgKHsgdmFsdWU6IGRhdGEsIG9mZnNldCB9ID0gcmVhZEJpbmFyeShidWYsIG9mZnNldCwgMHgxMCkpO1xuXG4gIHJldHVybiBuZXcgUmVzdWx0KG9wdGlvbnMubG93ZXJDYXNlR3VpZHMgPyBidWZmZXJUb0xvd2VyQ2FzZUd1aWQoZGF0YSkgOiBidWZmZXJUb1VwcGVyQ2FzZUd1aWQoZGF0YSksIG9mZnNldCk7XG59XG5cbmZ1bmN0aW9uIHJlYWROdW1lcmljKGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlciwgZGF0YUxlbmd0aDogbnVtYmVyLCBfcHJlY2lzaW9uOiBudW1iZXIsIHNjYWxlOiBudW1iZXIpOiBSZXN1bHQ8bnVtYmVyPiB7XG4gIGxldCBzaWduO1xuICAoeyBvZmZzZXQsIHZhbHVlOiBzaWduIH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICBzaWduID0gc2lnbiA9PT0gMSA/IDEgOiAtMTtcblxuICBsZXQgdmFsdWU7XG4gIGlmIChkYXRhTGVuZ3RoID09PSA1KSB7XG4gICAgKHsgb2Zmc2V0LCB2YWx1ZSB9ID0gcmVhZFVJbnQzMkxFKGJ1Ziwgb2Zmc2V0KSk7XG4gIH0gZWxzZSBpZiAoZGF0YUxlbmd0aCA9PT0gOSkge1xuICAgICh7IG9mZnNldCwgdmFsdWUgfSA9IHJlYWRVTnVtZXJpYzY0TEUoYnVmLCBvZmZzZXQpKTtcbiAgfSBlbHNlIGlmIChkYXRhTGVuZ3RoID09PSAxMykge1xuICAgICh7IG9mZnNldCwgdmFsdWUgfSA9IHJlYWRVTnVtZXJpYzk2TEUoYnVmLCBvZmZzZXQpKTtcbiAgfSBlbHNlIGlmIChkYXRhTGVuZ3RoID09PSAxNykge1xuICAgICh7IG9mZnNldCwgdmFsdWUgfSA9IHJlYWRVTnVtZXJpYzEyOExFKGJ1Ziwgb2Zmc2V0KSk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHNwcmludGYoJ1Vuc3VwcG9ydGVkIG51bWVyaWMgZGF0YUxlbmd0aCAlZCcsIGRhdGFMZW5ndGgpKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUmVzdWx0KCh2YWx1ZSAqIHNpZ24pIC8gTWF0aC5wb3coMTAsIHNjYWxlKSwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZFZhcmlhbnQoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCBvcHRpb25zOiBQYXJzZXJPcHRpb25zLCBkYXRhTGVuZ3RoOiBudW1iZXIpOiBSZXN1bHQ8dW5rbm93bj4ge1xuICBsZXQgYmFzZVR5cGU7XG4gICh7IHZhbHVlOiBiYXNlVHlwZSwgb2Zmc2V0IH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICBjb25zdCB0eXBlID0gVFlQRVtiYXNlVHlwZV07XG5cbiAgbGV0IHByb3BCeXRlcztcbiAgKHsgdmFsdWU6IHByb3BCeXRlcywgb2Zmc2V0IH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICBkYXRhTGVuZ3RoID0gZGF0YUxlbmd0aCAtIHByb3BCeXRlcyAtIDI7XG5cbiAgc3dpdGNoICh0eXBlLm5hbWUpIHtcbiAgICBjYXNlICdVbmlxdWVJZGVudGlmaWVyJzpcbiAgICAgIHJldHVybiByZWFkVW5pcXVlSWRlbnRpZmllcihidWYsIG9mZnNldCwgb3B0aW9ucyk7XG5cbiAgICBjYXNlICdCaXQnOlxuICAgICAgcmV0dXJuIHJlYWRCaXQoYnVmLCBvZmZzZXQpO1xuXG4gICAgY2FzZSAnVGlueUludCc6XG4gICAgICByZXR1cm4gcmVhZFRpbnlJbnQoYnVmLCBvZmZzZXQpO1xuXG4gICAgY2FzZSAnU21hbGxJbnQnOlxuICAgICAgcmV0dXJuIHJlYWRTbWFsbEludChidWYsIG9mZnNldCk7XG5cbiAgICBjYXNlICdJbnQnOlxuICAgICAgcmV0dXJuIHJlYWRJbnQoYnVmLCBvZmZzZXQpO1xuXG4gICAgY2FzZSAnQmlnSW50JzpcbiAgICAgIHJldHVybiByZWFkQmlnSW50KGJ1Ziwgb2Zmc2V0KTtcblxuICAgIGNhc2UgJ1NtYWxsRGF0ZVRpbWUnOlxuICAgICAgcmV0dXJuIHJlYWRTbWFsbERhdGVUaW1lKGJ1Ziwgb2Zmc2V0LCBvcHRpb25zLnVzZVVUQyk7XG5cbiAgICBjYXNlICdEYXRlVGltZSc6XG4gICAgICByZXR1cm4gcmVhZERhdGVUaW1lKGJ1Ziwgb2Zmc2V0LCBvcHRpb25zLnVzZVVUQyk7XG5cbiAgICBjYXNlICdSZWFsJzpcbiAgICAgIHJldHVybiByZWFkUmVhbChidWYsIG9mZnNldCk7XG5cbiAgICBjYXNlICdGbG9hdCc6XG4gICAgICByZXR1cm4gcmVhZEZsb2F0KGJ1Ziwgb2Zmc2V0KTtcblxuICAgIGNhc2UgJ1NtYWxsTW9uZXknOlxuICAgICAgcmV0dXJuIHJlYWRTbWFsbE1vbmV5KGJ1Ziwgb2Zmc2V0KTtcblxuICAgIGNhc2UgJ01vbmV5JzpcbiAgICAgIHJldHVybiByZWFkTW9uZXkoYnVmLCBvZmZzZXQpO1xuXG4gICAgY2FzZSAnRGF0ZSc6XG4gICAgICByZXR1cm4gcmVhZERhdGUoYnVmLCBvZmZzZXQsIG9wdGlvbnMudXNlVVRDKTtcblxuICAgIGNhc2UgJ1RpbWUnOiB7XG4gICAgICBsZXQgc2NhbGU7XG4gICAgICAoeyB2YWx1ZTogc2NhbGUsIG9mZnNldCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHJldHVybiByZWFkVGltZShidWYsIG9mZnNldCwgZGF0YUxlbmd0aCwgc2NhbGUsIG9wdGlvbnMudXNlVVRDKTtcbiAgICB9XG5cbiAgICBjYXNlICdEYXRlVGltZTInOiB7XG4gICAgICBsZXQgc2NhbGU7XG4gICAgICAoeyB2YWx1ZTogc2NhbGUsIG9mZnNldCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIHJldHVybiByZWFkRGF0ZVRpbWUyKGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoLCBzY2FsZSwgb3B0aW9ucy51c2VVVEMpO1xuICAgIH1cblxuICAgIGNhc2UgJ0RhdGVUaW1lT2Zmc2V0Jzoge1xuICAgICAgbGV0IHNjYWxlO1xuICAgICAgKHsgdmFsdWU6IHNjYWxlLCBvZmZzZXQgfSA9IHJlYWRVSW50OChidWYsIG9mZnNldCkpO1xuXG4gICAgICByZXR1cm4gcmVhZERhdGVUaW1lT2Zmc2V0KGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoLCBzY2FsZSk7XG4gICAgfVxuXG4gICAgY2FzZSAnVmFyQmluYXJ5JzpcbiAgICBjYXNlICdCaW5hcnknOiB7XG4gICAgICAvLyBtYXhMZW5ndGggKHVudXNlZD8pXG4gICAgICAoeyBvZmZzZXQgfSA9IHJlYWRVSW50MTZMRShidWYsIG9mZnNldCkpO1xuXG4gICAgICByZXR1cm4gcmVhZEJpbmFyeShidWYsIG9mZnNldCwgZGF0YUxlbmd0aCk7XG4gICAgfVxuXG4gICAgY2FzZSAnTnVtZXJpY04nOlxuICAgIGNhc2UgJ0RlY2ltYWxOJzoge1xuICAgICAgbGV0IHByZWNpc2lvbjtcbiAgICAgICh7IHZhbHVlOiBwcmVjaXNpb24sIG9mZnNldCB9ID0gcmVhZFVJbnQ4KGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgICAgIGxldCBzY2FsZTtcbiAgICAgICh7IHZhbHVlOiBzY2FsZSwgb2Zmc2V0IH0gPSByZWFkVUludDgoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgcmV0dXJuIHJlYWROdW1lcmljKGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoLCBwcmVjaXNpb24sIHNjYWxlKTtcbiAgICB9XG5cbiAgICBjYXNlICdWYXJDaGFyJzpcbiAgICBjYXNlICdDaGFyJzoge1xuICAgICAgLy8gbWF4TGVuZ3RoICh1bnVzZWQ/KVxuICAgICAgKHsgb2Zmc2V0IH0gPSByZWFkVUludDE2TEUoYnVmLCBvZmZzZXQpKTtcblxuICAgICAgbGV0IGNvbGxhdGlvbjtcbiAgICAgICh7IHZhbHVlOiBjb2xsYXRpb24sIG9mZnNldCB9ID0gcmVhZENvbGxhdGlvbihidWYsIG9mZnNldCkpO1xuXG4gICAgICByZXR1cm4gcmVhZENoYXJzKGJ1Ziwgb2Zmc2V0LCBkYXRhTGVuZ3RoLCBjb2xsYXRpb24uY29kZXBhZ2UhKTtcbiAgICB9XG5cbiAgICBjYXNlICdOVmFyQ2hhcic6XG4gICAgY2FzZSAnTkNoYXInOiB7XG4gICAgICAvLyBtYXhMZW5ndGggKHVudXNlZD8pXG4gICAgICAoeyBvZmZzZXQgfSA9IHJlYWRVSW50MTZMRShidWYsIG9mZnNldCkpO1xuXG4gICAgICAvLyBjb2xsYXRpb24gKHVudXNlZD8pXG4gICAgICAoeyBvZmZzZXQgfSA9IHJlYWRDb2xsYXRpb24oYnVmLCBvZmZzZXQpKTtcblxuICAgICAgcmV0dXJuIHJlYWROQ2hhcnMoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGgpO1xuICAgIH1cblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdHlwZSEnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkQmluYXJ5KGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlciwgZGF0YUxlbmd0aDogbnVtYmVyKTogUmVzdWx0PEJ1ZmZlcj4ge1xuICBpZiAoYnVmLmxlbmd0aCA8IG9mZnNldCArIGRhdGFMZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgTm90RW5vdWdoRGF0YUVycm9yKG9mZnNldCArIGRhdGFMZW5ndGgpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQoYnVmLnNsaWNlKG9mZnNldCwgb2Zmc2V0ICsgZGF0YUxlbmd0aCksIG9mZnNldCArIGRhdGFMZW5ndGgpO1xufVxuXG5mdW5jdGlvbiByZWFkQ2hhcnMoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCBkYXRhTGVuZ3RoOiBudW1iZXIsIGNvZGVwYWdlOiBzdHJpbmcpOiBSZXN1bHQ8c3RyaW5nPiB7XG4gIGlmIChidWYubGVuZ3RoIDwgb2Zmc2V0ICsgZGF0YUxlbmd0aCkge1xuICAgIHRocm93IG5ldyBOb3RFbm91Z2hEYXRhRXJyb3Iob2Zmc2V0ICsgZGF0YUxlbmd0aCk7XG4gIH1cblxuICByZXR1cm4gbmV3IFJlc3VsdChpY29udi5kZWNvZGUoYnVmLnNsaWNlKG9mZnNldCwgb2Zmc2V0ICsgZGF0YUxlbmd0aCksIGNvZGVwYWdlID8/IERFRkFVTFRfRU5DT0RJTkcpLCBvZmZzZXQgKyBkYXRhTGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gcmVhZE5DaGFycyhidWY6IEJ1ZmZlciwgb2Zmc2V0OiBudW1iZXIsIGRhdGFMZW5ndGg6IG51bWJlcik6IFJlc3VsdDxzdHJpbmc+IHtcbiAgaWYgKGJ1Zi5sZW5ndGggPCBvZmZzZXQgKyBkYXRhTGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IE5vdEVub3VnaERhdGFFcnJvcihvZmZzZXQgKyBkYXRhTGVuZ3RoKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUmVzdWx0KGJ1Zi50b1N0cmluZygndWNzMicsIG9mZnNldCwgb2Zmc2V0ICsgZGF0YUxlbmd0aCksIG9mZnNldCArIGRhdGFMZW5ndGgpO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZWFkUExQU3RyZWFtKHBhcnNlcjogUGFyc2VyKTogUHJvbWlzZTxudWxsIHwgQnVmZmVyW10+IHtcbiAgd2hpbGUgKHBhcnNlci5idWZmZXIubGVuZ3RoIDwgcGFyc2VyLnBvc2l0aW9uICsgOCkge1xuICAgIGF3YWl0IHBhcnNlci53YWl0Rm9yQ2h1bmsoKTtcbiAgfVxuXG4gIGNvbnN0IGV4cGVjdGVkTGVuZ3RoID0gcGFyc2VyLmJ1ZmZlci5yZWFkQmlnVUludDY0TEUocGFyc2VyLnBvc2l0aW9uKTtcbiAgcGFyc2VyLnBvc2l0aW9uICs9IDg7XG5cbiAgaWYgKGV4cGVjdGVkTGVuZ3RoID09PSBQTFBfTlVMTCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xuICBsZXQgY3VycmVudExlbmd0aCA9IDA7XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICB3aGlsZSAocGFyc2VyLmJ1ZmZlci5sZW5ndGggPCBwYXJzZXIucG9zaXRpb24gKyA0KSB7XG4gICAgICBhd2FpdCBwYXJzZXIud2FpdEZvckNodW5rKCk7XG4gICAgfVxuXG4gICAgY29uc3QgY2h1bmtMZW5ndGggPSBwYXJzZXIuYnVmZmVyLnJlYWRVSW50MzJMRShwYXJzZXIucG9zaXRpb24pO1xuICAgIHBhcnNlci5wb3NpdGlvbiArPSA0O1xuXG4gICAgaWYgKCFjaHVua0xlbmd0aCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgd2hpbGUgKHBhcnNlci5idWZmZXIubGVuZ3RoIDwgcGFyc2VyLnBvc2l0aW9uICsgY2h1bmtMZW5ndGgpIHtcbiAgICAgIGF3YWl0IHBhcnNlci53YWl0Rm9yQ2h1bmsoKTtcbiAgICB9XG5cbiAgICBjaHVua3MucHVzaChwYXJzZXIuYnVmZmVyLnNsaWNlKHBhcnNlci5wb3NpdGlvbiwgcGFyc2VyLnBvc2l0aW9uICsgY2h1bmtMZW5ndGgpKTtcbiAgICBwYXJzZXIucG9zaXRpb24gKz0gY2h1bmtMZW5ndGg7XG4gICAgY3VycmVudExlbmd0aCArPSBjaHVua0xlbmd0aDtcbiAgfVxuXG4gIGlmIChleHBlY3RlZExlbmd0aCAhPT0gVU5LTk9XTl9QTFBfTEVOKSB7XG4gICAgaWYgKGN1cnJlbnRMZW5ndGggIT09IE51bWJlcihleHBlY3RlZExlbmd0aCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUGFydGlhbGx5IExlbmd0aC1wcmVmaXhlZCBCeXRlcyB1bm1hdGNoZWQgbGVuZ3RocyA6IGV4cGVjdGVkICcgKyBleHBlY3RlZExlbmd0aCArICcsIGJ1dCBnb3QgJyArIGN1cnJlbnRMZW5ndGggKyAnIGJ5dGVzJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNodW5rcztcbn1cblxuZnVuY3Rpb24gcmVhZFNtYWxsRGF0ZVRpbWUoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCB1c2VVVEM6IGJvb2xlYW4pOiBSZXN1bHQ8RGF0ZT4ge1xuICBsZXQgZGF5cztcbiAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF5cyB9ID0gcmVhZFVJbnQxNkxFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgbGV0IG1pbnV0ZXM7XG4gICh7IG9mZnNldCwgdmFsdWU6IG1pbnV0ZXMgfSA9IHJlYWRVSW50MTZMRShidWYsIG9mZnNldCkpO1xuXG4gIGxldCB2YWx1ZTtcbiAgaWYgKHVzZVVUQykge1xuICAgIHZhbHVlID0gbmV3IERhdGUoRGF0ZS5VVEMoMTkwMCwgMCwgMSArIGRheXMsIDAsIG1pbnV0ZXMpKTtcbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IG5ldyBEYXRlKDE5MDAsIDAsIDEgKyBkYXlzLCAwLCBtaW51dGVzKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUmVzdWx0KHZhbHVlLCBvZmZzZXQpO1xufVxuXG5mdW5jdGlvbiByZWFkRGF0ZVRpbWUoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCB1c2VVVEM6IGJvb2xlYW4pOiBSZXN1bHQ8RGF0ZT4ge1xuICBsZXQgZGF5cztcbiAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF5cyB9ID0gcmVhZEludDMyTEUoYnVmLCBvZmZzZXQpKTtcblxuICBsZXQgdGhyZWVIdW5kcmVkdGhzT2ZTZWNvbmQ7XG4gICh7IG9mZnNldCwgdmFsdWU6IHRocmVlSHVuZHJlZHRoc09mU2Vjb25kIH0gPSByZWFkSW50MzJMRShidWYsIG9mZnNldCkpO1xuXG4gIGNvbnN0IG1pbGxpc2Vjb25kcyA9IE1hdGgucm91bmQodGhyZWVIdW5kcmVkdGhzT2ZTZWNvbmQgKiBUSFJFRV9BTkRfQV9USElSRCk7XG5cbiAgbGV0IHZhbHVlO1xuICBpZiAodXNlVVRDKSB7XG4gICAgdmFsdWUgPSBuZXcgRGF0ZShEYXRlLlVUQygxOTAwLCAwLCAxICsgZGF5cywgMCwgMCwgMCwgbWlsbGlzZWNvbmRzKSk7XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSBuZXcgRGF0ZSgxOTAwLCAwLCAxICsgZGF5cywgMCwgMCwgMCwgbWlsbGlzZWNvbmRzKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUmVzdWx0KHZhbHVlLCBvZmZzZXQpO1xufVxuXG5pbnRlcmZhY2UgRGF0ZVdpdGhOYW5vc2Vjb25kc0RlbHRhIGV4dGVuZHMgRGF0ZSB7XG4gIG5hbm9zZWNvbmRzRGVsdGE6IG51bWJlcjtcbn1cblxuZnVuY3Rpb24gcmVhZFRpbWUoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCBkYXRhTGVuZ3RoOiBudW1iZXIsIHNjYWxlOiBudW1iZXIsIHVzZVVUQzogYm9vbGVhbik6IFJlc3VsdDxEYXRlV2l0aE5hbm9zZWNvbmRzRGVsdGE+IHtcbiAgbGV0IHZhbHVlO1xuXG4gIHN3aXRjaCAoZGF0YUxlbmd0aCkge1xuICAgIGNhc2UgMzoge1xuICAgICAgKHsgdmFsdWUsIG9mZnNldCB9ID0gcmVhZFVJbnQyNExFKGJ1Ziwgb2Zmc2V0KSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjYXNlIDQ6IHtcbiAgICAgICh7IHZhbHVlLCBvZmZzZXQgfSA9IHJlYWRVSW50MzJMRShidWYsIG9mZnNldCkpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY2FzZSA1OiB7XG4gICAgICAoeyB2YWx1ZSwgb2Zmc2V0IH0gPSByZWFkVUludDQwTEUoYnVmLCBvZmZzZXQpKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGRlZmF1bHQ6IHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndW5yZWFjaGFibGUnKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc2NhbGUgPCA3KSB7XG4gICAgZm9yIChsZXQgaSA9IHNjYWxlOyBpIDwgNzsgaSsrKSB7XG4gICAgICB2YWx1ZSAqPSAxMDtcbiAgICB9XG4gIH1cblxuICBsZXQgZGF0ZTtcbiAgaWYgKHVzZVVUQykge1xuICAgIGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQygxOTcwLCAwLCAxLCAwLCAwLCAwLCB2YWx1ZSAvIDEwMDAwKSkgYXMgRGF0ZVdpdGhOYW5vc2Vjb25kc0RlbHRhO1xuICB9IGVsc2Uge1xuICAgIGRhdGUgPSBuZXcgRGF0ZSgxOTcwLCAwLCAxLCAwLCAwLCAwLCB2YWx1ZSAvIDEwMDAwKSBhcyBEYXRlV2l0aE5hbm9zZWNvbmRzRGVsdGE7XG4gIH1cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRhdGUsICduYW5vc2Vjb25kc0RlbHRhJywge1xuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHZhbHVlOiAodmFsdWUgJSAxMDAwMCkgLyBNYXRoLnBvdygxMCwgNylcbiAgfSk7XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQoZGF0ZSwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZERhdGUoYnVmOiBCdWZmZXIsIG9mZnNldDogbnVtYmVyLCB1c2VVVEM6IGJvb2xlYW4pOiBSZXN1bHQ8RGF0ZT4ge1xuICBsZXQgZGF5cztcbiAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF5cyB9ID0gcmVhZFVJbnQyNExFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgaWYgKHVzZVVUQykge1xuICAgIHJldHVybiBuZXcgUmVzdWx0KG5ldyBEYXRlKERhdGUuVVRDKDIwMDAsIDAsIGRheXMgLSA3MzAxMTgpKSwgb2Zmc2V0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IFJlc3VsdChuZXcgRGF0ZSgyMDAwLCAwLCBkYXlzIC0gNzMwMTE4KSwgb2Zmc2V0KTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkRGF0ZVRpbWUyKGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlciwgZGF0YUxlbmd0aDogbnVtYmVyLCBzY2FsZTogbnVtYmVyLCB1c2VVVEM6IGJvb2xlYW4pOiBSZXN1bHQ8RGF0ZVdpdGhOYW5vc2Vjb25kc0RlbHRhPiB7XG4gIGxldCB0aW1lO1xuICAoeyBvZmZzZXQsIHZhbHVlOiB0aW1lIH0gPSByZWFkVGltZShidWYsIG9mZnNldCwgZGF0YUxlbmd0aCAtIDMsIHNjYWxlLCB1c2VVVEMpKTtcblxuICBsZXQgZGF5cztcbiAgKHsgb2Zmc2V0LCB2YWx1ZTogZGF5cyB9ID0gcmVhZFVJbnQyNExFKGJ1Ziwgb2Zmc2V0KSk7XG5cbiAgbGV0IGRhdGU7XG4gIGlmICh1c2VVVEMpIHtcbiAgICBkYXRlID0gbmV3IERhdGUoRGF0ZS5VVEMoMjAwMCwgMCwgZGF5cyAtIDczMDExOCwgMCwgMCwgMCwgK3RpbWUpKSBhcyBEYXRlV2l0aE5hbm9zZWNvbmRzRGVsdGE7XG4gIH0gZWxzZSB7XG4gICAgZGF0ZSA9IG5ldyBEYXRlKDIwMDAsIDAsIGRheXMgLSA3MzAxMTgsIHRpbWUuZ2V0SG91cnMoKSwgdGltZS5nZXRNaW51dGVzKCksIHRpbWUuZ2V0U2Vjb25kcygpLCB0aW1lLmdldE1pbGxpc2Vjb25kcygpKSBhcyBEYXRlV2l0aE5hbm9zZWNvbmRzRGVsdGE7XG4gIH1cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRhdGUsICduYW5vc2Vjb25kc0RlbHRhJywge1xuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHZhbHVlOiB0aW1lLm5hbm9zZWNvbmRzRGVsdGFcbiAgfSk7XG5cbiAgcmV0dXJuIG5ldyBSZXN1bHQoZGF0ZSwgb2Zmc2V0KTtcbn1cblxuZnVuY3Rpb24gcmVhZERhdGVUaW1lT2Zmc2V0KGJ1ZjogQnVmZmVyLCBvZmZzZXQ6IG51bWJlciwgZGF0YUxlbmd0aDogbnVtYmVyLCBzY2FsZTogbnVtYmVyKTogUmVzdWx0PERhdGVXaXRoTmFub3NlY29uZHNEZWx0YT4ge1xuICBsZXQgdGltZTtcbiAgKHsgb2Zmc2V0LCB2YWx1ZTogdGltZSB9ID0gcmVhZFRpbWUoYnVmLCBvZmZzZXQsIGRhdGFMZW5ndGggLSA1LCBzY2FsZSwgdHJ1ZSkpO1xuXG4gIGxldCBkYXlzO1xuICAoeyBvZmZzZXQsIHZhbHVlOiBkYXlzIH0gPSByZWFkVUludDI0TEUoYnVmLCBvZmZzZXQpKTtcblxuICAvLyB0aW1lIG9mZnNldD9cbiAgKHsgb2Zmc2V0IH0gPSByZWFkVUludDE2TEUoYnVmLCBvZmZzZXQpKTtcblxuICBjb25zdCBkYXRlID0gbmV3IERhdGUoRGF0ZS5VVEMoMjAwMCwgMCwgZGF5cyAtIDczMDExOCwgMCwgMCwgMCwgK3RpbWUpKSBhcyBEYXRlV2l0aE5hbm9zZWNvbmRzRGVsdGE7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkYXRlLCAnbmFub3NlY29uZHNEZWx0YScsIHtcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICB2YWx1ZTogdGltZS5uYW5vc2Vjb25kc0RlbHRhXG4gIH0pO1xuICByZXR1cm4gbmV3IFJlc3VsdChkYXRlLCBvZmZzZXQpO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5yZWFkVmFsdWUgPSByZWFkVmFsdWU7XG5tb2R1bGUuZXhwb3J0cy5pc1BMUFN0cmVhbSA9IGlzUExQU3RyZWFtO1xubW9kdWxlLmV4cG9ydHMucmVhZFBMUFN0cmVhbSA9IHJlYWRQTFBTdHJlYW07XG5cbmV4cG9ydCB7IHJlYWRWYWx1ZSwgaXNQTFBTdHJlYW0sIHJlYWRQTFBTdHJlYW0gfTtcbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFDQSxJQUFBQSxlQUFBLEdBQUFDLE9BQUE7QUFDQSxJ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