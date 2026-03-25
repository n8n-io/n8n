'use strict';

const CursorType = require('../constants/cursor');
const CommandCodes = require('../constants/commands');
const Types = require('../constants/types');
const Packet = require('../packets/packet');
const CharsetToEncoding = require('../constants/charset_encodings.js');

function isJSON(value) {
  return (
    Array.isArray(value) ||
    value.constructor === Object ||
    (typeof value.toJSON === 'function' && !Buffer.isBuffer(value))
  );
}

/**
 * Converts a value to an object describing type, String/Buffer representation and length
 * @param {*} value
 */
function toParameter(value, encoding, timezone) {
  let type = Types.VAR_STRING;
  let length;
  let writer = function (value) {
    // eslint-disable-next-line no-invalid-this
    return Packet.prototype.writeLengthCodedString.call(this, value, encoding);
  };
  if (value !== null) {
    switch (typeof value) {
      case 'undefined':
        throw new TypeError('Bind parameters must not contain undefined');

      case 'number':
        type = Types.DOUBLE;
        length = 8;
        writer = Packet.prototype.writeDouble;
        break;

      case 'boolean':
        value = value | 0;
        type = Types.TINY;
        length = 1;
        writer = Packet.prototype.writeInt8;
        break;

      case 'object':
        if (Object.prototype.toString.call(value) === '[object Date]') {
          type = Types.DATETIME;
          length = 12;
          writer = function (value) {
            // eslint-disable-next-line no-invalid-this
            return Packet.prototype.writeDate.call(this, value, timezone);
          };
        } else if (isJSON(value)) {
          value = JSON.stringify(value);
          type = Types.JSON;
        } else if (Buffer.isBuffer(value)) {
          length = Packet.lengthCodedNumberLength(value.length) + value.length;
          writer = Packet.prototype.writeLengthCodedBuffer;
        }
        break;

      default:
        value = value.toString();
    }
  } else {
    value = '';
    type = Types.NULL;
  }
  if (!length) {
    length = Packet.lengthCodedStringLength(value, encoding);
  }
  return { value, type, length, writer };
}

class Execute {
  constructor(id, parameters, charsetNumber, timezone) {
    this.id = id;
    this.parameters = parameters;
    this.encoding = CharsetToEncoding[charsetNumber];
    this.timezone = timezone;
  }

  static fromPacket(packet, encoding) {
    const stmtId = packet.readInt32();
    const flags = packet.readInt8();
    const iterationCount = packet.readInt32();

    let i = packet.offset;
    while (i < packet.end - 1) {
      if (
        (packet.buffer[i + 1] === Types.VAR_STRING ||
          packet.buffer[i + 1] === Types.NULL ||
          packet.buffer[i + 1] === Types.DOUBLE ||
          packet.buffer[i + 1] === Types.TINY ||
          packet.buffer[i + 1] === Types.DATETIME ||
          packet.buffer[i + 1] === Types.JSON) &&
        packet.buffer[i] === 1 &&
        packet.buffer[i + 2] === 0
      ) {
        break;
      } else {
        packet.readInt8();
      }
      i++;
    }

    const types = [];

    for (let i = packet.offset + 1; i < packet.end - 1; i++) {
      if (
        (packet.buffer[i] === Types.VAR_STRING ||
          packet.buffer[i] === Types.NULL ||
          packet.buffer[i] === Types.DOUBLE ||
          packet.buffer[i] === Types.TINY ||
          packet.buffer[i] === Types.DATETIME ||
          packet.buffer[i] === Types.JSON) &&
        packet.buffer[i + 1] === 0
      ) {
        types.push(packet.buffer[i]);
        packet.skip(2);
      }
    }

    packet.skip(1);

    const values = [];
    for (let i = 0; i < types.length; i++) {
      if (types[i] === Types.VAR_STRING) {
        values.push(packet.readLengthCodedString(encoding));
      } else if (types[i] === Types.DOUBLE) {
        values.push(packet.readDouble());
      } else if (types[i] === Types.TINY) {
        values.push(packet.readInt8());
      } else if (types[i] === Types.DATETIME) {
        values.push(packet.readDateTime());
      } else if (types[i] === Types.JSON) {
        values.push(JSON.parse(packet.readLengthCodedString(encoding)));
      }
      if (types[i] === Types.NULL) {
        values.push(null);
      }
    }

    return { stmtId, flags, iterationCount, values };
  }

  toPacket() {
    // TODO: don't try to calculate packet length in advance, allocate some big buffer in advance (header + 256 bytes?)
    // and copy + reallocate if not enough
    // 0 + 4 - length, seqId
    // 4 + 1 - COM_EXECUTE
    // 5 + 4 - stmtId
    // 9 + 1 - flags
    // 10 + 4 - iteration-count (always 1)
    let length = 14;
    let parameters;
    if (this.parameters && this.parameters.length > 0) {
      length += Math.floor((this.parameters.length + 7) / 8);
      length += 1; // new-params-bound-flag
      length += 2 * this.parameters.length; // type byte for each parameter if new-params-bound-flag is set
      parameters = this.parameters.map((value) =>
        toParameter(value, this.encoding, this.timezone)
      );
      length += parameters.reduce(
        (accumulator, parameter) => accumulator + parameter.length,
        0
      );
    }
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeInt8(CommandCodes.STMT_EXECUTE);
    packet.writeInt32(this.id);
    packet.writeInt8(CursorType.NO_CURSOR); // flags
    packet.writeInt32(1); // iteration-count, always 1
    if (parameters) {
      let bitmap = 0;
      let bitValue = 1;
      parameters.forEach((parameter) => {
        if (parameter.type === Types.NULL) {
          bitmap += bitValue;
        }
        bitValue *= 2;
        if (bitValue === 256) {
          packet.writeInt8(bitmap);
          bitmap = 0;
          bitValue = 1;
        }
      });
      if (bitValue !== 1) {
        packet.writeInt8(bitmap);
      }
      // TODO: explain meaning of the flag
      // afaik, if set n*2 bytes with type of parameter are sent before parameters
      // if not, previous execution types are used (TODO prooflink)
      packet.writeInt8(1); // new-params-bound-flag
      // Write parameter types
      parameters.forEach((parameter) => {
        packet.writeInt8(parameter.type); // field type
        packet.writeInt8(0); // parameter flag
      });
      // Write parameter values
      parameters.forEach((parameter) => {
        if (parameter.type !== Types.NULL) {
          parameter.writer.call(packet, parameter.value);
        }
      });
    }
    return packet;
  }
}

module.exports = Execute;
