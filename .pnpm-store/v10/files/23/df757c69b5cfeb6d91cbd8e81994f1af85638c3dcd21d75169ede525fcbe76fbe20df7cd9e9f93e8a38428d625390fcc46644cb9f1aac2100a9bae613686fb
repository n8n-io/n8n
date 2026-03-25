const Util = require('../../util');
const Errors = require('../../errors');
const BigNumber = require('bignumber.js');
const GlobalConfig = require('../../global_config');
const Logger = require('../../logger');
const SfTimestamp = require('./sf_timestamp');
const DataTypes = require('./data_types');
const SqlTypes = require('./data_types').SqlTypes;
const dateTimeFormatConverter = require('./datetime_format_converter');
const bigInt = require('big-integer');
const moment = require('moment');
const momentTimezone = require('moment-timezone');
const util = require('../../util');

/**
 * Creates a new Column.
 *
 * @param {Object} options
 * @param {Number} index
 * @param {Object} statementParameters
 * @param {String} resultVersion
 *
 * @constructor
 */
function Column(options, index, statementParameters, resultVersion) {
  const name = options.overriddenName || options.name;
  const nullable = options.nullable;
  const scale = options.scale;
  const type = options.type;
  const precision = options.precision;
  const fieldsMetadata = options.fields;

  /**
   * Returns the name of this column.
   *
   * @return {String}
   */
  this.getName = function () {
    return name;
  };

  /**
   * Returns the index of this column.
   *
   * @return {Number}
   */
  this.getIndex = function () {
    return index;
  };

  /**
   * Returns the id of this column.
   *
   * @return {Number}
   */
  this.getId = function () {
    // use the index as the id for now
    return index;
  };

  /**
   * Determines if this column is nullable.
   *
   * @returns {Boolean}
   */
  this.isNullable = function () {
    return nullable;
  };

  /**
   * Returns the scale associated with this column.
   *
   * @returns {Number}
   */
  this.getScale = function () {
    return scale;
  };

  /**
   * Returns the type associated with this column.
   *
   * @returns {String}
   */
  this.getType = function () {
    return type;
  };

  /**
   * Returns the precision associated with this column
   *
   * @returns {Number}
   */
  this.getPrecision = function () {
    return precision;
  };

  // add methods that make it easy to check if the column is of a specific type
  this.isString = createFnIsColumnOfType(type, SqlTypes.isString, SqlTypes);
  this.isBinary = createFnIsColumnOfType(type, SqlTypes.isBinary, SqlTypes);
  this.isNumber = createFnIsColumnOfType(type, SqlTypes.isNumber, SqlTypes);
  this.isBoolean = createFnIsColumnOfType(type, SqlTypes.isBoolean, SqlTypes);
  this.isDate = createFnIsColumnOfType(type, SqlTypes.isDate, SqlTypes);
  this.isTime = createFnIsColumnOfType(type, SqlTypes.isTime, SqlTypes);
  this.isTimestamp = createFnIsColumnOfType(type, SqlTypes.isTimestamp, SqlTypes);
  this.isTimestampLtz = createFnIsColumnOfType(type, SqlTypes.isTimestampLtz, SqlTypes);
  this.isTimestampNtz = createFnIsColumnOfType(type, SqlTypes.isTimestampNtz, SqlTypes);
  this.isTimestampTz = createFnIsColumnOfType(type, SqlTypes.isTimestampTz, SqlTypes);
  this.isVariant = createFnIsColumnOfType(type, (type) => SqlTypes.isVariant(type, fieldsMetadata), SqlTypes);
  this.isObject = createFnIsColumnOfType(type, (type) => SqlTypes.isObject(type, fieldsMetadata), SqlTypes);
  this.isArray = createFnIsColumnOfType(type, (type) => SqlTypes.isArray(type, fieldsMetadata), SqlTypes);
  this.isMap = createFnIsColumnOfType(type, (type) => SqlTypes.isMap(type, fieldsMetadata), SqlTypes);

  let convert;
  let toString;
  let toValue;
  let format;

  if (this.isNumber()) {
    const integerAs = statementParameters['JS_TREAT_INTEGER_AS_BIGINT'];
    if (!integerAs) {
      convert = convertRawNumber;
    } else {
      if (this.getScale() > 0 || this.getType() === SqlTypes.values.REAL) {
        convert = convertRawNumber;
      } else {
        // This is an integer so represent it as a big int
        convert = convertRawBigInt;
      }
    }
    toValue = toValueFromNumber;
    toString = toStringFromNumber;
  } else if (this.isTime()) {
    convert = convertRawTime;
    toValue = toValueFromTime;
    toString = toStringFromTime;
    format = statementParameters['TIME_OUTPUT_FORMAT'];
  } else {
    toValue = noop;

    if (this.isBoolean()) {
      convert = convertRawBoolean;
      toString = toStringFromBoolean;
    } else if (this.isDate()) {
      convert = convertRawDate;
      toString = toStringFromDate;
      format = statementParameters['DATE_OUTPUT_FORMAT'];
    } else if (this.isTimestamp()) {
      if (this.isTimestampLtz()) {
        convert = convertRawTimestampLtz;
        toString = toStringFromTimestamp;
        format = statementParameters['TIMESTAMP_LTZ_OUTPUT_FORMAT'];
      } else if (this.isTimestampNtz()) {
        convert = convertRawTimestampNtz;
        toString = toStringFromTimestamp;
        format = statementParameters['TIMESTAMP_NTZ_OUTPUT_FORMAT'];
      } else if (this.isTimestampTz()) {
        convert = convertRawTimestampTz;
        toString = toStringFromTimestamp;
        format = statementParameters['TIMESTAMP_TZ_OUTPUT_FORMAT'];
      }

      // if we don't have a type-specific timezone, use the default format
      if (!format) {
        format = statementParameters['TIMESTAMP_OUTPUT_FORMAT'];
      }
    } else if (this.isBinary()) {
      convert = convertRawBinary;
      toString = toStringFromBinary;
      format = statementParameters['BINARY_OUTPUT_FORMAT'];
    } else if (this.isVariant()) {
      convert = convertRawVariant;
      toString = toStringFromRawValue;
    } else if (this.isObject()) {
      convert = convertRawStructuredType(convertJsonObject);
      toString = toStringFromRawValue;
    } else if (this.isArray()) {
      convert = convertRawStructuredType(convertJsonArray);
      toString = toStringFromRawValue;
    } else if (this.isMap()) {
      convert = convertRawStructuredType(convertJsonMap);
      toString = toStringFromRawValue;
    } else {
      // column is of type string, so leave value as is
      convert = noop;
      toString = toStringFromString;
    }
  }

  // create a private context to pass to the extract function
  const context =
    {
      convert: convert,
      toValue: toValue,
      toString: toString,
      format: format,
      resultVersion: resultVersion,
      statementParameters: statementParameters,
      fieldsMetadata: fieldsMetadata
    };

  /**
   * Returns the value of this column in a row.
   *
   * @param {Object} row
   *
   * @returns {*}
   */
  this.getRowValue = function (row) {
    return extractFromRow.call(this, row, context, false);
  };

  /**
   * Returns the value of this in a row as a String.
   *
   * @param {Object} row
   *
   * @returns {String}
   */
  this.getRowValueAsString = function (row) {
    return extractFromRow.call(this, row, context, true);
  };
}

