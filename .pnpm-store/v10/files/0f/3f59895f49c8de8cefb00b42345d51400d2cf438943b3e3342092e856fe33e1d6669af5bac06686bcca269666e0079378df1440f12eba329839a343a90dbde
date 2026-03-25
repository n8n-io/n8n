'use strict';

const Command = require('./command');
const Packets = require('../packets');

class RegisterSlave extends Command {
  constructor(opts, callback) {
    super();
    this.onResult = callback;
    this.opts = opts;
  }

  start(packet, connection) {
    const newPacket = new Packets.RegisterSlave(this.opts);
    connection.writePacket(newPacket.toPacket(1));
    return RegisterSlave.prototype.registerResponse;
  }

  registerResponse() {
    if (this.onResult) {
      process.nextTick(this.onResult.bind(this));
    }
    return null;
  }
}

module.exports = RegisterSlave;
