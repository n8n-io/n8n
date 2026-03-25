'use strict';

// http://dev.mysql.com/doc/internals/en/query-event.html

const keys = {
  FLAGS2: 0,
  SQL_MODE: 1,
  CATALOG: 2,
  AUTO_INCREMENT: 3,
  CHARSET: 4,
  TIME_ZONE: 5,
  CATALOG_NZ: 6,
  LC_TIME_NAMES: 7,
  CHARSET_DATABASE: 8,
  TABLE_MAP_FOR_UPDATE: 9,
  MASTER_DATA_WRITTEN: 10,
  INVOKERS: 11,
  UPDATED_DB_NAMES: 12,
  MICROSECONDS: 3,
};

module.exports = function parseStatusVars(buffer) {
  const result = {};
  let offset = 0;
  let key, length, prevOffset;
  while (offset < buffer.length) {
    key = buffer[offset++];
    switch (key) {
      case keys.FLAGS2:
        result.flags = buffer.readUInt32LE(offset);
        offset += 4;
        break;
      case keys.SQL_MODE:
        // value is 8 bytes, but all dcumented flags are in first 4 bytes
        result.sqlMode = buffer.readUInt32LE(offset);
        offset += 8;
        break;
      case keys.CATALOG:
        length = buffer[offset++];
        result.catalog = buffer.toString('utf8', offset, offset + length);
        offset += length + 1; // null byte after string
        break;
      case keys.CHARSET:
        result.clientCharset = buffer.readUInt16LE(offset);
        result.connectionCollation = buffer.readUInt16LE(offset + 2);
        result.serverCharset = buffer.readUInt16LE(offset + 4);
        offset += 6;
        break;
      case keys.TIME_ZONE:
        length = buffer[offset++];
        result.timeZone = buffer.toString('utf8', offset, offset + length);
        offset += length; // no null byte
        break;
      case keys.CATALOG_NZ:
        length = buffer[offset++];
        result.catalogNz = buffer.toString('utf8', offset, offset + length);
        offset += length; // no null byte
        break;
      case keys.LC_TIME_NAMES:
        result.lcTimeNames = buffer.readUInt16LE(offset);
        offset += 2;
        break;
      case keys.CHARSET_DATABASE:
        result.schemaCharset = buffer.readUInt16LE(offset);
        offset += 2;
        break;
      case keys.TABLE_MAP_FOR_UPDATE:
        result.mapForUpdate1 = buffer.readUInt32LE(offset);
        result.mapForUpdate2 = buffer.readUInt32LE(offset + 4);
        offset += 8;
        break;
      case keys.MASTER_DATA_WRITTEN:
        result.masterDataWritten = buffer.readUInt32LE(offset);
        offset += 4;
        break;
      case keys.INVOKERS:
        length = buffer[offset++];
        result.invokerUsername = buffer.toString(
          'utf8',
          offset,
          offset + length
        );
        offset += length;
        length = buffer[offset++];
        result.invokerHostname = buffer.toString(
          'utf8',
          offset,
          offset + length
        );
        offset += length;
        break;
      case keys.UPDATED_DB_NAMES:
        length = buffer[offset++];
        // length - number of null-terminated strings
        result.updatedDBs = []; // we'll store them as array here
        for (; length; --length) {
          prevOffset = offset;
          // fast forward to null terminating byte
          while (buffer[offset++] && offset < buffer.length) {
            // empty body, everything inside while condition
          }
          result.updatedDBs.push(
            buffer.toString('utf8', prevOffset, offset - 1)
          );
        }
        break;
      case keys.MICROSECONDS:
        result.microseconds =
          // REVIEW: INVALID UNKNOWN VARIABLE!
          buffer.readInt16LE(offset) + (buffer[offset + 2] << 16);
        offset += 3;
    }
  }
  return result;
};