/**
 * Returns a function that can be used to determine if a column is of a given
 * type.
 *
 * @param {String} columnType the column type.
 * @param {Function} columnComparisonFn the column comparison function.
 * @param {Object} scope the scope in which to invoke the column comparison
 *   function.
 *
 * @returns {Function}
 */
function createFnIsColumnOfType(columnType, columnComparisonFn, scope) {
  return function () {
    return columnComparisonFn.call(scope, columnType);
  };
}

/**
 * Converts a raw column value of type Number. The returned value is an object
 * that contains the raw string version of the value as well as the
 * post-processed version of the value obtained after casting to Number.
 *
 * @param {String} rawColumnValue
 *
 * @returns {Object}
 */
function convertRawNumber(rawColumnValue) {
  return {
    raw: rawColumnValue,
    processed: Number(rawColumnValue)
  };
}

/**
 * Converts a raw column value that is an integer. The returned value is an object
 * that contains the raw string version of the value as well as the post-processed
 * version of the value obtained after casting to bigInt
 *
 * @param rawColumnValue
 * @returns {{processed: bigInt.BigInteger, raw: *}}
 */
function convertRawBigInt(rawColumnValue) {
  return {
    raw: rawColumnValue,
    processed: bigInt(rawColumnValue)
  };
}

/**
 * Converts a raw column value of type Boolean to a boolean (true, false,
 * or null).
 *
 * @param {String} rawColumnValue
 *
 * @returns {Boolean}
 */
