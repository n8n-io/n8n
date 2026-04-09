"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _sprintfJs = require("sprintf-js");
var _tdsVersions = require("./tds-versions");
const FLAGS_1 = {
  ENDIAN_LITTLE: 0x00,
  ENDIAN_BIG: 0x01,
  CHARSET_ASCII: 0x00,
  CHARSET_EBCDIC: 0x02,
  FLOAT_IEEE_754: 0x00,
  FLOAT_VAX: 0x04,
  FLOAT_ND5000: 0x08,
  BCP_DUMPLOAD_ON: 0x00,
  BCP_DUMPLOAD_OFF: 0x10,
  USE_DB_ON: 0x00,
  USE_DB_OFF: 0x20,
  INIT_DB_WARN: 0x00,
  INIT_DB_FATAL: 0x40,
  SET_LANG_WARN_OFF: 0x00,
  SET_LANG_WARN_ON: 0x80
};
const FLAGS_2 = {
  INIT_LANG_WARN: 0x00,
  INIT_LANG_FATAL: 0x01,
  ODBC_OFF: 0x00,
  ODBC_ON: 0x02,
  F_TRAN_BOUNDARY: 0x04,
  F_CACHE_CONNECT: 0x08,
  USER_NORMAL: 0x00,
  USER_SERVER: 0x10,
  USER_REMUSER: 0x20,
  USER_SQLREPL: 0x40,
  INTEGRATED_SECURITY_OFF: 0x00,
  INTEGRATED_SECURITY_ON: 0x80
};
const TYPE_FLAGS = {
  SQL_DFLT: 0x00,
  SQL_TSQL: 0x08,
  OLEDB_OFF: 0x00,
  OLEDB_ON: 0x10,
  READ_WRITE_INTENT: 0x00,
  READ_ONLY_INTENT: 0x20
};
const FLAGS_3 = {
  CHANGE_PASSWORD_NO: 0x00,
  CHANGE_PASSWORD_YES: 0x01,
  BINARY_XML: 0x02,
  SPAWN_USER_INSTANCE: 0x04,
  UNKNOWN_COLLATION_HANDLING: 0x08,
  EXTENSION_USED: 0x10
};
const FEDAUTH_OPTIONS = {
  FEATURE_ID: 0x02,
  LIBRARY_SECURITYTOKEN: 0x01,
  LIBRARY_ADAL: 0x02,
  FEDAUTH_YES_ECHO: 0x01,
  FEDAUTH_NO_ECHO: 0x00,
  ADAL_WORKFLOW_USER_PASS: 0x01,
  ADAL_WORKFLOW_INTEGRATED: 0x02
};
const FEATURE_EXT_TERMINATOR = 0xFF;
/*
  s2.2.6.3
 */
