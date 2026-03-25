// Copyright (c) 2021, Oracle and/or its affiliates.

'use strict';

const Packet = require('../packets/packet');

class AuthNextFactor {
  constructor(opts) {
    this.pluginName = opts.pluginName;
    this.pluginData = opts.pluginData;
  }

  toPacket(encoding) {
    const length = 6 + this.pluginName.length + this.pluginData.length;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeInt8(0x02);
    packet.writeNullTerminatedString(this.pluginName, encoding);
    packet.writeBuffer(this.pluginData);
    return packet;
  }

  static fromPacket(packet, encoding) {
    packet.readInt8(); // marker
    const name = packet.readNullTerminatedString(encoding);
    const data = packet.readBuffer();
    return new AuthNextFactor({
      pluginName: name,
      pluginData: data,
    });
  }
}

module.exports = AuthNextFactor;