function convertRawBoolean(rawColumnValue) {
  let ret;

  if (rawColumnValue  === true || (rawColumnValue === '1') || (rawColumnValue.toUpperCase() === 'TRUE')) {
    ret = true;
  } else if (rawColumnValue === false || (rawColumnValue === '0') || (rawColumnValue.toUpperCase() === 'FALSE')) {
    ret = false;
  } else {
    throw new Error(`Value could not be converted to boolean: ${rawColumnValue}`);
  }
  return ret;
}

/**
 * Converts a raw column value of structured type object to javascript Object
 *
 * @param {Object} json
 * @param {Object} context
 *
 * @returns {Object}
 */
function convertJsonObject(json, context) {
  if (context.fieldsMetadata){
    context.fieldsMetadata = context.fieldsMetadata.reduce(function (map, obj) {
      map[obj.name] = obj;
      return map;
    }, {});

    const result = {};
    Object.keys(json).forEach(function (key) {
      const fieldMetadata = context.fieldsMetadata[key];
      result[key] = mapStructuredTypeValue(json[key], context, fieldMetadata);
    });
    return result;
  } else {
    return json;
  }
}

/**
 * Converts a raw column value of structured type array to javascript Object
 *
 * @param {Object} json
 * @param {Object} context
 *
 * @returns {Object}
 */
function convertJsonArray(json, context) {
  if (context.fieldsMetadata) {
    const result = [];
    json.forEach(function (value) {
      result.push(mapStructuredTypeValue(value, context, context.fieldsMetadata[0]));
    });
    return result;
  } else {
    return json;
  }
}

/**
 * Converts a raw column value of structured type map to javascript Object
 *
 * @param {Object} json
 * @param {Object} context
 *
 * @returns {Object}
 */
function convertJsonMap(json, context) {
  if (Array.isArray(context.fieldsMetadata) && context.fieldsMetadata.length === 2) {
    const result = new Map;
    const keyMetadata = context.fieldsMetadata[0];
    const valueMetadata = context.fieldsMetadata[1];
    Object.keys(json).forEach(function (key) {
      const convertedKey = mapStructuredTypeValue(key, context, keyMetadata);
      const convertedValue = mapStructuredTypeValue(json[key], context, valueMetadata);
      result.set(convertedKey, convertedValue);
    });
    return result;
  } else {
    return json;
  }
}

/**
 * Converts a raw column value of structured type OBJECT to javascript Object
 *
 * @param {String} rawColumnValue
 * @param {Object} column
 * @param {Object} context
 *
 * @returns {Object}
 */
const convertRawStructuredType = (convertJsonFn) => (rawColumnValue, column, context) => {
  if (Util.string.isNotNullOrEmpty(rawColumnValue)) {
    try {
      const json = JSON.parse(rawColumnValue);
      return convertJsonFn(json, context);
    } catch (jsonParseError) {
      Logger.getInstance().debug('Column %s raw value cannot be parsed as JSON: %s ', column.name, jsonParseError.message);
      throw new Error(util.format('Column [%s] raw value cannot be parsed as JSON: %s ', column.name, jsonParseError.message));
    }
  } else {
    throw new Error(util.format('Column %s raw value is null or empty ', column.name));
  }
};

