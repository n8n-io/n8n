'use strict';

const Command = require('./command');
const Packets = require('../packets/index.js');

class CloseStatement extends Command {
  constructor(id) {
    super();
    this.id = id;
  }

  start(packet, connection) {
    connection.writePacket(new Packets.CloseStatement(this.id).toPacket(1));
    return null;
  }
}

module.exports = CloseStatement;
