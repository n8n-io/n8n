'use strict';

const Command = require('./command');
const Packets = require('../packets');

const eventParsers = [];

class BinlogEventHeader {
  constructor(packet) {
    this.timestamp = packet.readInt32();
    this.eventType = packet.readInt8();
    this.serverId = packet.readInt32();
    this.eventSize = packet.readInt32();
    this.logPos = packet.readInt32();
    this.flags = packet.readInt16();
  }
}

class BinlogDump extends Command {
  constructor(opts) {
    super();
    // this.onResult = callback;
    this.opts = opts;
  }

  start(packet, connection) {
    const newPacket = new Packets.BinlogDump(this.opts);
    connection.writePacket(newPacket.toPacket(1));
    return BinlogDump.prototype.binlogData;
  }

  binlogData(packet) {
    // ok - continue consuming events
    // error - error
    // eof - end of binlog
    if (packet.isEOF()) {
      this.emit('eof');
      return null;
    }
    // binlog event header
    packet.readInt8();
    const header = new BinlogEventHeader(packet);
    const EventParser = eventParsers[header.eventType];
    let event;
    if (EventParser) {
      event = new EventParser(packet);
    } else {
      event = {
        name: 'UNKNOWN',
      };
    }
    event.header = header;
    this.emit('event', event);
    return BinlogDump.prototype.binlogData;
  }
}

class RotateEvent {
  constructor(packet) {
    this.pposition = packet.readInt32();
    // TODO: read uint64 here
    packet.readInt32(); // positionDword2
    this.nextBinlog = packet.readString();
    this.name = 'RotateEvent';
  }
}

class FormatDescriptionEvent {
  constructor(packet) {
    this.binlogVersion = packet.readInt16();
    this.serverVersion = packet.readString(50).replace(/\u0000.*/, ''); // eslint-disable-line no-control-regex
    this.createTimestamp = packet.readInt32();
    this.eventHeaderLength = packet.readInt8(); // should be 19
    this.eventsLength = packet.readBuffer();
    this.name = 'FormatDescriptionEvent';
  }
}

class QueryEvent {
  constructor(packet) {
    const parseStatusVars = require('../packets/binlog_query_statusvars.js');
    this.slaveProxyId = packet.readInt32();
    this.executionTime = packet.readInt32();
    const schemaLength = packet.readInt8();
    this.errorCode = packet.readInt16();
    const statusVarsLength = packet.readInt16();
    const statusVars = packet.readBuffer(statusVarsLength);
    this.schema = packet.readString(schemaLength);
    packet.readInt8(); // should be zero
    this.statusVars = parseStatusVars(statusVars);
    this.query = packet.readString();
    this.name = 'QueryEvent';
  }
}

class XidEvent {
  constructor(packet) {
    this.binlogVersion = packet.readInt16();
    this.xid = packet.readInt64();
    this.name = 'XidEvent';
  }
}

eventParsers[2] = QueryEvent;
eventParsers[4] = RotateEvent;
eventParsers[15] = FormatDescriptionEvent;
eventParsers[16] = XidEvent;

module.exports = BinlogDump;
