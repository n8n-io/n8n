'use strict';

const Packet = require('../packets/packet');
const ClientConstants = require('../constants/client.js');

// https://dev.mysql.com/doc/internals/en/connection-phase-packets.html#packet-Protocol::Handshake

class Handshake {
  constructor(args) {
    this.protocolVersion = args.protocolVersion;
    this.serverVersion = args.serverVersion;
    this.capabilityFlags = args.capabilityFlags;
    this.connectionId = args.connectionId;
    this.authPluginData1 = args.authPluginData1;
    this.authPluginData2 = args.authPluginData2;
    this.characterSet = args.characterSet;
    this.statusFlags = args.statusFlags;
    this.authPluginName = args.authPluginName;
  }

  setScrambleData(cb) {
    require('crypto').randomBytes(20, (err, data) => {
      if (err) {
        cb(err);
        return;
      }
      this.authPluginData1 = data.slice(0, 8);
      this.authPluginData2 = data.slice(8, 20);
      cb();
    });
  }

  toPacket(sequenceId) {
    const length = 68 + Buffer.byteLength(this.serverVersion, 'utf8');
    const buffer = Buffer.alloc(length + 4, 0); // zero fill, 10 bytes filler later needs to contain zeros
    const packet = new Packet(sequenceId, buffer, 0, length + 4);
    packet.offset = 4;
    packet.writeInt8(this.protocolVersion);
    packet.writeString(this.serverVersion, 'cesu8');
    packet.writeInt8(0);
    packet.writeInt32(this.connectionId);
    packet.writeBuffer(this.authPluginData1);
    packet.writeInt8(0);
    const capabilityFlagsBuffer = Buffer.allocUnsafe(4);
    capabilityFlagsBuffer.writeUInt32LE(this.capabilityFlags, 0);
    packet.writeBuffer(capabilityFlagsBuffer.slice(0, 2));
    packet.writeInt8(this.characterSet);
    packet.writeInt16(this.statusFlags);
    packet.writeBuffer(capabilityFlagsBuffer.slice(2, 4));
    packet.writeInt8(21); // authPluginDataLength
    packet.skip(10);
    packet.writeBuffer(this.authPluginData2);
    packet.writeInt8(0);
    packet.writeString('mysql_native_password', 'latin1');
    packet.writeInt8(0);
    return packet;
  }

  static fromPacket(packet) {
    const args = {};
    args.protocolVersion = packet.readInt8();
    args.serverVersion = packet.readNullTerminatedString('cesu8');
    args.connectionId = packet.readInt32();
    args.authPluginData1 = packet.readBuffer(8);
    packet.skip(1);
    const capabilityFlagsBuffer = Buffer.allocUnsafe(4);
    capabilityFlagsBuffer[0] = packet.readInt8();
    capabilityFlagsBuffer[1] = packet.readInt8();
    if (packet.haveMoreData()) {
      args.characterSet = packet.readInt8();
      args.statusFlags = packet.readInt16();
      // upper 2 bytes
      capabilityFlagsBuffer[2] = packet.readInt8();
      capabilityFlagsBuffer[3] = packet.readInt8();
      args.capabilityFlags = capabilityFlagsBuffer.readUInt32LE(0);
      if (args.capabilityFlags & ClientConstants.PLUGIN_AUTH) {
        args.authPluginDataLength = packet.readInt8();
      } else {
        args.authPluginDataLength = 0;
        packet.skip(1);
      }
      packet.skip(10);
    } else {
      args.capabilityFlags = capabilityFlagsBuffer.readUInt16LE(0);
    }

    const isSecureConnection =
      args.capabilityFlags & ClientConstants.SECURE_CONNECTION;
    if (isSecureConnection) {
      const authPluginDataLength = args.authPluginDataLength;
      if (authPluginDataLength === 0) {
        // for Secure Password Authentication
        args.authPluginDataLength = 20;
        args.authPluginData2 = packet.readBuffer(12);
        packet.skip(1);
      } else {
        // length > 0
        // for Custom Auth Plugin (PLUGIN_AUTH)
        const len = Math.max(13, authPluginDataLength - 8);
        args.authPluginData2 = packet.readBuffer(len);
      }
    }

    if (args.capabilityFlags & ClientConstants.PLUGIN_AUTH) {
      args.authPluginName = packet.readNullTerminatedString('ascii');
    }

    return new Handshake(args);
  }
}

module.exports = Handshake;