function mapStructuredTypeValue(columnValue, context, metadataField) {
  const formatLtz = context.statementParameters['TIMESTAMP_LTZ_OUTPUT_FORMAT'] ?? context.statementParameters['TIMESTAMP_OUTPUT_FORMAT'];
  const formatTz = context.statementParameters['TIMESTAMP_TZ_OUTPUT_FORMAT'] ?? context.statementParameters['TIMESTAMP_OUTPUT_FORMAT'];
  const formatNtz = context.statementParameters['TIMESTAMP_NTZ_OUTPUT_FORMAT'];
  let value;
  switch (metadataField.type) {
  case 'text':
    value = columnValue;
    break;
  case 'real':
    value = toValueFromNumber(convertRawNumber(columnValue));
    break;
  case 'fixed':
    value = toValueFromNumber(convertRawNumber(columnValue));
    break;
  case 'boolean':
    value = convertRawBoolean(columnValue);
    break;
  case 'timestamp_ltz':
    value = convertTimestampTzString(columnValue, formatLtz, context.statementParameters['TIMEZONE'], metadataField.scale).toSfDate();
    break;
  case 'timestamp_ntz':
    value = convertTimestampNtzString(columnValue, formatNtz, moment.tz.zone('UTC'), metadataField.scale).toSfDate();
    break;
  case 'timestamp_tz':
    value = convertTimestampTzString(columnValue, formatTz, context.statementParameters['TIMEZONE'], metadataField.scale).toSfDate();
    break;
  case 'date': {
    context.format = context.statementParameters['DATE_OUTPUT_FORMAT'];
    value = convertDateString(columnValue, context.format );
    break;
  }
  case 'time':
    context.format = context.statementParameters['TIME_OUTPUT_FORMAT'];
    value = convertTimeString(columnValue, context.format, moment.tz.zone('UTC'), metadataField.scale).toSfTime();
    break;
  case 'binary':
    context.format = context.statementParameters['BINARY_OUTPUT_FORMAT'];
    value = convertRawBinary(columnValue, this, context).toJSON().data;
    break;
  case 'object': {
    const internalContext = {
      convert: convertRawStructuredType(convertJsonObject),
      toValue: noop,
      toString: toString,
      format: toStringFromRawValue,
      resultVersion: context.resultVersion,
      statementParameters: context.statementParameters,
      fieldsMetadata: metadataField.fields
    };
    value = convertJsonObject(columnValue, internalContext);
    break;
  }
  case 'array': {
    const internalArrayContext = {
      convert: convertRawStructuredType(convertJsonArray),
      toValue: noop,
      toString: toString,
      format: toStringFromRawValue,
      resultVersion: context.resultVersion,
      statementParameters: context.statementParameters,
      fieldsMetadata: metadataField.fields
    };
    value = convertJsonArray(columnValue, internalArrayContext);
    break;
  }
  case 'map': {
    const internalMapContext = {
      convert: convertRawStructuredType(convertJsonMap),
      toValue: noop,
      toString: toString,
      format: toStringFromRawValue,
      resultVersion: context.resultVersion,
      statementParameters: context.statementParameters,
      fieldsMetadata: metadataField.fields
    };
    value = convertJsonMap(columnValue, internalMapContext);
    break;
  }
  default:
    Logger.getInstance().info(`Column type not supported: ${context.fieldsMetadata.type}`);
    throw new Error(`Column type not supported: ${context.fieldsMetadata.type}`);
  }
  return value;
}

const convertTimestampTzString = function (stringValue, formatSql, timezone, scale) {
  const formatMoment = dateTimeFormatConverter.convertSnowflakeFormatToMomentFormat(formatSql, scale);
  const epochSeconds = momentTimezone(stringValue, formatMoment).unix();
  return new SfTimestamp(epochSeconds, 0, scale, timezone, formatSql);
};

const convertTimestampNtzString = function (stringValue, formatSql, timezone, scale) {
  const formatMoment = dateTimeFormatConverter.convertSnowflakeFormatToMomentFormat(formatSql, scale);
  const epochSeconds = momentTimezone.utc(stringValue, formatMoment).unix();
  return new SfTimestamp(epochSeconds, 0, scale, timezone, formatSql);
};

const convertDateString = function (stringValue, formatSql) {
  const formatMoment = dateTimeFormatConverter.convertSnowflakeFormatToMomentFormat(formatSql, 0);
  const epochSeconds = momentTimezone.utc(stringValue, formatMoment).unix();
  const date = new SfTimestamp(
    epochSeconds, // convert to seconds
    0,                              // no nano seconds
    0,                              // no scale required
    'UTC',                          // use utc as the timezone
    context.format);
  date._valueAsString = stringValue;
  return date.toSfDate();
};


