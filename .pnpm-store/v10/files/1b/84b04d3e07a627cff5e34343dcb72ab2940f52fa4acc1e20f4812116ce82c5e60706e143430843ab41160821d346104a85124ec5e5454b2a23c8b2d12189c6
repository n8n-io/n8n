'use strict'

module.exports = PostgresInterval

function PostgresInterval (raw) {
  if (!(this instanceof PostgresInterval)) {
    return new PostgresInterval(raw)
  }

  Object.assign(this, parse(raw))
}
const properties = ['seconds', 'minutes', 'hours', 'days', 'months', 'years']
PostgresInterval.prototype.toPostgres = function () {
  const filtered = properties.filter(key => Object.prototype.hasOwnProperty.call(this, key) && this[key] !== 0)

  // In addition to `properties`, we need to account for fractions of seconds.
  if (this.milliseconds && filtered.indexOf('seconds') < 0) {
    filtered.push('seconds')
  }

  if (filtered.length === 0) return '0'
  return filtered
    .map(function (property) {
      let value = this[property] || 0

      // Account for fractional part of seconds,
      // remove trailing zeroes.
      if (property === 'seconds' && this.milliseconds) {
        value = (value + this.milliseconds / 1000).toFixed(6).replace(/\.?0+$/, '')
      }

      return value + ' ' + property
    }, this)
    .join(' ')
}

const propertiesISOEquivalent = {
  years: 'Y',
  months: 'M',
  days: 'D',
  hours: 'H',
  minutes: 'M',
  seconds: 'S'
}
const dateProperties = ['years', 'months', 'days']
const timeProperties = ['hours', 'minutes', 'seconds']
// according to ISO 8601
PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function () {
  return toISOString.call(this, { short: false })
}

PostgresInterval.prototype.toISOStringShort = function () {
  return toISOString.call(this, { short: true })
}

function toISOString ({ short = false }) {
  const datePart = dateProperties
    .map(buildProperty, this)
    .join('')

  const timePart = timeProperties
    .map(buildProperty, this)
    .join('')

  if (!timePart.length && !datePart.length) return 'PT0S'

  if (!timePart.length) return `P${datePart}`

  return `P${datePart}T${timePart}`

  function buildProperty (property) {
    let value = this[property] || 0

    // Account for fractional part of seconds,
    // remove trailing zeroes.
    if (property === 'seconds' && this.milliseconds) {
      value = (value + this.milliseconds / 1000).toFixed(6).replace(/0+$/, '')
    }

    if (short && !value) return ''

    return value + propertiesISOEquivalent[property]
  }
}

const NUMBER = '([+-]?\\d+)'
const YEAR = `${NUMBER}\\s+years?`
const MONTH = `${NUMBER}\\s+mons?`
const DAY = `${NUMBER}\\s+days?`
// NOTE: PostgreSQL automatically overflows seconds into minutes and minutes
// into hours, so we can rely on minutes and seconds always being 2 digits
// (plus decimal for seconds). The overflow stops at hours - hours do not
// overflow into days, so could be arbitrarily long.
const TIME = '([+-])?(\\d+):(\\d\\d):(\\d\\d(?:\\.\\d{1,6})?)'
const INTERVAL = new RegExp(
  '^\\s*' +
    // All parts of an interval are optional
    [YEAR, MONTH, DAY, TIME].map((str) => '(?:' + str + ')?').join('\\s*') +
    '\\s*$'
)

// All intervals will have exactly these properties:
const ZERO_INTERVAL = Object.freeze({
  years: 0,
  months: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  milliseconds: 0.0
})

function parse (interval) {
  if (!interval) {
    return ZERO_INTERVAL
  }

  const matches = INTERVAL.exec(interval) || []

  const [
    ,
    yearsString,
    monthsString,
    daysString,
    plusMinusTime,
    hoursString,
    minutesString,
    secondsString
  ] = matches

  const timeMultiplier = plusMinusTime === '-' ? -1 : 1

  const years = yearsString ? parseInt(yearsString, 10) : 0
  const months = monthsString ? parseInt(monthsString, 10) : 0
  const days = daysString ? parseInt(daysString, 10) : 0
  const hours = hoursString ? timeMultiplier * parseInt(hoursString, 10) : 0
  const minutes = minutesString
    ? timeMultiplier * parseInt(minutesString, 10)
    : 0
  const secondsFloat = parseFloat(secondsString) || 0
  // secondsFloat is guaranteed to be >= 0, so floor is safe
  const absSeconds = Math.floor(secondsFloat)
  const seconds = timeMultiplier * absSeconds
  // Without the rounding, we end up with decimals like 455.99999999999994 instead of 456
  const milliseconds = Math.round(timeMultiplier * (secondsFloat - absSeconds) * 1000000) / 1000
  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    milliseconds
  }
}
PostgresInterval.parse = parse
