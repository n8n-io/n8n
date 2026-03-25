'use strict';

const Packet = require('../packets/packet');

class TextRow {
  constructor(columns) {
    this.columns = columns || [];
  }

  static fromPacket(packet) {
    // packet.reset(); // set offset to starting point?
    const columns = [];
    while (packet.haveMoreData()) {
      columns.push(packet.readLengthCodedString());
    }
    return new TextRow(columns);
  }

  static toPacket(columns, encoding) {
    const sequenceId = 0; // TODO remove, this is calculated now in connecton
    let length = 0;
    columns.forEach((val) => {
      if (val === null || typeof val === 'undefined') {
        ++length;
        return;
      }
      length += Packet.lengthCodedStringLength(val.toString(10), encoding);
    });
    const buffer = Buffer.allocUnsafe(length + 4);
    const packet = new Packet(sequenceId, buffer, 0, length + 4);
    packet.offset = 4;
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
}

module.exports = TextRow;