const convertTimeString = function (stringValue, formatSql, timezone, scale) {
  const formatMoment = dateTimeFormatConverter.convertSnowflakeFormatToMomentFormat(formatSql, scale);
  const moment = momentTimezone(stringValue, formatMoment);
  const epochSeconds = moment.hours() * 3600 + moment.minutes() * 60 + moment.seconds();
  const time =  new SfTimestamp(epochSeconds, 0, scale, timezone, formatSql);
  time._valueAsString = stringValue;
  return time;
};

/**
 * Converts a raw column value of type Date to a Snowflake Date.
 *
 * @param {String} rawColumnValue
 * @param {Object} column
 * @param {Object} context
 *
 * @returns {Date}
 */
function convertRawDate(rawColumnValue, column, context) {
  return new SfTimestamp(
    Number(rawColumnValue) * 86400, // convert to seconds
    0,                              // no nano seconds
    0,                              // no scale required
    'UTC',                          // use utc as the timezone
    context.format).toSfDate();
}

/**
 * Converts a raw column value of type Time to a Snowflake Time.
 *
 * @param {String} rawColumnValue
 * @param {Object} column
 * @param {Object} context
 *
 * @returns {Object}
 */
function convertRawTime(rawColumnValue, column, context) {
  const columnScale = column.getScale();

  // the values might be big so use BigNumber to do arithmetic
  const valFracSecsBig =
    new BigNumber(rawColumnValue).times(Math.pow(10, columnScale));

  return convertRawTimestampHelper(
    valFracSecsBig,
    columnScale,
    'UTC',
    context.format).toSfTime();
}

/**
 * Converts a raw column value of type TIMESTAMP_LTZ to a Snowflake Date.
 *
 * @param {String} rawColumnValue
 * @param {Object} column
 * @param {Object} context
 *
 * @returns {Date}
 */
function convertRawTimestampLtz(rawColumnValue, column, context) {
  const columnScale = column.getScale();

  // the values might be big so use BigNumber to do arithmetic
  const valFracSecsBig =
    new BigNumber(rawColumnValue).times(Math.pow(10, columnScale));

  // create a new snowflake date
  return convertRawTimestampHelper(
    valFracSecsBig,
    columnScale,
    context.statementParameters['TIMEZONE'],
    context.format).toSfDate();
}

/**
 * Converts a raw column value of type TIMESTAMP_NTZ to a Snowflake Date.
 *
 * @param {String} rawColumnValue
 * @param {Object} column
 * @param {Object} context
 *
 * @returns {Date}
 */
function convertRawTimestampNtz(rawColumnValue, column, context) {
  const columnScale = column.getScale();

  // the values might be big so use BigNumber to do arithmetic
  const valFracSecsBig =
    new BigNumber(rawColumnValue).times(Math.pow(10, columnScale));

  // create a new snowflake date
  return convertRawTimestampHelper(
    valFracSecsBig,
    columnScale,
    'UTC',     // it's _ntz, so use UTC for timezone
    context.format).toSfDate();
}

/**
 * Converts a raw column value of type TIMESTAMP_TZ to a Snowflake Date.
 *
 * @param {String} rawColumnValue
 * @param {Object} column
 * @param {Object} context
 *
 * @returns {Date}
 */
