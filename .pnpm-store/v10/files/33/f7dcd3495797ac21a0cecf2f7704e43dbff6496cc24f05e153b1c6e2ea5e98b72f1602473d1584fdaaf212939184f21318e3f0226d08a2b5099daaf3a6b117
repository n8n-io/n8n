'use strict'

var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/
var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/
var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/
var INFINITY = /^-?infinity$/

module.exports = function parseDate (isoDate) {
  if (INFINITY.test(isoDate)) {
    // Capitalize to Infinity before passing to Number
    return Number(isoDate.replace('i', 'I'))
  }
  var matches = DATE_TIME.exec(isoDate)

  if (!matches) {
    // Force YYYY-MM-DD dates to be parsed as local time
    return getDate(isoDate) || null
  }

  var isBC = !!matches[8]
  var year = parseInt(matches[1], 10)
  if (isBC) {
    year = bcYearToNegativeYear(year)
  }

  var month = parseInt(matches[2], 10) - 1
  var day = matches[3]
  var hour = parseInt(matches[4], 10)
  var minute = parseInt(matches[5], 10)
  var second = parseInt(matches[6], 10)

  var ms = matches[7]
  ms = ms ? 1000 * parseFloat(ms) : 0

  var date
  var offset = timeZoneOffset(isoDate)
  if (offset != null) {
    date = new Date(Date.UTC(year, month, day, hour, minute, second, ms))

    // Account for years from 0 to 99 being interpreted as 1900-1999
    // by Date.UTC / the multi-argument form of the Date constructor
    if (is0To99(year)) {
      date.setUTCFullYear(year)
    }

    if (offset !== 0) {
      date.setTime(date.getTime() - offset)
    }
  } else {
    date = new Date(year, month, day, hour, minute, second, ms)

    if (is0To99(year)) {
      date.setFullYear(year)
    }
  }

  return date
}

function getDate (isoDate) {
  var matches = DATE.exec(isoDate)
  if (!matches) {
    return
  }

  var year = parseInt(matches[1], 10)
  var isBC = !!matches[4]
  if (isBC) {
    year = bcYearToNegativeYear(year)
  }

  var month = parseInt(matches[2], 10) - 1
  var day = matches[3]
  // YYYY-MM-DD will be parsed as local time
  var date = new Date(year, month, day)

  if (is0To99(year)) {
    date.setFullYear(year)
  }

  return date
}

// match timezones:
// Z (UTC)
// -05
// +06:30
function timeZoneOffset (isoDate) {
  if (isoDate.endsWith('+00')) {
    return 0
  }

  var zone = TIME_ZONE.exec(isoDate.split(' ')[1])
  if (!zone) return
  var type = zone[1]

  if (type === 'Z') {
    return 0
  }
  var sign = type === '-' ? -1 : 1
  var offset = parseInt(zone[2], 10) * 3600 +
    parseInt(zone[3] || 0, 10) * 60 +
    parseInt(zone[4] || 0, 10)

  return offset * sign * 1000
}

function bcYearToNegativeYear (year) {
  // Account for numerical difference between representations of BC years
  // See: https://github.com/bendrucker/postgres-date/issues/5
  return -(year - 1)
}

function is0To99 (num) {
  return num >= 0 && num < 100
}
