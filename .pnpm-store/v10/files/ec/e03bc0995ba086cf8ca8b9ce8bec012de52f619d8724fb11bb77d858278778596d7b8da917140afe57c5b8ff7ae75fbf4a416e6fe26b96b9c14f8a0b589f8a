'use strict';

// TODO: rename to OK packet
// https://dev.mysql.com/doc/internals/en/packet-OK_Packet.html

const Packet = require('./packet.js');
const ClientConstants = require('../constants/client.js');
const ServerSatusFlags = require('../constants/server_status.js');

const EncodingToCharset = require('../constants/encoding_charset.js');
const sessionInfoTypes = require('../constants/session_track.js');

class ResultSetHeader {
  constructor(packet, connection) {
    const bigNumberStrings = connection.config.bigNumberStrings;
    const encoding = connection.serverEncoding;
    const flags = connection._handshakePacket.capabilityFlags;
    const isSet = function (flag) {
      return flags & ClientConstants[flag];
    };
    if (packet.buffer[packet.offset] !== 0) {
      this.fieldCount = packet.readLengthCodedNumber();
      if (this.fieldCount === null) {
        this.infileName = packet.readString(undefined, encoding);
      }
      return;
    }
    this.fieldCount = packet.readInt8(); // skip OK byte
    this.affectedRows = packet.readLengthCodedNumber(bigNumberStrings);
    this.insertId = packet.readLengthCodedNumberSigned(bigNumberStrings);
    this.info = '';
    if (isSet('PROTOCOL_41')) {
      this.serverStatus = packet.readInt16();
      this.warningStatus = packet.readInt16();
    } else if (isSet('TRANSACTIONS')) {
      this.serverStatus = packet.readInt16();
    }
    let stateChanges = null;
    if (isSet('SESSION_TRACK') && packet.offset < packet.end) {
      this.info = packet.readLengthCodedString(encoding);

      if (this.serverStatus && ServerSatusFlags.SERVER_SESSION_STATE_CHANGED) {
        // session change info record - see
        // https://dev.mysql.com/doc/internals/en/packet-OK_Packet.html#cs-sect-packet-ok-sessioninfo
        let len =
          packet.offset < packet.end ? packet.readLengthCodedNumber() : 0;
        const end = packet.offset + len;
        let type, key, stateEnd;
        if (len > 0) {
          stateChanges = {
            systemVariables: {},
            schema: null,
            gtids: [],
            trackStateChange: null,
          };
        }
        while (packet.offset < end) {
          type = packet.readInt8();
          len = packet.readLengthCodedNumber();
          stateEnd = packet.offset + len;
          if (type === sessionInfoTypes.SYSTEM_VARIABLES) {
            key = packet.readLengthCodedString(encoding);
            const val = packet.readLengthCodedString(encoding);
            stateChanges.systemVariables[key] = val;
            if (key === 'character_set_client') {
              const charsetNumber = EncodingToCharset[val];
              // TODO - better api for driver users to handle unknown encodings?
              // maybe custom coverter in the config?
              // For now just ignore character_set_client command if there is
              // no known mapping from reported encoding to a charset code
              if (typeof charsetNumber !== 'undefined') {
                connection.config.charsetNumber = charsetNumber;
              }
            }
          } else if (type === sessionInfoTypes.SCHEMA) {
            key = packet.readLengthCodedString(encoding);
            stateChanges.schema = key;
          } else if (type === sessionInfoTypes.STATE_CHANGE) {
            stateChanges.trackStateChange =
              packet.readLengthCodedString(encoding);
          } else if (type === sessionInfoTypes.STATE_GTIDS) {
            // TODO: find if the first length coded string means anything. Usually comes as empty
            // eslint-disable-next-line no-unused-vars
            const _unknownString = packet.readLengthCodedString(encoding);
            const gtid = packet.readLengthCodedString(encoding);
            stateChanges.gtids = gtid.split(',');
          } else {
            // unsupported session track type. For now just ignore
          }
          packet.offset = stateEnd;
        }
      }
    } else {
      this.info = packet.readString(undefined, encoding);
    }
    if (stateChanges) {
      this.stateChanges = stateChanges;
    }
    const m = this.info.match(/\schanged:\s*(\d+)/i);
    if (m !== null) {
      this.changedRows = parseInt(m[1], 10);
    } else {
      this.changedRows = 0;
    }
  }

  // TODO: should be consistent instance member, but it's just easier here to have just function
  static toPacket(fieldCount, insertId) {
    let length = 4 + Packet.lengthCodedNumberLength(fieldCount);
    if (typeof insertId !== 'undefined') {
      length += Packet.lengthCodedNumberLength(insertId);
    }
    const buffer = Buffer.allocUnsafe(length);
    const packet = new Packet(0, buffer, 0, length);
    packet.offset = 4;
    packet.writeLengthCodedNumber(fieldCount);
    if (typeof insertId !== 'undefined') {
      packet.writeLengthCodedNumber(insertId);
    }
    return packet;
  }
}

module.exports = ResultSetHeader;
