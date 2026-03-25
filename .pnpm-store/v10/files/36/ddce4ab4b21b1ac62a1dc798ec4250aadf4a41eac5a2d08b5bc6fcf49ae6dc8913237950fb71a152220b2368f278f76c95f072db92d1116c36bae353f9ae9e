'use strict';

const FieldFlags = require('../constants/field_flags.js');
const Charsets = require('../constants/charsets.js');
const Types = require('../constants/types.js');
const helpers = require('../helpers');

const typeNames = [];
for (const t in Types) {
  typeNames[Types[t]] = t;
}

function getBinaryParser(fields, _options, config) {
  function readCode(field, config, options, fieldNum, packet) {
    const supportBigNumbers = Boolean(
      options.supportBigNumbers || config.supportBigNumbers
    );
    const bigNumberStrings = Boolean(
      options.bigNumberStrings || config.bigNumberStrings
    );
    const timezone = options.timezone || config.timezone;
    const dateStrings = options.dateStrings || config.dateStrings;
    const unsigned = field.flags & FieldFlags.UNSIGNED;

    switch (field.columnType) {
      case Types.TINY:
        return unsigned ? packet.readInt8() : packet.readSInt8();
      case Types.SHORT:
        return unsigned ? packet.readInt16() : packet.readSInt16();
      case Types.LONG:
      case Types.INT24: // in binary protocol int24 is encoded in 4 bytes int32
        return unsigned ? packet.readInt32() : packet.readSInt32();
      case Types.YEAR:
        return packet.readInt16();
      case Types.FLOAT:
        return packet.readFloat();
      case Types.DOUBLE:
        return packet.readDouble();
      case Types.NULL:
        return null;
      case Types.DATE:
      case Types.DATETIME:
      case Types.TIMESTAMP:
      case Types.NEWDATE:
        return helpers.typeMatch(field.columnType, dateStrings, Types)
          ? packet.readDateTimeString(
              parseInt(field.decimals, 10),
              null,
              field.columnType
            )
          : packet.readDateTime(timezone);
      case Types.TIME:
        return packet.readTimeString();
      case Types.DECIMAL:
      case Types.NEWDECIMAL:
        return config.decimalNumbers
          ? packet.parseLengthCodedFloat()
          : packet.readLengthCodedString('ascii');
      case Types.GEOMETRY:
        return packet.parseGeometryValue();
      case Types.VECTOR:
        return packet.parseVector();
      case Types.JSON:
        // Since for JSON columns mysql always returns charset 63 (BINARY),
        // we have to handle it according to JSON specs and use "utf8",
        // see https://github.com/sidorares/node-mysql2/issues/409
        return config.jsonStrings
          ? packet.readLengthCodedString('utf8')
          : JSON.parse(packet.readLengthCodedString('utf8'));
      case Types.LONGLONG:
        if (!supportBigNumbers)
          return unsigned
            ? packet.readInt64JSNumber()
            : packet.readSInt64JSNumber();
        return bigNumberStrings
          ? unsigned
            ? packet.readInt64String()
            : packet.readSInt64String()
          : unsigned
            ? packet.readInt64()
            : packet.readSInt64();
      default:
        return field.characterSet === Charsets.BINARY
          ? packet.readLengthCodedBuffer()
          : packet.readLengthCodedString(fields[fieldNum].encoding);
    }
  }

  return class BinaryRow {
    constructor() {}

    next(packet, fields, options) {
      packet.readInt8(); // status byte

      const nullBitmapLength = Math.floor((fields.length + 7 + 2) / 8);
      const nullBitmaskBytes = new Array(nullBitmapLength);

      for (let i = 0; i < nullBitmapLength; i++) {
        nullBitmaskBytes[i] = packet.readInt8();
      }

      const result = options.rowsAsArray ? new Array(fields.length) : {};
      let currentFieldNullBit = 4;
      let nullByteIndex = 0;

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const typeCast =
          options.typeCast !== undefined ? options.typeCast : config.typeCast;

        let value;
        if (nullBitmaskBytes[nullByteIndex] & currentFieldNullBit) {
          value = null;
        } else if (options.typeCast === false) {
          value = packet.readLengthCodedBuffer();
        } else {
          const next = () => readCode(field, config, options, i, packet);
          value =
            typeof typeCast === 'function'
              ? typeCast(
                  {
                    type: typeNames[field.columnType],
                    length: field.columnLength,
                    db: field.schema,
                    table: field.table,
                    name: field.name,
                    string: function (encoding = field.encoding) {
                      if (
                        field.columnType === Types.JSON &&
                        encoding === field.encoding
                      ) {
                        // Since for JSON columns mysql always returns charset 63 (BINARY),
                        // we have to handle it according to JSON specs and use "utf8",
                        // see https://github.com/sidorares/node-mysql2/issues/1661
                        console.warn(
                          `typeCast: JSON column "${field.name}" is interpreted as BINARY by default, recommended to manually set utf8 encoding: \`field.string("utf8")\``
                        );
                      }

                      if (
                        [
                          Types.DATETIME,
                          Types.NEWDATE,
                          Types.TIMESTAMP,
                          Types.DATE,
                        ].includes(field.columnType)
                      ) {
                        return packet.readDateTimeString(
                          parseInt(field.decimals, 10),
                          ' ',
                          field.columnType
                        );
                      }

                      if (field.columnType === Types.TINY) {
                        const unsigned = field.flags & FieldFlags.UNSIGNED;

                        return String(
                          unsigned ? packet.readInt8() : packet.readSInt8()
                        );
                      }

                      if (field.columnType === Types.TIME) {
                        return packet.readTimeString();
                      }

                      return packet.readLengthCodedString(encoding);
                    },
                    buffer: function () {
                      return packet.readLengthCodedBuffer();
                    },
                    geometry: function () {
                      return packet.parseGeometryValue();
                    },
                  },
                  next
                )
              : next();
        }

        if (options.rowsAsArray) {
          result[i] = value;
        } else if (typeof options.nestTables === 'string') {
          const key = helpers.fieldEscape(
            field.table + options.nestTables + field.name,
            false
          );
          result[key] = value;
        } else if (options.nestTables === true) {
          const tableName = helpers.fieldEscape(field.table, false);
          if (!result[tableName]) {
            result[tableName] = {};
          }
          const fieldName = helpers.fieldEscape(field.name, false);
          result[tableName][fieldName] = value;
        } else {
          const key = helpers.fieldEscape(field.name, false);
          result[key] = value;
        }

        currentFieldNullBit *= 2;
        if (currentFieldNullBit === 0x100) {
          currentFieldNullBit = 1;
          nullByteIndex++;
        }
      }

      return result;
    }
  };
}

module.exports = getBinaryParser;
