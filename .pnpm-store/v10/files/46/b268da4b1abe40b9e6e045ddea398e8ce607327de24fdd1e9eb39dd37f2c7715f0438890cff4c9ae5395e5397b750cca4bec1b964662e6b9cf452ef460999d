'use strict';

const Types = require('../constants/types');
const Packet = require('../packets/packet');

const binaryReader = new Array(256);

class BinaryRow {
  constructor(columns) {
    this.columns = columns || [];
  }

  static toPacket(columns, encoding) {
    // throw new Error('Not implemented');
    const sequenceId = 0; // TODO remove, this is calculated now in connecton
    let length = 0;
    columns.forEach((val) => {
      if (val === null || typeof val === 'undefined') {
        ++length;
        return;
      }
      length += Packet.lengthCodedStringLength(val.toString(10), encoding);
    });

    length = length + 2;

    const buffer = Buffer.allocUnsafe(length + 4);
    const packet = new Packet(sequenceId, buffer, 0, length + 4);
    packet.offset = 4;

    packet.writeInt8(0);

    let bitmap = 0;
    let bitValue = 1;
    columns.forEach((parameter) => {
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

    columns.forEach((val) => {
      if (val === null) {
        packet.writeNull();
        return;
      }
      if (typeof val === 'undefined') {
        packet.writeInt8(0);
        return;
      }
      packet.writeLengthCodedString(val.toString(10), encoding);
    });
    return packet;
  }

  // TODO: complete list of types...
  static fromPacket(fields, packet) {
    const columns = new Array(fields.length);
    packet.readInt8(); // TODO check it's 0
    const nullBitmapLength = Math.floor((fields.length + 7 + 2) / 8);
    // TODO: read and interpret null bitmap
    packet.skip(nullBitmapLength);
    for (let i = 0; i < columns.length; ++i) {
      columns[i] = binaryReader[fields[i].columnType].apply(packet);
    }
    return new BinaryRow(columns);
  }
}

// TODO: replace with constants.MYSQL_TYPE_*
binaryReader[Types.DECIMAL] = Packet.prototype.readLengthCodedString;
binaryReader[1] = Packet.prototype.readInt8; // tiny
binaryReader[2] = Packet.prototype.readInt16; // short
binaryReader[3] = Packet.prototype.readInt32; // long
binaryReader[4] = Packet.prototype.readFloat; // float
binaryReader[5] = Packet.prototype.readDouble; // double
binaryReader[6] = Packet.prototype.assertInvalid; // null, should be skipped vie null bitmap
binaryReader[7] = Packet.prototype.readTimestamp; // timestamp, http://dev.mysql.com/doc/internals/en/prepared-statements.html#packet-ProtocolBinary::MYSQL_TYPE_TIMESTAMP
binaryReader[8] = Packet.prototype.readInt64; // long long
binaryReader[9] = Packet.prototype.readInt32; // int24
binaryReader[10] = Packet.prototype.readTimestamp; // date
binaryReader[11] = Packet.prototype.readTime; // time, http://dev.mysql.com/doc/internals/en/prepared-statements.html#packet-ProtocolBinary::MYSQL_TYPE_TIME
binaryReader[12] = Packet.prototype.readDateTime; // datetime, http://dev.mysql.com/doc/internals/en/prepared-statements.html#packet-ProtocolBinary::MYSQL_TYPE_DATETIME
binaryReader[13] = Packet.prototype.readInt16; // year
binaryReader[Types.VAR_STRING] = Packet.prototype.readLengthCodedString; // var string

module.exports = BinaryRow;
