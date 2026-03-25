'use strict';

const ClientConstants = require('../constants/client');
const Packet = require('../packets/packet');

class SSLRequest {
  constructor(flags, charset) {
    this.clientFlags = flags | ClientConstants.SSL;
    this.charset = charset;
  }

  toPacket() {
    const length = 36;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet(0, buffer, 0, length);
    buffer.fill(0);
    packet.offset = 4;
    packet.writeInt32(this.clientFlags);
    packet.writeInt32(0); // max packet size. todo: move to config
    packet.writeInt8(this.charset);
    return packet;
  }
}

module.exports = SSLRequest;
