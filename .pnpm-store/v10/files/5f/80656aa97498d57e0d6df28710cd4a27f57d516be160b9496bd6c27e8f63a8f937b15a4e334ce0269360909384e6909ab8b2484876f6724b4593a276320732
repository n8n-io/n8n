'use strict';

const Packet = require('../packets/packet');
const CommandCodes = require('../constants/commands');

class CloseStatement {
  constructor(id) {
    this.id = id;
  }

  // note: no response sent back
  toPacket() {
    const packet = new Packet(0, Buffer.allocUnsafe(9), 0, 9);
    packet.offset = 4;
    packet.writeInt8(CommandCodes.STMT_CLOSE);
    packet.writeInt32(this.id);
    return packet;
  }
}

module.exports = CloseStatement;
