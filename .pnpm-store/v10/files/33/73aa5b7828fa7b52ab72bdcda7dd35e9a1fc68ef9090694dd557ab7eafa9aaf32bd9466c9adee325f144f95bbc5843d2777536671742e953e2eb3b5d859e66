'use strict';

const Packet = require('../packets/packet');
const StringParser = require('../parsers/string');
const CharsetToEncoding = require('../constants/charset_encodings.js');

const fields = ['catalog', 'schema', 'table', 'orgTable', 'name', 'orgName'];

// creating JS string is relatively expensive (compared to
// reading few bytes from buffer) because all string properties
// except for name are unlikely to be used we postpone
// string conversion until property access
//
// TODO: watch for integration benchmarks (one with real network buffer)
// there could be bad side effect as keeping reference to a buffer makes it
// sit in the memory longer (usually until final .query() callback)
// Latest v8 perform much better in regard to bufferer -> string conversion,
// at some point of time this optimisation might become unnecessary
// see https://github.com/sidorares/node-mysql2/pull/137
//
class ColumnDefinition {
  constructor(packet, clientEncoding) {
    this._buf = packet.buffer;
    this._clientEncoding = clientEncoding;
    this._catalogLength = packet.readLengthCodedNumber();
    this._catalogStart = packet.offset;
    packet.offset += this._catalogLength;
    this._schemaLength = packet.readLengthCodedNumber();
    this._schemaStart = packet.offset;
    packet.offset += this._schemaLength;
    this._tableLength = packet.readLengthCodedNumber();
    this._tableStart = packet.offset;
    packet.offset += this._tableLength;
    this._orgTableLength = packet.readLengthCodedNumber();
    this._orgTableStart = packet.offset;
    packet.offset += this._orgTableLength;
    // name is always used, don't make it lazy
    const _nameLength = packet.readLengthCodedNumber();
    const _nameStart = packet.offset;
    packet.offset += _nameLength;
    this._orgNameLength = packet.readLengthCodedNumber();
    this._orgNameStart = packet.offset;
    packet.offset += this._orgNameLength;
    packet.skip(1); //  length of the following fields (always 0x0c)
    this.characterSet = packet.readInt16();
    this.encoding = CharsetToEncoding[this.characterSet];
    this.name = StringParser.decode(
      this._buf,
      this.encoding === 'binary' ? this._clientEncoding : this.encoding,
      _nameStart,
      _nameStart + _nameLength
    );
    this.columnLength = packet.readInt32();
    this.columnType = packet.readInt8();
    this.type = this.columnType;
    this.flags = packet.readInt16();
    this.decimals = packet.readInt8();
  }

  inspect() {
    return {
      catalog: this.catalog,
      schema: this.schema,
      name: this.name,
      orgName: this.orgName,
      table: this.table,
      orgTable: this.orgTable,
      characterSet: this.characterSet,
      encoding: this.encoding,
      columnLength: this.columnLength,
      type: this.columnType,
      flags: this.flags,
      decimals: this.decimals,
    };
  }