function convertRawTimestampTz(rawColumnValue, column, context) {
  let valFracSecsBig;
  let valFracSecsWithTzBig;
  let timezoneBig;
  let timezone;
  let timestampAndTZIndex;

  // compute the scale factor
  const columnScale = column.getScale();
  const scaleFactor = Math.pow(10, columnScale);

  const resultVersion = context.resultVersion;
  if (resultVersion === '0' || resultVersion === undefined) {
    // the values might be big so use BigNumber to do arithmetic
    valFracSecsBig =
      new BigNumber(rawColumnValue).times(scaleFactor);

    // for _tz, the timezone is baked into the value
    valFracSecsWithTzBig = valFracSecsBig;

    // extract everything but the lowest 14 bits to get the fractional seconds
    valFracSecsBig =
      valFracSecsWithTzBig.dividedBy(16384).integerValue(BigNumber.ROUND_FLOOR);

    // extract the lowest 14 bits to get the timezone
    if (valFracSecsWithTzBig.isGreaterThanOrEqualTo(0)) {
      timezoneBig = valFracSecsWithTzBig.modulo(16384);
    } else {
      timezoneBig =
        valFracSecsWithTzBig.modulo(16384).plus(16384);
    }
  } else {
    // split the value into number of seconds and timezone index
    timestampAndTZIndex = rawColumnValue.split(' ');

    // the values might be big so use BigNumber to do arithmetic
    valFracSecsBig =
      new BigNumber(timestampAndTZIndex[0]).times(scaleFactor);

    timezoneBig = new BigNumber(timestampAndTZIndex[1]);
  }

  timezone = timezoneBig.toNumber();

  // assert that timezone is valid
  Errors.assertInternal(timezone >= 0 && timezone <= 2880);

  // subtract 24 hours from the timezone to map [0, 48] to
  // [-24, 24], and convert the result to a number
  timezone = timezone - 1440;

  // create a new snowflake date
  return convertRawTimestampHelper(
    valFracSecsBig,
    columnScale,
    timezone,
    context.format).toSfDate();
}

/**
 * Helper function for the convertRawTimestamp*() functions.
 * Returns an instance of SfTimestamp.
 *
 * @param {Object} epochFracSecsBig
 * @param {Number} scale
 * @param {String | Number} timezone
 * @param {String} format
 *
 * @returns {Object}
 */
function convertRawTimestampHelper(
  epochFracSecsBig,
  scale,
  timezone,
  format) {
  // compute the scale factor
  const scaleFactor = Math.pow(10, scale);

  // split the value into epoch seconds + nanoseconds; for example,
  // 1365148923.123456789 will be split into 1365148923 (epoch seconds)
  // and 123456789 (nano seconds)
  const valSecBig = epochFracSecsBig.dividedBy(scaleFactor).integerValue(BigNumber.ROUND_FLOOR);
  const fractionsBig = epochFracSecsBig.minus(valSecBig.times(scaleFactor));
  const valSecNanoBig = fractionsBig.times(Math.pow(10, 9 - scale));

  // create a new snowflake date from the information
  return new SfTimestamp(
    valSecBig.toNumber(),
    valSecNanoBig.toNumber(),
    scale,
    timezone,
    format);
}

/**
 * Converts a raw column value of type Variant to a JavaScript value.
 *
 * @param {String} rawColumnValue
 *
 * @returns {Object | Array}
 */
function convertRawVariant(rawColumnValue) {
  // if the input is a non-empty string, convert it to a json object
  if (Util.string.isNotNullOrEmpty(rawColumnValue)) {
    try {
      return GlobalConfig.jsonColumnVariantParser(rawColumnValue);
    } catch (jsonParseError) {
      try {
        return GlobalConfig.xmlColumnVariantParser(rawColumnValue);
      } catch (xmlParseError) {
        Logger.getInstance().debug('Variant cannot be parsed neither as JSON: %s nor as XML: %s', jsonParseError.message, xmlParseError.message);
        throw new Errors.VariantParseError(jsonParseError, xmlParseError);
      }
    }
  }
}

/**
 * Converts a raw column value of type Binary to a Buffer.
 *
 * @param {String} rawColumnValue
 * @param {Object} column
 * @param {Object} context
 *
 * @returns {Buffer}
 */
function convertRawBinary(rawColumnValue, column, context) {
  // Ensure the format is valid.
  const format = context.format.toUpperCase();
  Errors.assertInternal(format === 'HEX' || format === 'BASE64');

  // Decode hex string sent by GS.
  const buffer = Buffer.from(rawColumnValue, 'HEX');

  if (format === 'HEX') {
    buffer.toStringSf = function () {
      // The raw value is already an uppercase hex string, so just return it.
      // Note that buffer.toString("HEX") returns a lowercase hex string, but we
      // want upper case.
      return rawColumnValue;
    };
  } else {
    buffer.toStringSf = function () {
      return this.toString('BASE64');
    };
  }

  buffer.getFormat = function () {
    return format;
  };

  return buffer;
}

