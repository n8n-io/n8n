import cloneObject from 'date-fns/_lib/cloneObject/index.js'
import toDate from '../toDate/index.js'
import tzPattern from '../_lib/tzPattern/index.js'
import tzParseTimezone from '../_lib/tzParseTimezone/index.js'
import newDateUTC from '../_lib/newDateUTC/index.js'

/**
 * @name zonedTimeToUtc
 * @category Time Zone Helpers
 * @summary Get the UTC date/time from a date representing local time in a given time zone
 *
 * @description
 * Returns a date instance with the UTC time of the provided date of which the values
 * represented the local time in the time zone specified. In other words, if the input
 * date represented local time in time time zone, the timestamp of the output date will
 * give the equivalent UTC of that local time regardless of the current system time zone.
 *
 * @param {Date|String|Number} date - the date with values representing the local time
 * @param {String} timeZone - the time zone of this local time, can be an offset or IANA time zone
 * @param {OptionsWithTZ} [options] - the object with options. See [Options]{@link https://date-fns.org/docs/Options}
 * @param {0|1|2} [options.additionalDigits=2] - passed to `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
 * @returns {Date} the new date with the equivalent time in the time zone
 * @throws {TypeError} 2 arguments required
 * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
 *
 * @example
 * // In June 10am in Los Angeles is 5pm UTC
 * const result = zonedTimeToUtc(new Date(2014, 5, 25, 10, 0, 0), 'America/Los_Angeles')
 * //=> 2014-06-25T17:00:00.000Z
 */
export default function zonedTimeToUtc(date, timeZone, options) {
  if (typeof date === 'string' && !date.match(tzPattern)) {
    var extendedOptions = cloneObject(options)
    extendedOptions.timeZone = timeZone
    return toDate(date, extendedOptions)
  }

  var d = toDate(date, options)

  var utc = newDateUTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds()
  ).getTime()

  var offsetMilliseconds = tzParseTimezone(timeZone, new Date(utc))

  return new Date(utc + offsetMilliseconds)
}
