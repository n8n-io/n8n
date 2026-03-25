const Util = require('../../util');
const Errors = require('../../errors');

const sqlTypes =
  {
    values:
      {
        TEXT: 'text',
        BINARY: 'binary',
        BOOLEAN: 'boolean',
        FIXED: 'fixed',
        REAL: 'real',
        DATE: 'date',
        TIME: 'time',
        TIMESTAMP_LTZ: 'timestamp_ltz',
        TIMESTAMP_NTZ: 'timestamp_ntz',
        TIMESTAMP_TZ: 'timestamp_tz',
        VARIANT: 'variant',
        OBJECT: 'object',
        ARRAY: 'array',
        MAP: 'map'
      },

    /**
     * Determines if a column's SQL type is String.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isString: function (sqlType) {
      return (sqlType === this.values.TEXT);
    },

    /**
     * Determines if a column's SQL type is Binary.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isBinary: function (sqlType) {
      return (sqlType === this.values.BINARY);
    },

    /**
     * Determines if a column's SQL type is Boolean.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isBoolean: function (sqlType) {
      return (sqlType === this.values.BOOLEAN);
    },

    /**
     * Determines if a column's SQL type is Number.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isNumber: function (sqlType) {
      return (sqlType === this.values.FIXED) || (sqlType === this.values.REAL);
    },

    /**
     * Determines if a column's SQL type is Date.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isDate: function (sqlType) {
      return (sqlType === this.values.DATE);
    },

    /**
     * Determines if a column's SQL type is Time.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isTime: function (sqlType) {
      return (sqlType === this.values.TIME);
    },

    /**
     * Determines if a column's SQL type is Timestamp.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isTimestamp: function (sqlType) {
      return (sqlType === this.values.TIMESTAMP_LTZ) ||
        (sqlType === this.values.TIMESTAMP_NTZ) ||
        (sqlType === this.values.TIMESTAMP_TZ);
    },

    /**
     * Determines if a column's SQL type is TIMESTAMP_LTZ.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isTimestampLtz: function (sqlType) {
      return (sqlType === this.values.TIMESTAMP_LTZ);
    },

    /**
     * Determines if a column's SQL type is TIMESTAMP_NTZ.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isTimestampNtz: function (sqlType) {
      return (sqlType === this.values.TIMESTAMP_NTZ);
    },

    /**
     * Determines if a column's SQL type is TIMESTAMP_TZ.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isTimestampTz: function (sqlType) {
      return (sqlType === this.values.TIMESTAMP_TZ);
    },

    /**
     * Determines if a column's SQL type is Variant.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isVariant: function (sqlType, fieldsMetadata) {
      return (sqlType === this.values.VARIANT) ||
        (sqlType === this.values.OBJECT && fieldsMetadata == null) ||
        (sqlType === this.values.ARRAY && fieldsMetadata == null) ||
        (sqlType === this.values.MAP && fieldsMetadata == null);
    },

    /**
     * Determines if a column's SQL type is Object.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isObject: function (sqlType, fieldsMetadata) {
      return (sqlType === this.values.OBJECT && fieldsMetadata != null);
    },

    /**
     * Determines if a column's SQL type is Array.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isArray: function (sqlType, fieldsMetadata) {
      return (sqlType === this.values.ARRAY && fieldsMetadata != null);
    },

    /**
     * Determines if a column's SQL type is Map.
     *
     * @param {Object} sqlType
     *
     * @returns {Boolean}
     */
    isMap: function (sqlType, fieldsMetadata) {
      return (sqlType === this.values.MAP && fieldsMetadata != null);
    }
  };

const nativeTypes =
  {
    values:
      {
        STRING: 'STRING',
        BOOLEAN: 'BOOLEAN',
        NUMBER: 'NUMBER',
        DATE: 'DATE',
        JSON: 'JSON',
        BUFFER: 'BUFFER',
        OBJECT: 'OBJECT',
        ARRAY: 'ARRAY',
        MAP: 'MAP'
      },

    /**
     * Determines if a given value is a valid native type.
     *
     * @param {*} value
     *
     * @returns {boolean}
     */
    isValidValue: function (value) {
      return !!this.values[Util.isString(value) ? value.toUpperCase() : value];
    },

    /**
     * Given an array of strings, returns the index of the first element that
     * represents an invalid native type. If the values are all valid, a value of
     * -1 is returned.
     *
     * @param {String[]} nativeTypes
     *
     * @returns {Number}
     */
    findInvalidValue: function (nativeTypes) {
      // validate input
      Errors.assertInternal(Util.isArray(nativeTypes));

      // find the index of the first invalid value
      let invalidValueIndex = -1;
      for (let index = 0, length = nativeTypes.length; index < length; index++) {
        if (!this.isValidValue(nativeTypes[index])) {
          invalidValueIndex = index;
          break;
        }
      }

      return invalidValueIndex;
    }
  };

let isRepresentNullAsStringNull = true;

exports.setIsRepresentNullAsStringNull = function (option) {
  isRepresentNullAsStringNull = option;
};

exports.getNullValue = function () {
  return isRepresentNullAsStringNull ? 'NULL' : null;
};

const sqlTypeValues = sqlTypes.values;
const nativeTypeValues = nativeTypes.values;

const MAP_SQL_TO_NATIVE = {};
MAP_SQL_TO_NATIVE[sqlTypeValues.TEXT] = nativeTypeValues.STRING;
MAP_SQL_TO_NATIVE[sqlTypeValues.BINARY] = nativeTypeValues.BUFFER;
MAP_SQL_TO_NATIVE[sqlTypeValues.BOOLEAN] = nativeTypeValues.BOOLEAN;
MAP_SQL_TO_NATIVE[sqlTypeValues.FIXED] = nativeTypeValues.NUMBER;
MAP_SQL_TO_NATIVE[sqlTypeValues.REAL] = nativeTypeValues.NUMBER;
MAP_SQL_TO_NATIVE[sqlTypeValues.DATE] = nativeTypeValues.DATE;
MAP_SQL_TO_NATIVE[sqlTypeValues.TIME] = nativeTypeValues.STRING;
MAP_SQL_TO_NATIVE[sqlTypeValues.TIMESTAMP_LTZ] = nativeTypeValues.DATE;
MAP_SQL_TO_NATIVE[sqlTypeValues.TIMESTAMP_NTZ] = nativeTypeValues.DATE;
MAP_SQL_TO_NATIVE[sqlTypeValues.TIMESTAMP_TZ] = nativeTypeValues.DATE;
MAP_SQL_TO_NATIVE[sqlTypeValues.VARIANT] = nativeTypeValues.JSON;
MAP_SQL_TO_NATIVE[sqlTypeValues.OBJECT] = nativeTypeValues.OBJECT;
MAP_SQL_TO_NATIVE[sqlTypeValues.ARRAY] = nativeTypeValues.ARRAY;
MAP_SQL_TO_NATIVE[sqlTypeValues.MAP] = nativeTypeValues.MAP;

exports.SqlTypes = sqlTypes;
exports.NativeTypes = nativeTypes;

/**
 * Given a SQL type, returns the corresponding native type.
 *
 * @param {String} sqlType
 *
 * @returns {String}
 */
exports.toNativeType = function (sqlType) {
  return MAP_SQL_TO_NATIVE[sqlType];
};
