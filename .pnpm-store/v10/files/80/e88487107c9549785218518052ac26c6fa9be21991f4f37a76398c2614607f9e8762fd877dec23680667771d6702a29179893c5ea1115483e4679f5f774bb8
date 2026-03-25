'use strict';

// http://dev.mysql.com/doc/internals/en/com-register-slave.html
// note that documentation is incorrect, for example command code is actually 0x15 but documented as 0x14

const Packet = require('../packets/packet');
const CommandCodes = require('../constants/commands');

class RegisterSlave {
  constructor(opts) {
    this.serverId = opts.serverId || 0;
    this.slaveHostname = opts.slaveHostname || '';
    this.slaveUser = opts.slaveUser || '';
    this.slavePassword = opts.slavePassword || '';
    this.slavePort = opts.slavePort || 0;
    this.replicationRank = opts.replicationRank || 0;
    this.masterId = opts.masterId || 0;
  }

  toPacket() {
    const length =
      15 + // TODO: should be ascii?
      Buffer.byteLength(this.slaveHostname, 'utf8') +
      Buffer.byteLength(this.slaveUser, 'utf8') +
      Buffer.byteLength(this.slavePassword, 'utf8') +
      3 +
      4;
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeInt8(CommandCodes.REGISTER_SLAVE);
    packet.writeInt32(this.serverId);
    packet.writeInt8(Buffer.byteLength(this.slaveHostname, 'utf8'));
    packet.writeString(this.slaveHostname);
    packet.writeInt8(Buffer.byteLength(this.slaveUser, 'utf8'));
    packet.writeString(this.slaveUser);
    packet.writeInt8(Buffer.byteLength(this.slavePassword, 'utf8'));
    packet.writeString(this.slavePassword);
    packet.writeInt16(this.slavePort);
    packet.writeInt32(this.replicationRank);
    packet.writeInt32(this.masterId);
    return packet;
  }
}

module.exports = RegisterSlave;