  [Symbol.for('nodejs.util.inspect.custom')](depth, inspectOptions, inspect) {
    const Types = require('../constants/types.js');
    const typeNames = [];
    for (const t in Types) {
      typeNames[Types[t]] = t;
    }
    const fiedFlags = require('../constants/field_flags.js');
    const flagNames = [];
    // TODO: respect inspectOptions.showHidden
    //const inspectFlags = inspectOptions.showHidden ? this.flags : this.flags & ~fiedFlags.PRI_KEY;
    const inspectFlags = this.flags;
    for (const f in fiedFlags) {
      if (inspectFlags & fiedFlags[f]) {
        if (f === 'PRI_KEY') {
          flagNames.push('PRIMARY KEY');
        } else if (f === 'NOT_NULL') {
          flagNames.push('NOT NULL');
        } else if (f === 'BINARY') {
          // ignore flag for now
        } else if (f === 'MULTIPLE_KEY') {
          // not sure if that should be part of inspection.
          // in the schema usually this is part of index definition
          // example: UNIQUE KEY `my_uniq_id` (`id_box_elements`,`id_router`)
          // note that only first column has MULTIPLE_KEY flag set in this case
          // so there is no good way of knowing that this is part of index just
          // by looking at indifidual field flags
        } else if (f === 'NO_DEFAULT_VALUE') {
          // almost the same as NOT_NULL?
        } else if (f === 'BLOB') {
          // included in the type
        } else if (f === 'UNSIGNED') {
          // this should be first after type
        } else if (f === 'TIMESTAMP') {
          // timestamp flag is redundant for inspection - already included in type
        } else if (f === 'ON_UPDATE_NOW') {
          flagNames.push('ON UPDATE CURRENT_TIMESTAMP');
        } else {
          flagNames.push(f);
        }
      }
    }

    if (depth > 1) {
      return inspect({
        ...this.inspect(),
        typeName: typeNames[this.columnType],
        flags: flagNames,
      });
    }

    const isUnsigned = this.flags & fiedFlags.UNSIGNED;

    let typeName = typeNames[this.columnType];
    if (typeName === 'BLOB') {
      // TODO: check for non-utf8mb4 encoding
      if (this.columnLength === 4294967295) {
        typeName = 'LONGTEXT';
      } else if (this.columnLength === 67108860) {
        typeName = 'MEDIUMTEXT';
      } else if (this.columnLength === 262140) {
        typeName = 'TEXT';
      } else if (this.columnLength === 1020) {
        // 255*4
        typeName = 'TINYTEXT';
      } else {
        typeName = `BLOB(${this.columnLength})`;
      }
    } else if (typeName === 'VAR_STRING') {
      // TODO: check for non-utf8mb4 encoding
      typeName = `VARCHAR(${Math.ceil(this.columnLength / 4)})`;
    } else if (typeName === 'TINY') {
      if (
        (this.columnLength === 3 && isUnsigned) ||
        (this.columnLength === 4 && !isUnsigned)
      ) {
        typeName = 'TINYINT';
      } else {
        typeName = `TINYINT(${this.columnLength})`;
      }
    } else if (typeName === 'LONGLONG') {
      if (this.columnLength === 20) {
        typeName = 'BIGINT';
      } else {
        typeName = `BIGINT(${this.columnLength})`;
      }
    } else if (typeName === 'SHORT') {
      if (isUnsigned && this.columnLength === 5) {
        typeName = 'SMALLINT';
      } else if (!isUnsigned && this.columnLength === 6) {
        typeName = 'SMALLINT';
      } else {
        typeName = `SMALLINT(${this.columnLength})`;
      }
    } else if (typeName === 'LONG') {
      if (isUnsigned && this.columnLength === 10) {
        typeName = 'INT';
      } else if (!isUnsigned && this.columnLength === 11) {
        typeName = 'INT';
      } else {
        typeName = `INT(${this.columnLength})`;
      }
    } else if (typeName === 'INT24') {
      if (isUnsigned && this.columnLength === 8) {
        typeName = 'MEDIUMINT';
      } else if (!isUnsigned && this.columnLength === 9) {
        typeName = 'MEDIUMINT';
      } else {
        typeName = `MEDIUMINT(${this.columnLength})`;
      }
    } else if (typeName === 'DOUBLE') {
      // DOUBLE without modifiers is reported as DOUBLE(22, 31)
      if (this.columnLength === 22 && this.decimals === 31) {
        typeName = 'DOUBLE';
      } else {
        typeName = `DOUBLE(${this.columnLength},${this.decimals})`;
      }
    } else if (typeName === 'FLOAT') {
      // FLOAT without modifiers is reported as FLOAT(12, 31)
      if (this.columnLength === 12 && this.decimals === 31) {
        typeName = 'FLOAT';
      } else {
        typeName = `FLOAT(${this.columnLength},${this.decimals})`;
      }
    } else if (typeName === 'NEWDECIMAL') {
      if (this.columnLength === 11 && this.decimals === 0) {
        typeName = 'DECIMAL';
      } else if (this.decimals === 0) {
        // not sure why, but DECIMAL(13) is reported as DECIMAL(14, 0)
        // and DECIMAL(13, 9) is reported as NEWDECIMAL(15, 9)
        if (isUnsigned) {
          typeName = `DECIMAL(${this.columnLength})`;
        } else {
          typeName = `DECIMAL(${this.columnLength - 1})`;
        }
      } else {
        typeName = `DECIMAL(${this.columnLength - 2},${this.decimals})`;
      }
    } else {
      typeName = `${typeNames[this.columnType]}(${this.columnLength})`;
    }

    if (isUnsigned) {
      typeName += ' UNSIGNED';
    }

    // TODO respect colors option
    return `\`${this.name}\` ${[typeName, ...flagNames].join(' ')}`;
  }

  static toPacket(column, sequenceId) {
    let length = 17; // = 4 padding + 1 + 12 for the rest
    fields.forEach((field) => {
      length += Packet.lengthCodedStringLength(
        column[field],
        CharsetToEncoding[column.characterSet]
      );
    });
    const buffer = Buffer.allocUnsafe(length);

    const packet = new Packet(sequenceId, buffer, 0, length);
    function writeField(name) {
      packet.writeLengthCodedString(
        column[name],
        CharsetToEncoding[column.characterSet]
      );
    }
    packet.offset = 4;
    fields.forEach(writeField);
    packet.writeInt8(0x0c);
    packet.writeInt16(column.characterSet);
    packet.writeInt32(column.columnLength);
    packet.writeInt8(column.columnType);
    packet.writeInt16(column.flags);
    packet.writeInt8(column.decimals);
    packet.writeInt16(0); // filler
    return packet;
  }

  // node-mysql compatibility: alias "db" to "schema"
  get db() {
    return this.schema;
  }
}

const addString = function (name) {
  Object.defineProperty(ColumnDefinition.prototype, name, {
    get: function () {
      const start = this[`_${name}Start`];
      const end = start + this[`_${name}Length`];
      const val = StringParser.decode(
        this._buf,
        this.encoding === 'binary' ? this._clientEncoding : this.encoding,
        start,
        end
      );

      Object.defineProperty(this, name, {
        value: val,
        writable: false,
        configurable: false,
        enumerable: false,
      });

      return val;
    },
  });
};

addString('catalog');
addString('schema');
addString('table');
addString('orgTable');
addString('orgName');

module.exports = ColumnDefinition;
