const Moment = require('moment-timezone');
const Util = require('../../util');
const datetimeFormatConverter = require('./datetime_format_converter');
/**
 * Creates a new SfTimestamp instance.
 *
 * @param {Number} epochSeconds the epoch time in seconds.
 * @param {Number} nanoSeconds the number of nano seconds (incremental, not
 *   epoch).
 * @param {Number} scale the precision for the fractional part of the timestamp.
 * @param {String | Number} [timezone] the timezone name as a string
 *   (e.g. 'America/New_York') or the timezone offset in minutes (e.g. -240).
 * @param {String} [format] the SQL format to use to format the timestamp.
 * @constructor
 */
function SfTimestamp(epochSeconds, nanoSeconds, scale, timezone, format) {
  // pick reasonable defaults for the inputs if needed
  epochSeconds = Util.isNumber(epochSeconds) ? epochSeconds : 0;
  nanoSeconds = Util.isNumber(nanoSeconds) ? nanoSeconds : 0;
  scale = Util.isNumber(scale) ? scale : 0;
  format = Util.isString(format) ? format : '';

  // save any information we'll need later
  this.epochSeconds = epochSeconds;
  this.nanoSeconds = nanoSeconds;
  this.scale = scale;
  this.timezone = timezone;
  this.format = format;

  // Milliseconds are truncated to avoid rounding issues, and the decimal part is not useful since Moment only supports milliseconds precision
  const milliseconds = Math.trunc(nanoSeconds / 1000000);
  let moment = Moment((epochSeconds * 1000) + milliseconds);

  // set the moment's timezone
  if (Util.isString(timezone)) {
    moment = moment.tz(timezone);
  } else if (Util.isNumber(timezone)) {
    moment = moment.utcOffset(timezone);
  }

  // save the moment
  this.moment = moment;
}

/**
 * Returns a string representing the specified SfTimestamp instance.
 *
 * @returns {String}
 */
SfTimestamp.prototype.toString = function () {
  // use cached value if possible
  if (this._valueAsString) {
    return this._valueAsString;
  }

  const moment = this.moment;
  const nanoSeconds = this.nanoSeconds;
  let scale = this.scale;
  const formatSql = this.format;

  // get an upper-case version of the input sql format
  const formatSqlUpper = formatSql.toUpperCase();

  const tags = datetimeFormatConverter.formatTagsMap();

  // iterate over the format string
  const length = formatSql.length;
  let formatMoment = '';
  for (let pos = 0; pos < length;) {
    let tag = null;
    let out = null;

    // at each position, check if there's a tag at that position; if so, use
    // 'out' as the replacement
    for (let index = 0; index < tags.length; index++) {
      if (formatSqlUpper.substr(pos).indexOf(tags[index][0]) === 0) {
        tag = tags[index][0];
        out = tags[index][1];
        break;
      }
    }

    // if we didn't find a match, just insert the character after escaping it
    // (by wrapping it in square brackets)
    if (out === null) {
      formatMoment += '[' + formatSql[pos] + ']';
      pos++;
    } else {
      // we found one of our special tags
      if (out === '') {
        if (tag === 'TZH') {
          // format the moment to get the timezone string and extract the
          // hours; for example, '-0700' will be converted to '-07'
          out = moment.format('ZZ').substr(0, 3);
        } else if (tag === 'TZM') {
          // format the moment to get the timezone string and extract the
          // minutes; for example, '-0700' will be converted to '00
          out = moment.format('ZZ').substr(3);
        } else if (tag === 'FF') {
          // if 'FF' is followed by a digit, use the digit as the scale
          let digit = null;
          if (pos + tag.length < length) {
            const matches = formatSql[pos + tag.length].match(/[0-9]/);
            if (matches) {
              digit = matches[0];
            }
          }
          if (digit !== null) {
            scale = digit;
            pos++; // skip the digit as well
          }

          // if we need to include fractional seconds
          if (scale > 0) {
            // divide the nanoSeconds to get the requested number of
            // meaningful digits
            const scaled = Math.floor(nanoSeconds / Math.pow(10, 9 - scale));

            // pad with the appropriate number of leading zeros
            out = (new Array(9).join('0') + scaled).substr(-scale);
          }
        }
      }

      // append the 'out' text to the moment format and update the position
      formatMoment += out;
      pos += tag.length;
    }
  }
  // format the moment and cache the result
  const timezone = this.timezone.name || this.timezone;
  if (timezone) {
    if (typeof timezone === 'number') {
      this._valueAsString = moment.utcOffset(timezone).format(formatMoment);
    } else {
      this._valueAsString = moment.tz(timezone).format(formatMoment);
    }
  } else {
    this._valueAsString = moment.format(formatMoment);
  }
  return this._valueAsString;
};

/**
 * Converts this SfTimestamp to an SfDate that's just a normal JavaScript Date
 * with some additional methods like getEpochSeconds(), getNanoSeconds(),
 * getTimezone(), etc.
 *
 * @returns {Date}
 */
SfTimestamp.prototype.toSfDate = function () {
  // create a Date from the moment
  const date = this.moment.toDate();

  const self = this;

  date.getEpochSeconds = function () {
    return self.epochSeconds;
  };

  date.getNanoSeconds = function () {
    return self.nanoSeconds;
  };

  date.getScale = function () {
    return self.scale;
  };

  date.getTimezone = function () {
    return self.timezone;
  };

  date.getFormat = function () {
    return self.format;
  };

  date.toJSON = function () {
    return self.toString();
  };

  return date;
};

/**
 * Converts this SfTimestamp to an SfTime, which is just a JavaScript Object
 * with some methods: getMidnightSeconds(), getNanoSeconds(), etc.
 *
 * @returns {Object}
 */
SfTimestamp.prototype.toSfTime = function () {
  const self = this;
  return {
    getMidnightSeconds: function () {
      return self.epochSeconds;
    },
    getNanoSeconds: function () {
      return self.nanoSeconds;
    },
    getScale: function () {
      return self.scale;
    },
    getFormat: function () {
      return self.format;
    },
    toJSON: function () {
      return self.toString();
    }
  };
};

module.exports = SfTimestamp;
