'use strict';

// http://dev.mysql.com/doc/internals/en/connection-phase-packets.html#packet-Protocol::AuthSwitchRequest

const Packet = require('../packets/packet');

class AuthSwitchRequestMoreData {
  constructor(data) {
    this.data = data;
  }

  toPacket() {
    const length = 5 + this.data.length;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeInt8(0x01);
    packet.writeBuffer(this.data);
    return packet;
  }

  static fromPacket(packet) {
    packet.readInt8(); // marker
    const data = packet.readBuffer();
    return new AuthSwitchRequestMoreData(data);
  }

  static verifyMarker(packet) {
    return packet.peekByte() === 0x01;
  }
}

module.exports = AuthSwitchRequestMoreData;