/**
 * Returns the input value as is.
 *
 * @param {*} value
 *
 * @returns {*}
 */
function noop(value) {
  return value;
}

/**
 * The toValue() function for a column of type Number.
 *
 * @param {*} columnValue
 *
 * @returns {Number}
 */
function toValueFromNumber(columnValue) {
  return columnValue ? columnValue.processed : columnValue;
}

/**
 * The toValue() function for a column of type Time.
 *
 * @param {*} columnValue
 *
 * @returns {String}
 */
function toValueFromTime(columnValue) {
  // there's no native javascript type that can be used to represent time, so
  // just convert to string
  return toStringFromTime(columnValue);
}

/**
 * The toString() function for a column of type Number.
 *
 * @param {Number} columnValue
 *
 * @returns {String}
 */
function toStringFromNumber(columnValue) {
  return (columnValue !== null) ? columnValue.raw : DataTypes.getNullValue();
}

/**
 * The toString() function for a column of type Boolean.
 *
 * @param {Boolean} columnValue
 *
 * @returns {String}
 */
function toStringFromBoolean(columnValue) {
  return (columnValue !== null) ? String(columnValue).toUpperCase() :
    DataTypes.getNullValue();
}

/**
 * The toString() function for a column of type Date.
 *
 * @param {Date} columnValue
 *
 * @returns {String}
 */
function toStringFromDate(columnValue) {
  return (columnValue !== null) ? columnValue.toJSON() : DataTypes.getNullValue();
}

/**
 * The toString() function for a column of type Time.
 *
 * @param {Object} columnValue
 *
 * @returns {String}
 */
function toStringFromTime(columnValue) {
  return (columnValue !== null) ? columnValue.toJSON() : DataTypes.getNullValue();
}

/**
 * The toString() function for a column of type Timestamp.
 *
 * @param {Date} columnValue
 *
 * @returns {String}
 */
function toStringFromTimestamp(columnValue) {
  return (columnValue !== null) ? columnValue.toJSON() : DataTypes.getNullValue();
}

/**
 * The toString() function for a column of type Variant.
 *
 * @param {Object} columnValue
 *
 * @returns {String}
 */
function toStringFromRawValue(columnValue) {
  return (columnValue !== null) ? JSON.stringify(columnValue) : DataTypes.getNullValue();
}

/**
 * The toString() function for a column of type String.
 *
 * @param {String} columnValue
 *
 * @returns {String}
 */
function toStringFromString(columnValue) {
  return (columnValue !== null) ? columnValue : DataTypes.getNullValue();
}

/**
 * The toString() function for a column of type Binary.
 *
 * @param {Buffer} columnValue
 *
 * @returns {String}
 */
function toStringFromBinary(columnValue) {
  return (columnValue !== null) ? columnValue.toStringSf() : DataTypes.getNullValue();
}

/**
 * Extracts the value of a column from a given row.
 *
 * @param {Object} row
 * @param {Object} context
 * @param {Boolean} asString
 *
 * @returns {*}
 */
function extractFromRow(row, context, asString) {
  const map = row._arrayProcessedColumns;
  const values = row.values;

  // get the value
  const columnIndex = this.getIndex();
  let ret = values[columnIndex];

  // if we want the value as a string, and the column is of type variant, and we
  // haven't already processed the value before, we don't need to process the
  // value, so only process if none of the aforementioned conditions are true
  if (!(asString && this.isVariant() && !map[columnIndex])) {
    // if the column value has not been processed yet, process it, put it back
    // in the values array, and remember that the value has been processed
    if (!map[columnIndex]) {
      if (ret !== null) {
        ret = values[columnIndex] =
          context.convert(values[columnIndex], this, context);
      }
      map[columnIndex] = true;
    }

    // use the appropriate extraction function depending on whether
    // we want the value or a string representation of the value
    const extractFn = !asString ? context.toValue : context.toString;
    ret = extractFn(ret);
  }

  return ret;
}

module.exports = Column;