class Login7Payload {
  constructor({
    tdsVersion,
    packetSize,
    clientProgVer,
    clientPid,
    connectionId,
    clientTimeZone,
    clientLcid
  }) {
    this.tdsVersion = tdsVersion;
    this.packetSize = packetSize;
    this.clientProgVer = clientProgVer;
    this.clientPid = clientPid;
    this.connectionId = connectionId;
    this.clientTimeZone = clientTimeZone;
    this.clientLcid = clientLcid;
    this.readOnlyIntent = false;
    this.initDbFatal = false;
    this.fedAuth = undefined;
    this.userName = undefined;
    this.password = undefined;
    this.serverName = undefined;
    this.appName = undefined;
    this.hostname = undefined;
    this.libraryName = undefined;
    this.language = undefined;
    this.database = undefined;
    this.clientId = undefined;
    this.sspi = undefined;
    this.attachDbFile = undefined;
    this.changePassword = undefined;
  }
  toBuffer() {
    const fixedData = Buffer.alloc(94);
    const buffers = [fixedData];
    let offset = 0;
    let dataOffset = fixedData.length;

    // Length: 4-byte
    offset = fixedData.writeUInt32LE(0, offset);

    // TDSVersion: 4-byte
    offset = fixedData.writeUInt32LE(this.tdsVersion, offset);

    // PacketSize: 4-byte
    offset = fixedData.writeUInt32LE(this.packetSize, offset);

    // ClientProgVer: 4-byte
    offset = fixedData.writeUInt32LE(this.clientProgVer, offset);

    // ClientPID: 4-byte
    offset = fixedData.writeUInt32LE(this.clientPid, offset);

    // ConnectionID: 4-byte
    offset = fixedData.writeUInt32LE(this.connectionId, offset);

    // OptionFlags1: 1-byte
    offset = fixedData.writeUInt8(this.buildOptionFlags1(), offset);

    // OptionFlags2: 1-byte
    offset = fixedData.writeUInt8(this.buildOptionFlags2(), offset);

    // TypeFlags: 1-byte
    offset = fixedData.writeUInt8(this.buildTypeFlags(), offset);

    // OptionFlags3: 1-byte
    offset = fixedData.writeUInt8(this.buildOptionFlags3(), offset);

    // ClientTimZone: 4-byte
    offset = fixedData.writeInt32LE(this.clientTimeZone, offset);

    // ClientLCID: 4-byte
    offset = fixedData.writeUInt32LE(this.clientLcid, offset);

    // ibHostName: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cchHostName: 2-byte
    if (this.hostname) {
      const buffer = Buffer.from(this.hostname, 'ucs2');
      offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
      dataOffset += buffer.length;
      buffers.push(buffer);
    } else {
      offset = fixedData.writeUInt16LE(dataOffset, offset);
    }

    // ibUserName: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cchUserName: 2-byte
    if (this.userName) {
      const buffer = Buffer.from(this.userName, 'ucs2');
      offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
      dataOffset += buffer.length;
      buffers.push(buffer);
    } else {
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // ibPassword: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cchPassword: 2-byte
    if (this.password) {
      const buffer = Buffer.from(this.password, 'ucs2');
      offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
      dataOffset += buffer.length;
      buffers.push(this.scramblePassword(buffer));
    } else {
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // ibAppName: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cchAppName: 2-byte
    if (this.appName) {
      const buffer = Buffer.from(this.appName, 'ucs2');
      offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
      dataOffset += buffer.length;
      buffers.push(buffer);
    } else {
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // ibServerName: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cchServerName: 2-byte
    if (this.serverName) {
      const buffer = Buffer.from(this.serverName, 'ucs2');
      offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
      dataOffset += buffer.length;
      buffers.push(buffer);
    } else {
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // (ibUnused / ibExtension): 2-byte
    // For TDS 7.4+, this points to a 4-byte offset (ibFeatureExtLong) in the data section.
    // The actual FeatureExt data is placed at the END of the packet per MS-TDS spec.
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // (cchUnused / cbExtension): 2-byte
    // For TDS 7.4+, this is the size of the ibFeatureExtLong offset pointer (4 bytes).
    // The actual FeatureExt data is appended at the end of the packet, not here.
    // We'll store the FeatureExt data to append at the end after all other variable data.
    let featureExtData;
    let extensionOffsetBuffer;
    if (this.tdsVersion >= _tdsVersions.versions['7_4']) {
      featureExtData = this.buildFeatureExt();
      // cbExtension = 4 (size of the ibFeatureExtLong pointer, not the FeatureExt data)
      offset = fixedData.writeUInt16LE(4, offset);
      // Reserve space for the 4-byte offset pointer; we'll fill in the actual offset later
      extensionOffsetBuffer = Buffer.alloc(4);
      buffers.push(extensionOffsetBuffer);
      dataOffset += 4;
    } else {
      // For TDS < 7.4, these are unused fields
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // ibCltIntName: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cchCltIntName: 2-byte
    if (this.libraryName) {
      const buffer = Buffer.from(this.libraryName, 'ucs2');
      offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
      dataOffset += buffer.length;
      buffers.push(buffer);
    } else {
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // ibLanguage: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cchLanguage: 2-byte
    if (this.language) {
      const buffer = Buffer.from(this.language, 'ucs2');
      offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
      dataOffset += buffer.length;
      buffers.push(buffer);
    } else {
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // ibDatabase: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cchDatabase: 2-byte
    if (this.database) {
      const buffer = Buffer.from(this.database, 'ucs2');
      offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
      dataOffset += buffer.length;
      buffers.push(buffer);
    } else {
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // ClientID: 6-byte
    if (this.clientId) {
      this.clientId.copy(fixedData, offset, 0, 6);
    }
    offset += 6;

    // ibSSPI: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cbSSPI: 2-byte
    if (this.sspi) {
      if (this.sspi.length > 65535) {
        offset = fixedData.writeUInt16LE(65535, offset);
      } else {
        offset = fixedData.writeUInt16LE(this.sspi.length, offset);
      }
      buffers.push(this.sspi);
      dataOffset += this.sspi.length;
    } else {
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // ibAtchDBFile: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cchAtchDBFile: 2-byte
    if (this.attachDbFile) {
      const buffer = Buffer.from(this.attachDbFile, 'ucs2');
      offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
      dataOffset += buffer.length;
      buffers.push(buffer);
    } else {
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // ibChangePassword: 2-byte
    offset = fixedData.writeUInt16LE(dataOffset, offset);

    // cchChangePassword: 2-byte
    if (this.changePassword) {
      const buffer = Buffer.from(this.changePassword, 'ucs2');
      offset = fixedData.writeUInt16LE(buffer.length / 2, offset);
      dataOffset += buffer.length;
      buffers.push(buffer);
    } else {
      offset = fixedData.writeUInt16LE(0, offset);
    }

    // cbSSPILong: 4-byte
    if (this.sspi && this.sspi.length > 65535) {
      fixedData.writeUInt32LE(this.sspi.length, offset);
    } else {
      fixedData.writeUInt32LE(0, offset);
    }

    // Per MS-TDS spec, FeatureExt data must be at the END of the packet,
    // after all other variable-length data.
    if (featureExtData && extensionOffsetBuffer) {
      // Update the ibFeatureExtLong offset to point to where FeatureExt will be
      extensionOffsetBuffer.writeUInt32LE(dataOffset, 0);
      // Append FeatureExt data at the end
      buffers.push(featureExtData);
    }
    const data = Buffer.concat(buffers);
    data.writeUInt32LE(data.length, 0);
    return data;
  }
  buildOptionFlags1() {
    let flags1 = FLAGS_1.ENDIAN_LITTLE | FLAGS_1.CHARSET_ASCII | FLAGS_1.FLOAT_IEEE_754 | FLAGS_1.BCP_DUMPLOAD_OFF | FLAGS_1.USE_DB_OFF | FLAGS_1.SET_LANG_WARN_ON;
    if (this.initDbFatal) {
      flags1 |= FLAGS_1.INIT_DB_FATAL;
    } else {
      flags1 |= FLAGS_1.INIT_DB_WARN;
    }
    return flags1;
  }
  buildFeatureExt() {
    const buffers = [];
    const fedAuth = this.fedAuth;
    if (fedAuth) {
      switch (fedAuth.type) {
        case 'ADAL':
          const buffer = Buffer.alloc(7);
          buffer.writeUInt8(FEDAUTH_OPTIONS.FEATURE_ID, 0);
          buffer.writeUInt32LE(2, 1);
          buffer.writeUInt8(FEDAUTH_OPTIONS.LIBRARY_ADAL << 1 | (fedAuth.echo ? FEDAUTH_OPTIONS.FEDAUTH_YES_ECHO : FEDAUTH_OPTIONS.FEDAUTH_NO_ECHO), 5);
          buffer.writeUInt8(fedAuth.workflow === 'integrated' ? 0x02 : FEDAUTH_OPTIONS.ADAL_WORKFLOW_USER_PASS, 6);
          buffers.push(buffer);
          break;
        case 'SECURITYTOKEN':
          const token = Buffer.from(fedAuth.fedAuthToken, 'ucs2');
          const buf = Buffer.alloc(10);
          let offset = 0;
          offset = buf.writeUInt8(FEDAUTH_OPTIONS.FEATURE_ID, offset);
          offset = buf.writeUInt32LE(token.length + 4 + 1, offset);
          offset = buf.writeUInt8(FEDAUTH_OPTIONS.LIBRARY_SECURITYTOKEN << 1 | (fedAuth.echo ? FEDAUTH_OPTIONS.FEDAUTH_YES_ECHO : FEDAUTH_OPTIONS.FEDAUTH_NO_ECHO), offset);
          buf.writeInt32LE(token.length, offset);
          buffers.push(buf);
          buffers.push(token);
          break;
      }
    }

    // Signal UTF-8 support: Value 0x0A, bit 0 must be set to 1. Added in TDS 7.4.
    const UTF8_SUPPORT_FEATURE_ID = 0x0a;
    const UTF8_SUPPORT_CLIENT_SUPPORTS_UTF8 = 0x01;
    const buf = Buffer.alloc(6);
    buf.writeUInt8(UTF8_SUPPORT_FEATURE_ID, 0);
    buf.writeUInt32LE(1, 1);
    buf.writeUInt8(UTF8_SUPPORT_CLIENT_SUPPORTS_UTF8, 5);
    buffers.push(buf);
    buffers.push(Buffer.from([FEATURE_EXT_TERMINATOR]));
    return Buffer.concat(buffers);
  }
  buildOptionFlags2() {
    let flags2 = FLAGS_2.INIT_LANG_WARN | FLAGS_2.ODBC_OFF | FLAGS_2.USER_NORMAL;
    if (this.sspi) {
      flags2 |= FLAGS_2.INTEGRATED_SECURITY_ON;
    } else {
      flags2 |= FLAGS_2.INTEGRATED_SECURITY_OFF;
    }
    return flags2;
  }
  buildTypeFlags() {
    let typeFlags = TYPE_FLAGS.SQL_DFLT | TYPE_FLAGS.OLEDB_OFF;
    if (this.readOnlyIntent) {
      typeFlags |= TYPE_FLAGS.READ_ONLY_INTENT;
    } else {
      typeFlags |= TYPE_FLAGS.READ_WRITE_INTENT;
    }
    return typeFlags;
  }
  buildOptionFlags3() {
    return FLAGS_3.CHANGE_PASSWORD_NO | FLAGS_3.UNKNOWN_COLLATION_HANDLING | FLAGS_3.EXTENSION_USED;
  }
  scramblePassword(password) {
    for (let b = 0, len = password.length; b < len; b++) {
      let byte = password[b];
      const lowNibble = byte & 0x0f;
      const highNibble = byte >> 4;
      byte = lowNibble << 4 | highNibble;
      byte = byte ^ 0xa5;
      password[b] = byte;
    }
    return password;
  }
  toString(indent = '') {
    return indent + 'Login7 - ' + (0, _sprintfJs.sprintf)('TDS:0x%08X, PacketSize:0x%08X, ClientProgVer:0x%08X, ClientPID:0x%08X, ConnectionID:0x%08X', this.tdsVersion, this.packetSize, this.clientProgVer, this.clientPid, this.connectionId) + '\n' + indent + '         ' + (0, _sprintfJs.sprintf)('Flags1:0x%02X, Flags2:0x%02X, TypeFlags:0x%02X, Flags3:0x%02X, ClientTimezone:%d, ClientLCID:0x%08X', this.buildOptionFlags1(), this.buildOptionFlags2(), this.buildTypeFlags(), this.buildOptionFlags3(), this.clientTimeZone, this.clientLcid) + '\n' + indent + '         ' + (0, _sprintfJs.sprintf)("Hostname:'%s', Username:'%s', Password:'%s', AppName:'%s', ServerName:'%s', LibraryName:'%s'", this.hostname, this.userName, this.password, this.appName, this.serverName, this.libraryName) + '\n' + indent + '         ' + (0, _sprintfJs.sprintf)("Language:'%s', Database:'%s', SSPI:'%s', AttachDbFile:'%s', ChangePassword:'%s'", this.language, this.database, this.sspi, this.attachDbFile, this.changePassword);
  }
}
var _default = exports.default = Login7Payload;
module.exports = Login7Payload;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfc3ByaW50ZkpzIiwicmVxdWlyZSIsIl90ZHNWZXJzaW9ucyIsIkZMQUdTXzEiLCJFTkRJQU5fTElUVExFIiwiRU5ESUFOX0JJRyIsIkNIQVJTRVRfQVNDSUkiLCJDSEFSU0VUX0VCQ0RJQyIsIkZMT0FUX0lFRUVfNzU0IiwiRkxPQVRfVkFYIiwiRkxPQVRfTkQ1MDAwIiwiQkNQX0RVTVBMT0FEX09OIiwiQkNQX0RVTVBMT0FEX09GRiIsIlVTRV9EQl9PTiIsIlVTRV9EQl9PRkYiLCJJTklUX0RCX1dBUk4iLCJJTklUX0RCX0ZBVEFMIiwiU0VUX0xBTkdfV0FSTl9PRkYiLCJTRVRfTEFOR19XQVJOX09OIiwiRkxBR1NfMiIsIklOSVRfTEFOR19XQVJOIiwiSU5JVF9MQU5HX0ZBVEFMIiwiT0RCQ19PRkYiLCJPREJDX09OIiwiRl9UUkFOX0JPVU5EQVJZIiwiRl9DQUNIRV9DT05ORUNUIiwiVVNFUl9OT1JNQUwiLCJVU0VSX1NFUlZFUiIsIlVTRVJfUkVNVVNFUiIsIlVTRVJfU1FMUkVQTCIsIklOVEVHUkFURURfU0VDVVJJVFlfT0ZGIiwiSU5URUdSQVRFRF9TRUNVUklUWV9PTiIsIlRZUEVfRkxBR1MiLCJTUUxfREZMVCIsIlNRTF9UU1FMIiwiT0xFREJfT0ZGIiwiT0xFREJfT04iLCJSRUFEX1dSSVRFX0lOVEVOVCIsIlJFQURfT05MWV9JTlRFTlQiLCJGTEFHU18zIiwiQ0hBTkdFX1BBU1NXT1JEX05PIiwiQ0hBTkdFX1BBU1NXT1JEX1lFUyIsIkJJTkFSWV9YTUwiLCJTUEFXTl9VU0VSX0lOU1RBTkNFIiwiVU5LTk9XTl9DT0xMQVRJT05fSEFORExJTkciLCJFWFRFTlNJT05fVVNFRCIsIkZFREFVVEhfT1BUSU9OUyIsIkZFQVRVUkVfSUQiLCJMSUJSQVJZX1NFQ1VSSVRZVE9LRU4iLCJMSUJSQVJZX0FEQUwiLCJGRURBVVRIX1lFU19FQ0hPIiwiRkVEQVVUSF9OT19FQ0hPIiwiQURBTF9XT1JLRkxPV19VU0VSX1BBU1MiLCJBREFMX1dPUktGTE9XX0lOVEVHUkFURUQiLCJGRUFUVVJFX0VYVF9URVJNSU5BVE9SIiwiTG9naW43UGF5bG9hZCIsImNvbnN0cnVjdG9yIiwidGRzVmVyc2lvbiIsInBhY2tldFNpemUiLCJjbGllbnRQcm9nVmVyIiwiY2xpZW50UGlkIiwiY29ubmVjdGlvbklkIiwiY2xpZW50VGltZVpvbmUiLCJjbGllbnRMY2lkIiwicmVhZE9ubHlJbnRlbnQiLCJpbml0RGJGYXRhbCIsImZlZEF1dGgiLCJ1bmRlZmluZWQiLCJ1c2VyTmFtZSIsInBhc3N3b3JkIiwic2VydmVyTmFtZSIsImFwcE5hbWUiLCJob3N0bmFtZSIsImxpYnJhcnlOYW1lIiwibGFuZ3VhZ2UiLCJkYXRhYmFzZSIsImNsaWVudElkIiwic3NwaSIsImF0dGFjaERiRmlsZSIsImNoYW5nZVBhc3N3b3JkIiwidG9CdWZmZXIiLCJmaXhlZERhdGEiLCJCdWZmZXIiLCJhbGxvYyIsImJ1ZmZlcnMiLCJvZmZzZXQiLCJkYXRhT2Zmc2V0IiwibGVuZ3RoIiwid3JpdGVVSW50MzJMRSIsIndyaXRlVUludDgiLCJidWlsZE9wdGlvbkZsYWdzMSIsImJ1aWxkT3B0aW9uRmxhZ3MyIiwiYnVpbGRUeXBlRmxhZ3MiLCJidWlsZE9wdGlvbkZsYWdzMyIsIndyaXRlSW50MzJMRSIsIndyaXRlVUludDE2TEUiLCJidWZmZXIiLCJmcm9tIiwicHVzaCIsInNjcmFtYmxlUGFzc3dvcmQiLCJmZWF0dXJlRXh0RGF0YSIsImV4dGVuc2lvbk9mZnNldEJ1ZmZlciIsInZlcnNpb25zIiwiYnVpbGRGZWF0dXJlRXh0IiwiY29weSIsImRhdGEiLCJjb25jYXQiLCJmbGFnczEiLCJ0eXBlIiwiZWNobyIsIndvcmtmbG93IiwidG9rZW4iLCJmZWRBdXRoVG9rZW4iLCJidWYiLCJVVEY4X1NVUFBPUlRfRkVBVFVSRV9JRCIsIlVURjhfU1VQUE9SVF9DTElFTlRfU1VQUE9SVFNfVVRGOCIsImZsYWdzMiIsInR5cGVGbGFncyIsImIiLCJsZW4iLCJieXRlIiwibG93TmliYmxlIiwiaGlnaE5pYmJsZSIsInRvU3RyaW5nIiwiaW5kZW50Iiwic3ByaW50ZiIsIl9kZWZhdWx0IiwiZXhwb3J0cyIsImRlZmF1bHQiLCJtb2R1bGUiXSwic291cmNlcyI6WyIuLi9zcmMvbG9naW43LXBheWxvYWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc3ByaW50ZiB9IGZyb20gJ3NwcmludGYtanMnO1xuaW1wb3J0IHsgdmVyc2lvbnMgfSBmcm9tICcuL3Rkcy12ZXJzaW9ucyc7XG5cbmNvbnN0IEZMQUdTXzEgPSB7XG4gIEVORElBTl9MSVRUTEU6IDB4MDAsXG4gIEVORElBTl9CSUc6IDB4MDEsXG4gIENIQVJTRVRfQVNDSUk6IDB4MDAsXG4gIENIQVJTRVRfRUJDRElDOiAweDAyLFxuICBGTE9BVF9JRUVFXzc1NDogMHgwMCxcbiAgRkxPQVRfVkFYOiAweDA0LFxuICBGTE9BVF9ORDUwMDA6IDB4MDgsXG4gIEJDUF9EVU1QTE9BRF9PTjogMHgwMCxcbiAgQkNQX0RVTVBMT0FEX09GRjogMHgxMCxcbiAgVVNFX0RCX09OOiAweDAwLFxuICBVU0VfREJfT0ZGOiAweDIwLFxuICBJTklUX0RCX1dBUk46IDB4MDAsXG4gIElOSVRfREJfRkFUQUw6IDB4NDAsXG4gIFNFVF9MQU5HX1dBUk5fT0ZGOiAweDAwLFxuICBTRVRfTEFOR19XQVJOX09OOiAweDgwXG59O1xuXG5jb25zdCBGTEFHU18yID0ge1xuICBJTklUX0xBTkdfV0FSTjogMHgwMCxcbiAgSU5JVF9MQU5HX0ZBVEFMOiAweDAxLFxuICBPREJDX09GRjogMHgwMCxcbiAgT0RCQ19PTjogMHgwMixcbiAgRl9UUkFOX0JPVU5EQVJZOiAweDA0LFxuICBGX0NBQ0hFX0NPTk5FQ1Q6IDB4MDgsXG4gIFVTRVJfTk9STUFMOiAweDAwLFxuICBVU0VSX1NFUlZFUjogMHgxMCxcbiAgVVNFUl9SRU1VU0VSOiAweDIwLFxuICBVU0VSX1NRTFJFUEw6IDB4NDAsXG4gIElOVEVHUkFURURfU0VDVVJJVFlfT0ZGOiAweDAwLFxuICBJTlRFR1JBVEVEX1NFQ1VSSVRZX09OOiAweDgwXG59O1xuXG5jb25zdCBUWVBFX0ZMQUdTID0ge1xuICBTUUxfREZMVDogMHgwMCxcbiAgU1FMX1RTUUw6IDB4MDgsXG4gIE9MRURCX09GRjogMHgwMCxcbiAgT0xFREJfT046IDB4MTAsXG4gIFJFQURfV1JJVEVfSU5URU5UOiAweDAwLFxuICBSRUFEX09OTFlfSU5URU5UOiAweDIwXG59O1xuXG5jb25zdCBGTEFHU18zID0ge1xuICBDSEFOR0VfUEFTU1dPUkRfTk86IDB4MDAsXG4gIENIQU5HRV9QQVNTV09SRF9ZRVM6IDB4MDEsXG4gIEJJTkFSWV9YTUw6IDB4MDIsXG4gIFNQQVdOX1VTRVJfSU5TVEFOQ0U6IDB4MDQsXG4gIFVOS05PV05fQ09MTEFUSU9OX0hBTkRMSU5HOiAweDA4LFxuICBFWFRFTlNJT05fVVNFRDogMHgxMFxufTtcblxuY29uc3QgRkVEQVVUSF9PUFRJT05TID0ge1xuICBGRUFUVVJFX0lEOiAweDAyLFxuICBMSUJSQVJZX1NFQ1VSSVRZVE9LRU46IDB4MDEsXG4gIExJQlJBUllfQURBTDogMHgwMixcbiAgRkVEQVVUSF9ZRVNfRUNITzogMHgwMSxcbiAgRkVEQVVUSF9OT19FQ0hPOiAweDAwLFxuICBBREFMX1dPUktGTE9XX1VTRVJfUEFTUzogMHgwMSxcbiAgQURBTF9XT1JLRkxPV19JTlRFR1JBVEVEOiAweDAyXG59O1xuXG5jb25zdCBGRUFUVVJFX0VYVF9URVJNSU5BVE9SID0gMHhGRjtcblxuaW50ZXJmYWNlIE9wdGlvbnMge1xuICB0ZHNWZXJzaW9uOiBudW1iZXI7XG4gIHBhY2tldFNpemU6IG51bWJlcjtcbiAgY2xpZW50UHJvZ1ZlcjogbnVtYmVyO1xuICBjbGllbnRQaWQ6IG51bWJlcjtcbiAgY29ubmVjdGlvbklkOiBudW1iZXI7XG4gIGNsaWVudFRpbWVab25lOiBudW1iZXI7XG4gIGNsaWVudExjaWQ6IG51bWJlcjtcbn1cblxuLypcbiAgczIuMi42LjNcbiAqL1xuY2xhc3MgTG9naW43UGF5bG9hZCB7XG4gIGRlY2xhcmUgdGRzVmVyc2lvbjogbnVtYmVyO1xuICBkZWNsYXJlIHBhY2tldFNpemU6IG51bWJlcjtcbiAgZGVjbGFyZSBjbGllbnRQcm9nVmVyOiBudW1iZXI7XG4gIGRlY2xhcmUgY2xpZW50UGlkOiBudW1iZXI7XG4gIGRlY2xhcmUgY29ubmVjdGlvbklkOiBudW1iZXI7XG4gIGRlY2xhcmUgY2xpZW50VGltZVpvbmU6IG51bWJlcjtcbiAgZGVjbGFyZSBjbGllbnRMY2lkOiBudW1iZXI7XG5cbiAgZGVjbGFyZSByZWFkT25seUludGVudDogYm9vbGVhbjtcbiAgZGVjbGFyZSBpbml0RGJGYXRhbDogYm9vbGVhbjtcblxuICBkZWNsYXJlIHVzZXJOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGRlY2xhcmUgcGFzc3dvcmQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgZGVjbGFyZSBzZXJ2ZXJOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGRlY2xhcmUgYXBwTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBkZWNsYXJlIGhvc3RuYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGRlY2xhcmUgbGlicmFyeU5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgZGVjbGFyZSBsYW5ndWFnZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBkZWNsYXJlIGRhdGFiYXNlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGRlY2xhcmUgY2xpZW50SWQ6IEJ1ZmZlciB8IHVuZGVmaW5lZDtcbiAgZGVjbGFyZSBzc3BpOiBCdWZmZXIgfCB1bmRlZmluZWQ7XG4gIGRlY2xhcmUgYXR0YWNoRGJGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGRlY2xhcmUgY2hhbmdlUGFzc3dvcmQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBkZWNsYXJlIGZlZEF1dGg6IHsgdHlwZTogJ0FEQUwnLCBlY2hvOiBib29sZWFuLCB3b3JrZmxvdzogJ2RlZmF1bHQnIHwgJ2ludGVncmF0ZWQnIH0gfCB7IHR5cGU6ICdTRUNVUklUWVRPS0VOJywgZWNobzogYm9vbGVhbiwgZmVkQXV0aFRva2VuOiBzdHJpbmcgfSB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3Rvcih7IHRkc1ZlcnNpb24sIHBhY2tldFNpemUsIGNsaWVudFByb2dWZXIsIGNsaWVudFBpZCwgY29ubmVjdGlvbklkLCBjbGllbnRUaW1lWm9uZSwgY2xpZW50TGNpZCB9OiBPcHRpb25zKSB7XG4gICAgdGhpcy50ZHNWZXJzaW9uID0gdGRzVmVyc2lvbjtcbiAgICB0aGlzLnBhY2tldFNpemUgPSBwYWNrZXRTaXplO1xuICAgIHRoaXMuY2xpZW50UHJvZ1ZlciA9IGNsaWVudFByb2dWZXI7XG4gICAgdGhpcy5jbGllbnRQaWQgPSBjbGllbnRQaWQ7XG4gICAgdGhpcy5jb25uZWN0aW9uSWQgPSBjb25uZWN0aW9uSWQ7XG4gICAgdGhpcy5jbGllbnRUaW1lWm9uZSA9IGNsaWVudFRpbWVab25lO1xuICAgIHRoaXMuY2xpZW50TGNpZCA9IGNsaWVudExjaWQ7XG5cbiAgICB0aGlzLnJlYWRPbmx5SW50ZW50ID0gZmFsc2U7XG4gICAgdGhpcy5pbml0RGJGYXRhbCA9IGZhbHNlO1xuXG4gICAgdGhpcy5mZWRBdXRoID0gdW5kZWZpbmVkO1xuXG4gICAgdGhpcy51c2VyTmFtZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnBhc3N3b3JkID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuc2VydmVyTmFtZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmFwcE5hbWUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5ob3N0bmFtZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmxpYnJhcnlOYW1lID0gdW5kZWZpbmVkO1xuICAgIHRoaXMubGFuZ3VhZ2UgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5kYXRhYmFzZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmNsaWVudElkID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuc3NwaSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmF0dGFjaERiRmlsZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmNoYW5nZVBhc3N3b3JkID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgdG9CdWZmZXIoKSB7XG4gICAgY29uc3QgZml4ZWREYXRhID0gQnVmZmVyLmFsbG9jKDk0KTtcbiAgICBjb25zdCBidWZmZXJzOiBCdWZmZXJbXSA9IFtmaXhlZERhdGFdO1xuXG4gICAgbGV0IG9mZnNldCA9IDA7XG4gICAgbGV0IGRhdGFPZmZzZXQgPSBmaXhlZERhdGEubGVuZ3RoO1xuXG4gICAgLy8gTGVuZ3RoOiA0LWJ5dGVcbiAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MzJMRSgwLCBvZmZzZXQpO1xuXG4gICAgLy8gVERTVmVyc2lvbjogNC1ieXRlXG4gICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDMyTEUodGhpcy50ZHNWZXJzaW9uLCBvZmZzZXQpO1xuXG4gICAgLy8gUGFja2V0U2l6ZTogNC1ieXRlXG4gICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDMyTEUodGhpcy5wYWNrZXRTaXplLCBvZmZzZXQpO1xuXG4gICAgLy8gQ2xpZW50UHJvZ1ZlcjogNC1ieXRlXG4gICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDMyTEUodGhpcy5jbGllbnRQcm9nVmVyLCBvZmZzZXQpO1xuXG4gICAgLy8gQ2xpZW50UElEOiA0LWJ5dGVcbiAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MzJMRSh0aGlzLmNsaWVudFBpZCwgb2Zmc2V0KTtcblxuICAgIC8vIENvbm5lY3Rpb25JRDogNC1ieXRlXG4gICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDMyTEUodGhpcy5jb25uZWN0aW9uSWQsIG9mZnNldCk7XG5cbiAgICAvLyBPcHRpb25GbGFnczE6IDEtYnl0ZVxuICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQ4KHRoaXMuYnVpbGRPcHRpb25GbGFnczEoKSwgb2Zmc2V0KTtcblxuICAgIC8vIE9wdGlvbkZsYWdzMjogMS1ieXRlXG4gICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDgodGhpcy5idWlsZE9wdGlvbkZsYWdzMigpLCBvZmZzZXQpO1xuXG4gICAgLy8gVHlwZUZsYWdzOiAxLWJ5dGVcbiAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50OCh0aGlzLmJ1aWxkVHlwZUZsYWdzKCksIG9mZnNldCk7XG5cbiAgICAvLyBPcHRpb25GbGFnczM6IDEtYnl0ZVxuICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQ4KHRoaXMuYnVpbGRPcHRpb25GbGFnczMoKSwgb2Zmc2V0KTtcblxuICAgIC8vIENsaWVudFRpbVpvbmU6IDQtYnl0ZVxuICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZUludDMyTEUodGhpcy5jbGllbnRUaW1lWm9uZSwgb2Zmc2V0KTtcblxuICAgIC8vIENsaWVudExDSUQ6IDQtYnl0ZVxuICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQzMkxFKHRoaXMuY2xpZW50TGNpZCwgb2Zmc2V0KTtcblxuICAgIC8vIGliSG9zdE5hbWU6IDItYnl0ZVxuICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKGRhdGFPZmZzZXQsIG9mZnNldCk7XG5cbiAgICAvLyBjY2hIb3N0TmFtZTogMi1ieXRlXG4gICAgaWYgKHRoaXMuaG9zdG5hbWUpIHtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5mcm9tKHRoaXMuaG9zdG5hbWUsICd1Y3MyJyk7XG5cbiAgICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKGJ1ZmZlci5sZW5ndGggLyAyLCBvZmZzZXQpO1xuICAgICAgZGF0YU9mZnNldCArPSBidWZmZXIubGVuZ3RoO1xuXG4gICAgICBidWZmZXJzLnB1c2goYnVmZmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDE2TEUoZGF0YU9mZnNldCwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICAvLyBpYlVzZXJOYW1lOiAyLWJ5dGVcbiAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRShkYXRhT2Zmc2V0LCBvZmZzZXQpO1xuXG4gICAgLy8gY2NoVXNlck5hbWU6IDItYnl0ZVxuICAgIGlmICh0aGlzLnVzZXJOYW1lKSB7XG4gICAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbSh0aGlzLnVzZXJOYW1lLCAndWNzMicpO1xuXG4gICAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRShidWZmZXIubGVuZ3RoIC8gMiwgb2Zmc2V0KTtcbiAgICAgIGRhdGFPZmZzZXQgKz0gYnVmZmVyLmxlbmd0aDtcblxuICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKDAsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgLy8gaWJQYXNzd29yZDogMi1ieXRlXG4gICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDE2TEUoZGF0YU9mZnNldCwgb2Zmc2V0KTtcblxuICAgIC8vIGNjaFBhc3N3b3JkOiAyLWJ5dGVcbiAgICBpZiAodGhpcy5wYXNzd29yZCkge1xuICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmZyb20odGhpcy5wYXNzd29yZCwgJ3VjczInKTtcblxuICAgICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDE2TEUoYnVmZmVyLmxlbmd0aCAvIDIsIG9mZnNldCk7XG4gICAgICBkYXRhT2Zmc2V0ICs9IGJ1ZmZlci5sZW5ndGg7XG5cbiAgICAgIGJ1ZmZlcnMucHVzaCh0aGlzLnNjcmFtYmxlUGFzc3dvcmQoYnVmZmVyKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKDAsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgLy8gaWJBcHBOYW1lOiAyLWJ5dGVcbiAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRShkYXRhT2Zmc2V0LCBvZmZzZXQpO1xuXG4gICAgLy8gY2NoQXBwTmFtZTogMi1ieXRlXG4gICAgaWYgKHRoaXMuYXBwTmFtZSkge1xuICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmZyb20odGhpcy5hcHBOYW1lLCAndWNzMicpO1xuXG4gICAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRShidWZmZXIubGVuZ3RoIC8gMiwgb2Zmc2V0KTtcbiAgICAgIGRhdGFPZmZzZXQgKz0gYnVmZmVyLmxlbmd0aDtcblxuICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKDAsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgLy8gaWJTZXJ2ZXJOYW1lOiAyLWJ5dGVcbiAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRShkYXRhT2Zmc2V0LCBvZmZzZXQpO1xuXG4gICAgLy8gY2NoU2VydmVyTmFtZTogMi1ieXRlXG4gICAgaWYgKHRoaXMuc2VydmVyTmFtZSkge1xuICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmZyb20odGhpcy5zZXJ2ZXJOYW1lLCAndWNzMicpO1xuXG4gICAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRShidWZmZXIubGVuZ3RoIC8gMiwgb2Zmc2V0KTtcbiAgICAgIGRhdGFPZmZzZXQgKz0gYnVmZmVyLmxlbmd0aDtcblxuICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKDAsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgLy8gKGliVW51c2VkIC8gaWJFeHRlbnNpb24pOiAyLWJ5dGVcbiAgICAvLyBGb3IgVERTIDcuNCssIHRoaXMgcG9pbnRzIHRvIGEgNC1ieXRlIG9mZnNldCAoaWJGZWF0dXJlRXh0TG9uZykgaW4gdGhlIGRhdGEgc2VjdGlvbi5cbiAgICAvLyBUaGUgYWN0dWFsIEZlYXR1cmVFeHQgZGF0YSBpcyBwbGFjZWQgYXQgdGhlIEVORCBvZiB0aGUgcGFja2V0IHBlciBNUy1URFMgc3BlYy5cbiAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRShkYXRhT2Zmc2V0LCBvZmZzZXQpO1xuXG4gICAgLy8gKGNjaFVudXNlZCAvIGNiRXh0ZW5zaW9uKTogMi1ieXRlXG4gICAgLy8gRm9yIFREUyA3LjQrLCB0aGlzIGlzIHRoZSBzaXplIG9mIHRoZSBpYkZlYXR1cmVFeHRMb25nIG9mZnNldCBwb2ludGVyICg0IGJ5dGVzKS5cbiAgICAvLyBUaGUgYWN0dWFsIEZlYXR1cmVFeHQgZGF0YSBpcyBhcHBlbmRlZCBhdCB0aGUgZW5kIG9mIHRoZSBwYWNrZXQsIG5vdCBoZXJlLlxuICAgIC8vIFdlJ2xsIHN0b3JlIHRoZSBGZWF0dXJlRXh0IGRhdGEgdG8gYXBwZW5kIGF0IHRoZSBlbmQgYWZ0ZXIgYWxsIG90aGVyIHZhcmlhYmxlIGRhdGEuXG4gICAgbGV0IGZlYXR1cmVFeHREYXRhOiBCdWZmZXIgfCB1bmRlZmluZWQ7XG4gICAgbGV0IGV4dGVuc2lvbk9mZnNldEJ1ZmZlcjogQnVmZmVyIHwgdW5kZWZpbmVkO1xuICAgIGlmICh0aGlzLnRkc1ZlcnNpb24gPj0gdmVyc2lvbnNbJzdfNCddKSB7XG4gICAgICBmZWF0dXJlRXh0RGF0YSA9IHRoaXMuYnVpbGRGZWF0dXJlRXh0KCk7XG4gICAgICAvLyBjYkV4dGVuc2lvbiA9IDQgKHNpemUgb2YgdGhlIGliRmVhdHVyZUV4dExvbmcgcG9pbnRlciwgbm90IHRoZSBGZWF0dXJlRXh0IGRhdGEpXG4gICAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRSg0LCBvZmZzZXQpO1xuICAgICAgLy8gUmVzZXJ2ZSBzcGFjZSBmb3IgdGhlIDQtYnl0ZSBvZmZzZXQgcG9pbnRlcjsgd2UnbGwgZmlsbCBpbiB0aGUgYWN0dWFsIG9mZnNldCBsYXRlclxuICAgICAgZXh0ZW5zaW9uT2Zmc2V0QnVmZmVyID0gQnVmZmVyLmFsbG9jKDQpO1xuICAgICAgYnVmZmVycy5wdXNoKGV4dGVuc2lvbk9mZnNldEJ1ZmZlcik7XG4gICAgICBkYXRhT2Zmc2V0ICs9IDQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZvciBURFMgPCA3LjQsIHRoZXNlIGFyZSB1bnVzZWQgZmllbGRzXG4gICAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRSgwLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIC8vIGliQ2x0SW50TmFtZTogMi1ieXRlXG4gICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDE2TEUoZGF0YU9mZnNldCwgb2Zmc2V0KTtcblxuICAgIC8vIGNjaENsdEludE5hbWU6IDItYnl0ZVxuICAgIGlmICh0aGlzLmxpYnJhcnlOYW1lKSB7XG4gICAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbSh0aGlzLmxpYnJhcnlOYW1lLCAndWNzMicpO1xuXG4gICAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRShidWZmZXIubGVuZ3RoIC8gMiwgb2Zmc2V0KTtcbiAgICAgIGRhdGFPZmZzZXQgKz0gYnVmZmVyLmxlbmd0aDtcblxuICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKDAsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgLy8gaWJMYW5ndWFnZTogMi1ieXRlXG4gICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDE2TEUoZGF0YU9mZnNldCwgb2Zmc2V0KTtcblxuICAgIC8vIGNjaExhbmd1YWdlOiAyLWJ5dGVcbiAgICBpZiAodGhpcy5sYW5ndWFnZSkge1xuICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmZyb20odGhpcy5sYW5ndWFnZSwgJ3VjczInKTtcblxuICAgICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDE2TEUoYnVmZmVyLmxlbmd0aCAvIDIsIG9mZnNldCk7XG4gICAgICBkYXRhT2Zmc2V0ICs9IGJ1ZmZlci5sZW5ndGg7XG5cbiAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRSgwLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIC8vIGliRGF0YWJhc2U6IDItYnl0ZVxuICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKGRhdGFPZmZzZXQsIG9mZnNldCk7XG5cbiAgICAvLyBjY2hEYXRhYmFzZTogMi1ieXRlXG4gICAgaWYgKHRoaXMuZGF0YWJhc2UpIHtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5mcm9tKHRoaXMuZGF0YWJhc2UsICd1Y3MyJyk7XG5cbiAgICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKGJ1ZmZlci5sZW5ndGggLyAyLCBvZmZzZXQpO1xuICAgICAgZGF0YU9mZnNldCArPSBidWZmZXIubGVuZ3RoO1xuXG4gICAgICBidWZmZXJzLnB1c2goYnVmZmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDE2TEUoMCwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICAvLyBDbGllbnRJRDogNi1ieXRlXG4gICAgaWYgKHRoaXMuY2xpZW50SWQpIHtcbiAgICAgIHRoaXMuY2xpZW50SWQuY29weShmaXhlZERhdGEsIG9mZnNldCwgMCwgNik7XG4gICAgfVxuICAgIG9mZnNldCArPSA2O1xuXG4gICAgLy8gaWJTU1BJOiAyLWJ5dGVcbiAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRShkYXRhT2Zmc2V0LCBvZmZzZXQpO1xuXG4gICAgLy8gY2JTU1BJOiAyLWJ5dGVcbiAgICBpZiAodGhpcy5zc3BpKSB7XG4gICAgICBpZiAodGhpcy5zc3BpLmxlbmd0aCA+IDY1NTM1KSB7XG4gICAgICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKDY1NTM1LCBvZmZzZXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDE2TEUodGhpcy5zc3BpLmxlbmd0aCwgb2Zmc2V0KTtcbiAgICAgIH1cblxuICAgICAgYnVmZmVycy5wdXNoKHRoaXMuc3NwaSk7XG4gICAgICBkYXRhT2Zmc2V0ICs9IHRoaXMuc3NwaS5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKDAsIG9mZnNldCk7XG4gICAgfVxuXG4gICAgLy8gaWJBdGNoREJGaWxlOiAyLWJ5dGVcbiAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRShkYXRhT2Zmc2V0LCBvZmZzZXQpO1xuXG4gICAgLy8gY2NoQXRjaERCRmlsZTogMi1ieXRlXG4gICAgaWYgKHRoaXMuYXR0YWNoRGJGaWxlKSB7XG4gICAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbSh0aGlzLmF0dGFjaERiRmlsZSwgJ3VjczInKTtcblxuICAgICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDE2TEUoYnVmZmVyLmxlbmd0aCAvIDIsIG9mZnNldCk7XG4gICAgICBkYXRhT2Zmc2V0ICs9IGJ1ZmZlci5sZW5ndGg7XG5cbiAgICAgIGJ1ZmZlcnMucHVzaChidWZmZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvZmZzZXQgPSBmaXhlZERhdGEud3JpdGVVSW50MTZMRSgwLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIC8vIGliQ2hhbmdlUGFzc3dvcmQ6IDItYnl0ZVxuICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKGRhdGFPZmZzZXQsIG9mZnNldCk7XG5cbiAgICAvLyBjY2hDaGFuZ2VQYXNzd29yZDogMi1ieXRlXG4gICAgaWYgKHRoaXMuY2hhbmdlUGFzc3dvcmQpIHtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5mcm9tKHRoaXMuY2hhbmdlUGFzc3dvcmQsICd1Y3MyJyk7XG5cbiAgICAgIG9mZnNldCA9IGZpeGVkRGF0YS53cml0ZVVJbnQxNkxFKGJ1ZmZlci5sZW5ndGggLyAyLCBvZmZzZXQpO1xuICAgICAgZGF0YU9mZnNldCArPSBidWZmZXIubGVuZ3RoO1xuXG4gICAgICBidWZmZXJzLnB1c2goYnVmZmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2Zmc2V0ID0gZml4ZWREYXRhLndyaXRlVUludDE2TEUoMCwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICAvLyBjYlNTUElMb25nOiA0LWJ5dGVcbiAgICBpZiAodGhpcy5zc3BpICYmIHRoaXMuc3NwaS5sZW5ndGggPiA2NTUzNSkge1xuICAgICAgZml4ZWREYXRhLndyaXRlVUludDMyTEUodGhpcy5zc3BpLmxlbmd0aCwgb2Zmc2V0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZml4ZWREYXRhLndyaXRlVUludDMyTEUoMCwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICAvLyBQZXIgTVMtVERTIHNwZWMsIEZlYXR1cmVFeHQgZGF0YSBtdXN0IGJlIGF0IHRoZSBFTkQgb2YgdGhlIHBhY2tldCxcbiAgICAvLyBhZnRlciBhbGwgb3RoZXIgdmFyaWFibGUtbGVuZ3RoIGRhdGEuXG4gICAgaWYgKGZlYXR1cmVFeHREYXRhICYmIGV4dGVuc2lvbk9mZnNldEJ1ZmZlcikge1xuICAgICAgLy8gVXBkYXRlIHRoZSBpYkZlYXR1cmVFeHRMb25nIG9mZnNldCB0byBwb2ludCB0byB3aGVyZSBGZWF0dXJlRXh0IHdpbGwgYmVcbiAgICAgIGV4dGVuc2lvbk9mZnNldEJ1ZmZlci53cml0ZVVJbnQzMkxFKGRhdGFPZmZzZXQsIDApO1xuICAgICAgLy8gQXBwZW5kIEZlYXR1cmVFeHQgZGF0YSBhdCB0aGUgZW5kXG4gICAgICBidWZmZXJzLnB1c2goZmVhdHVyZUV4dERhdGEpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBCdWZmZXIuY29uY2F0KGJ1ZmZlcnMpO1xuICAgIGRhdGEud3JpdGVVSW50MzJMRShkYXRhLmxlbmd0aCwgMCk7XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICBidWlsZE9wdGlvbkZsYWdzMSgpIHtcbiAgICBsZXQgZmxhZ3MxID0gRkxBR1NfMS5FTkRJQU5fTElUVExFIHwgRkxBR1NfMS5DSEFSU0VUX0FTQ0lJIHwgRkxBR1NfMS5GTE9BVF9JRUVFXzc1NCB8IEZMQUdTXzEuQkNQX0RVTVBMT0FEX09GRiB8IEZMQUdTXzEuVVNFX0RCX09GRiB8IEZMQUdTXzEuU0VUX0xBTkdfV0FSTl9PTjtcbiAgICBpZiAodGhpcy5pbml0RGJGYXRhbCkge1xuICAgICAgZmxhZ3MxIHw9IEZMQUdTXzEuSU5JVF9EQl9GQVRBTDtcbiAgICB9IGVsc2Uge1xuICAgICAgZmxhZ3MxIHw9IEZMQUdTXzEuSU5JVF9EQl9XQVJOO1xuICAgIH1cbiAgICByZXR1cm4gZmxhZ3MxO1xuICB9XG5cbiAgYnVpbGRGZWF0dXJlRXh0KCkge1xuICAgIGNvbnN0IGJ1ZmZlcnMgPSBbXTtcblxuICAgIGNvbnN0IGZlZEF1dGggPSB0aGlzLmZlZEF1dGg7XG4gICAgaWYgKGZlZEF1dGgpIHtcbiAgICAgIHN3aXRjaCAoZmVkQXV0aC50eXBlKSB7XG4gICAgICAgIGNhc2UgJ0FEQUwnOlxuICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYyg3KTtcbiAgICAgICAgICBidWZmZXIud3JpdGVVSW50OChGRURBVVRIX09QVElPTlMuRkVBVFVSRV9JRCwgMCk7XG4gICAgICAgICAgYnVmZmVyLndyaXRlVUludDMyTEUoMiwgMSk7XG4gICAgICAgICAgYnVmZmVyLndyaXRlVUludDgoKEZFREFVVEhfT1BUSU9OUy5MSUJSQVJZX0FEQUwgPDwgMSkgfCAoZmVkQXV0aC5lY2hvID8gRkVEQVVUSF9PUFRJT05TLkZFREFVVEhfWUVTX0VDSE8gOiBGRURBVVRIX09QVElPTlMuRkVEQVVUSF9OT19FQ0hPKSwgNSk7XG4gICAgICAgICAgYnVmZmVyLndyaXRlVUludDgoZmVkQXV0aC53b3JrZmxvdyA9PT0gJ2ludGVncmF0ZWQnID8gMHgwMiA6IEZFREFVVEhfT1BUSU9OUy5BREFMX1dPUktGTE9XX1VTRVJfUEFTUywgNik7XG4gICAgICAgICAgYnVmZmVycy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnU0VDVVJJVFlUT0tFTic6XG4gICAgICAgICAgY29uc3QgdG9rZW4gPSBCdWZmZXIuZnJvbShmZWRBdXRoLmZlZEF1dGhUb2tlbiwgJ3VjczInKTtcbiAgICAgICAgICBjb25zdCBidWYgPSBCdWZmZXIuYWxsb2MoMTApO1xuXG4gICAgICAgICAgbGV0IG9mZnNldCA9IDA7XG4gICAgICAgICAgb2Zmc2V0ID0gYnVmLndyaXRlVUludDgoRkVEQVVUSF9PUFRJT05TLkZFQVRVUkVfSUQsIG9mZnNldCk7XG4gICAgICAgICAgb2Zmc2V0ID0gYnVmLndyaXRlVUludDMyTEUodG9rZW4ubGVuZ3RoICsgNCArIDEsIG9mZnNldCk7XG4gICAgICAgICAgb2Zmc2V0ID0gYnVmLndyaXRlVUludDgoKEZFREFVVEhfT1BUSU9OUy5MSUJSQVJZX1NFQ1VSSVRZVE9LRU4gPDwgMSkgfCAoZmVkQXV0aC5lY2hvID8gRkVEQVVUSF9PUFRJT05TLkZFREFVVEhfWUVTX0VDSE8gOiBGRURBVVRIX09QVElPTlMuRkVEQVVUSF9OT19FQ0hPKSwgb2Zmc2V0KTtcbiAgICAgICAgICBidWYud3JpdGVJbnQzMkxFKHRva2VuLmxlbmd0aCwgb2Zmc2V0KTtcblxuICAgICAgICAgIGJ1ZmZlcnMucHVzaChidWYpO1xuICAgICAgICAgIGJ1ZmZlcnMucHVzaCh0b2tlbik7XG5cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTaWduYWwgVVRGLTggc3VwcG9ydDogVmFsdWUgMHgwQSwgYml0IDAgbXVzdCBiZSBzZXQgdG8gMS4gQWRkZWQgaW4gVERTIDcuNC5cbiAgICBjb25zdCBVVEY4X1NVUFBPUlRfRkVBVFVSRV9JRCA9IDB4MGE7XG4gICAgY29uc3QgVVRGOF9TVVBQT1JUX0NMSUVOVF9TVVBQT1JUU19VVEY4ID0gMHgwMTtcbiAgICBjb25zdCBidWYgPSBCdWZmZXIuYWxsb2MoNik7XG4gICAgYnVmLndyaXRlVUludDgoVVRGOF9TVVBQT1JUX0ZFQVRVUkVfSUQsIDApO1xuICAgIGJ1Zi53cml0ZVVJbnQzMkxFKDEsIDEpO1xuICAgIGJ1Zi53cml0ZVVJbnQ4KFVURjhfU1VQUE9SVF9DTElFTlRfU1VQUE9SVFNfVVRGOCwgNSk7XG4gICAgYnVmZmVycy5wdXNoKGJ1Zik7XG5cbiAgICBidWZmZXJzLnB1c2goQnVmZmVyLmZyb20oW0ZFQVRVUkVfRVhUX1RFUk1JTkFUT1JdKSk7XG5cbiAgICByZXR1cm4gQnVmZmVyLmNvbmNhdChidWZmZXJzKTtcbiAgfVxuXG4gIGJ1aWxkT3B0aW9uRmxhZ3MyKCkge1xuICAgIGxldCBmbGFnczIgPSBGTEFHU18yLklOSVRfTEFOR19XQVJOIHwgRkxBR1NfMi5PREJDX09GRiB8IEZMQUdTXzIuVVNFUl9OT1JNQUw7XG4gICAgaWYgKHRoaXMuc3NwaSkge1xuICAgICAgZmxhZ3MyIHw9IEZMQUdTXzIuSU5URUdSQVRFRF9TRUNVUklUWV9PTjtcbiAgICB9IGVsc2Uge1xuICAgICAgZmxhZ3MyIHw9IEZMQUdTXzIuSU5URUdSQVRFRF9TRUNVUklUWV9PRkY7XG4gICAgfVxuICAgIHJldHVybiBmbGFnczI7XG4gIH1cblxuICBidWlsZFR5cGVGbGFncygpIHtcbiAgICBsZXQgdHlwZUZsYWdzID0gVFlQRV9GTEFHUy5TUUxfREZMVCB8IFRZUEVfRkxBR1MuT0xFREJfT0ZGO1xuICAgIGlmICh0aGlzLnJlYWRPbmx5SW50ZW50KSB7XG4gICAgICB0eXBlRmxhZ3MgfD0gVFlQRV9GTEFHUy5SRUFEX09OTFlfSU5URU5UO1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlRmxhZ3MgfD0gVFlQRV9GTEFHUy5SRUFEX1dSSVRFX0lOVEVOVDtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVGbGFncztcbiAgfVxuXG4gIGJ1aWxkT3B0aW9uRmxhZ3MzKCkge1xuICAgIHJldHVybiBGTEFHU18zLkNIQU5HRV9QQVNTV09SRF9OTyB8IEZMQUdTXzMuVU5LTk9XTl9DT0xMQVRJT05fSEFORExJTkcgfCBGTEFHU18zLkVYVEVOU0lPTl9VU0VEO1xuICB9XG5cbiAgc2NyYW1ibGVQYXNzd29yZChwYXNzd29yZDogQnVmZmVyKSB7XG4gICAgZm9yIChsZXQgYiA9IDAsIGxlbiA9IHBhc3N3b3JkLmxlbmd0aDsgYiA8IGxlbjsgYisrKSB7XG4gICAgICBsZXQgYnl0ZSA9IHBhc3N3b3JkW2JdO1xuICAgICAgY29uc3QgbG93TmliYmxlID0gYnl0ZSAmIDB4MGY7XG4gICAgICBjb25zdCBoaWdoTmliYmxlID0gYnl0ZSA+PiA0O1xuICAgICAgYnl0ZSA9IChsb3dOaWJibGUgPDwgNCkgfCBoaWdoTmliYmxlO1xuICAgICAgYnl0ZSA9IGJ5dGUgXiAweGE1O1xuICAgICAgcGFzc3dvcmRbYl0gPSBieXRlO1xuICAgIH1cbiAgICByZXR1cm4gcGFzc3dvcmQ7XG4gIH1cblxuICB0b1N0cmluZyhpbmRlbnQgPSAnJykge1xuICAgIHJldHVybiBpbmRlbnQgKyAnTG9naW43IC0gJyArXG4gICAgICBzcHJpbnRmKCdURFM6MHglMDhYLCBQYWNrZXRTaXplOjB4JTA4WCwgQ2xpZW50UHJvZ1ZlcjoweCUwOFgsIENsaWVudFBJRDoweCUwOFgsIENvbm5lY3Rpb25JRDoweCUwOFgnLFxuICAgICAgICAgICAgICB0aGlzLnRkc1ZlcnNpb24sIHRoaXMucGFja2V0U2l6ZSwgdGhpcy5jbGllbnRQcm9nVmVyLCB0aGlzLmNsaWVudFBpZCwgdGhpcy5jb25uZWN0aW9uSWRcbiAgICAgICkgKyAnXFxuJyArIGluZGVudCArICcgICAgICAgICAnICtcbiAgICAgIHNwcmludGYoJ0ZsYWdzMToweCUwMlgsIEZsYWdzMjoweCUwMlgsIFR5cGVGbGFnczoweCUwMlgsIEZsYWdzMzoweCUwMlgsIENsaWVudFRpbWV6b25lOiVkLCBDbGllbnRMQ0lEOjB4JTA4WCcsXG4gICAgICAgICAgICAgIHRoaXMuYnVpbGRPcHRpb25GbGFnczEoKSwgdGhpcy5idWlsZE9wdGlvbkZsYWdzMigpLCB0aGlzLmJ1aWxkVHlwZUZsYWdzKCksIHRoaXMuYnVpbGRPcHRpb25GbGFnczMoKSwgdGhpcy5jbGllbnRUaW1lWm9uZSwgdGhpcy5jbGllbnRMY2lkXG4gICAgICApICsgJ1xcbicgKyBpbmRlbnQgKyAnICAgICAgICAgJyArXG4gICAgICBzcHJpbnRmKFwiSG9zdG5hbWU6JyVzJywgVXNlcm5hbWU6JyVzJywgUGFzc3dvcmQ6JyVzJywgQXBwTmFtZTonJXMnLCBTZXJ2ZXJOYW1lOiclcycsIExpYnJhcnlOYW1lOiclcydcIixcbiAgICAgICAgICAgICAgdGhpcy5ob3N0bmFtZSwgdGhpcy51c2VyTmFtZSwgdGhpcy5wYXNzd29yZCwgdGhpcy5hcHBOYW1lLCB0aGlzLnNlcnZlck5hbWUsIHRoaXMubGlicmFyeU5hbWVcbiAgICAgICkgKyAnXFxuJyArIGluZGVudCArICcgICAgICAgICAnICtcbiAgICAgIHNwcmludGYoXCJMYW5ndWFnZTonJXMnLCBEYXRhYmFzZTonJXMnLCBTU1BJOiclcycsIEF0dGFjaERiRmlsZTonJXMnLCBDaGFuZ2VQYXNzd29yZDonJXMnXCIsXG4gICAgICAgICAgICAgIHRoaXMubGFuZ3VhZ2UsIHRoaXMuZGF0YWJhc2UsIHRoaXMuc3NwaSwgdGhpcy5hdHRhY2hEYkZpbGUsIHRoaXMuY2hhbmdlUGFzc3dvcmRcbiAgICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTG9naW43UGF5bG9hZDtcbm1vZHVsZS5leHBvcnRzID0gTG9naW43UGF5bG9hZDtcbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBQUEsVUFBQSxHQUFBQyxPQUFBO0FBQ0EsSUFBQUMsWUFBQSxHQUFBRCxPQUFBO0FBRUEsTUFBTUUsT0FBTyxHQUFHO0VBQ2RDLGFBQWEsRUFBRSxJQUFJO0VBQ25CQyxVQUFVLEVBQUUsSUFBSTtFQUNoQkMsYUFBYSxFQUFFLElBQUk7RUFDbkJDLGNBQWMsRUFBRSxJQUFJO0VBQ3BCQyxjQUFjLEVBQUUsSUFBSTtF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