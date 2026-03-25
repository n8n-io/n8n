'use strict';

const Command = require('./command');
const CommandCode = require('../constants/commands');
const Packet = require('../packets/packet');

// TODO: time statistics?
// usefull for queue size and network latency monitoring
// store created,sent,reply timestamps
class Ping extends Command {
  constructor(callback) {
    super();
    this.onResult = callback;
  }

  start(packet, connection) {
    const ping = new Packet(
      0,
      Buffer.from([1, 0, 0, 0, CommandCode.PING]),
      0,
      5
    );
    connection.writePacket(ping);
    return Ping.prototype.pingResponse;
  }

  pingResponse() {
    // TODO: check it's OK packet. error check already done in caller
    if (this.onResult) {
      process.nextTick(this.onResult.bind(this));
    }
    return null;
  }
}

module.exports = Ping;
