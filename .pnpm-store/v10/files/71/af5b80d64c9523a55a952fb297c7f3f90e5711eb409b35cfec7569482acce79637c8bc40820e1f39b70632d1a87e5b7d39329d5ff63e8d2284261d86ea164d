'use strict'

/**
 * @see https://www.rfc-editor.org/rfc/rfc9110.html#name-date-time-formats
 *
 * @param {string} date
 * @returns {Date | undefined}
 */
function parseHttpDate (date) {
  // Sun, 06 Nov 1994 08:49:37 GMT    ; IMF-fixdate
  // Sun Nov  6 08:49:37 1994         ; ANSI C's asctime() format
  // Sunday, 06-Nov-94 08:49:37 GMT   ; obsolete RFC 850 format

  switch (date[3]) {
    case ',': return parseImfDate(date)
    case ' ': return parseAscTimeDate(date)
    default: return parseRfc850Date(date)
  }
}

/**
 * @see https://httpwg.org/specs/rfc9110.html#preferred.date.format
 *
 * @param {string} date
 * @returns {Date | undefined}
 */
function parseImfDate (date) {
  if (
    date.length !== 29 ||
    date[4] !== ' ' ||
    date[7] !== ' ' ||
    date[11] !== ' ' ||
    date[16] !== ' ' ||
    date[19] !== ':' ||
    date[22] !== ':' ||
    date[25] !== ' ' ||
    date[26] !== 'G' ||
    date[27] !== 'M' ||
    date[28] !== 'T'
  ) {
    return undefined
  }

  let weekday = -1
  if (date[0] === 'S' && date[1] === 'u' && date[2] === 'n') { // Sunday
    weekday = 0
  } else if (date[0] === 'M' && date[1] === 'o' && date[2] === 'n') { // Monday
    weekday = 1
  } else if (date[0] === 'T' && date[1] === 'u' && date[2] === 'e') { // Tuesday
    weekday = 2
  } else if (date[0] === 'W' && date[1] === 'e' && date[2] === 'd') { // Wednesday
    weekday = 3
  } else if (date[0] === 'T' && date[1] === 'h' && date[2] === 'u') { // Thursday
    weekday = 4
  } else if (date[0] === 'F' && date[1] === 'r' && date[2] === 'i') { // Friday
    weekday = 5
  } else if (date[0] === 'S' && date[1] === 'a' && date[2] === 't') { // Saturday
    weekday = 6
  } else {
    return undefined // Not a valid day of the week
  }

  let day = 0
  if (date[5] === '0') {
    // Single digit day, e.g. "Sun Nov 6 08:49:37 1994"
    const code = date.charCodeAt(6)
    if (code < 49 || code > 57) {
      return undefined // Not a digit
    }
    day = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(5)
    if (code1 < 49 || code1 > 51) {
      return undefined // Not a digit between 1 and 3
    }
    const code2 = date.charCodeAt(6)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    day = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  let monthIdx = -1
  if (
    (date[8] === 'J' && date[9] === 'a' && date[10] === 'n')
  ) {
    monthIdx = 0 // Jan
  } else if (
    (date[8] === 'F' && date[9] === 'e' && date[10] === 'b')
  ) {
    monthIdx = 1 // Feb
  } else if (
    (date[8] === 'M' && date[9] === 'a')
  ) {
    if (date[10] === 'r') {
      monthIdx = 2 // Mar
    } else if (date[10] === 'y') {
      monthIdx = 4 // May
    } else {
      return undefined // Invalid month
    }
  } else if (
    (date[8] === 'J')
  ) {
    if (date[9] === 'a' && date[10] === 'n') {
      monthIdx = 0 // Jan
    } else if (date[9] === 'u') {
      if (date[10] === 'n') {
        monthIdx = 5 // Jun
      } else if (date[10] === 'l') {
        monthIdx = 6 // Jul
      } else {
        return undefined // Invalid month
      }
    } else {
      return undefined // Invalid month
    }
  } else if (
    (date[8] === 'A')
  ) {
    if (date[9] === 'p' && date[10] === 'r') {
      monthIdx = 3 // Apr
    } else if (date[9] === 'u' && date[10] === 'g') {
      monthIdx = 7 // Aug
    } else {
      return undefined // Invalid month
    }
  } else if (
    (date[8] === 'S' && date[9] === 'e' && date[10] === 'p')
  ) {
    monthIdx = 8 // Sep
  } else if (
    (date[8] === 'O' && date[9] === 'c' && date[10] === 't')
  ) {
    monthIdx = 9 // Oct
  } else if (
    (date[8] === 'N' && date[9] === 'o' && date[10] === 'v')
  ) {
    monthIdx = 10 // Nov
  } else if (
    (date[8] === 'D' && date[9] === 'e' && date[10] === 'c')
  ) {
    monthIdx = 11 // Dec
  } else {
    // Not a valid month
    return undefined
  }

  const yearDigit1 = date.charCodeAt(12)
  if (yearDigit1 < 48 || yearDigit1 > 57) {
    return undefined // Not a digit
  }
  const yearDigit2 = date.charCodeAt(13)
  if (yearDigit2 < 48 || yearDigit2 > 57) {
    return undefined // Not a digit
  }
  const yearDigit3 = date.charCodeAt(14)
  if (yearDigit3 < 48 || yearDigit3 > 57) {
    return undefined // Not a digit
  }
  const yearDigit4 = date.charCodeAt(15)
  if (yearDigit4 < 48 || yearDigit4 > 57) {
    return undefined // Not a digit
  }
  const year = (yearDigit1 - 48) * 1000 + (yearDigit2 - 48) * 100 + (yearDigit3 - 48) * 10 + (yearDigit4 - 48)

  let hour = 0
  if (date[17] === '0') {
    const code = date.charCodeAt(18)
    if (code < 48 || code > 57) {
      return undefined // Not a digit
    }
    hour = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(17)
    if (code1 < 48 || code1 > 50) {
      return undefined // Not a digit between 0 and 2
    }
    const code2 = date.charCodeAt(18)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    if (code1 === 50 && code2 > 51) {
      return undefined // Hour cannot be greater than 23
    }
    hour = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  let minute = 0
  if (date[20] === '0') {
    const code = date.charCodeAt(21)
    if (code < 48 || code > 57) {
      return undefined // Not a digit
    }
    minute = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(20)
    if (code1 < 48 || code1 > 53) {
      return undefined // Not a digit between 0 and 5
    }
    const code2 = date.charCodeAt(21)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    minute = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  let second = 0
  if (date[23] === '0') {
    const code = date.charCodeAt(24)
    if (code < 48 || code > 57) {
      return undefined // Not a digit
    }
    second = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(23)
    if (code1 < 48 || code1 > 53) {
      return undefined // Not a digit between 0 and 5
    }
    const code2 = date.charCodeAt(24)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    second = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  const result = new Date(Date.UTC(year, monthIdx, day, hour, minute, second))
  return result.getUTCDay() === weekday ? result : undefined
}

/**
 * @see https://httpwg.org/specs/rfc9110.html#obsolete.date.formats
 *
 * @param {string} date
 * @returns {Date | undefined}
 */
function parseAscTimeDate (date) {
  // This is assumed to be in UTC

  if (
    date.length !== 24 ||
    date[7] !== ' ' ||
    date[10] !== ' ' ||
    date[19] !== ' '
  ) {
    return undefined
  }

  let weekday = -1
  if (date[0] === 'S' && date[1] === 'u' && date[2] === 'n') { // Sunday
    weekday = 0
  } else if (date[0] === 'M' && date[1] === 'o' && date[2] === 'n') { // Monday
    weekday = 1
  } else if (date[0] === 'T' && date[1] === 'u' && date[2] === 'e') { // Tuesday
    weekday = 2
  } else if (date[0] === 'W' && date[1] === 'e' && date[2] === 'd') { // Wednesday
    weekday = 3
  } else if (date[0] === 'T' && date[1] === 'h' && date[2] === 'u') { // Thursday
    weekday = 4
  } else if (date[0] === 'F' && date[1] === 'r' && date[2] === 'i') { // Friday
    weekday = 5
  } else if (date[0] === 'S' && date[1] === 'a' && date[2] === 't') { // Saturday
    weekday = 6
  } else {
    return undefined // Not a valid day of the week
  }

  let monthIdx = -1
  if (
    (date[4] === 'J' && date[5] === 'a' && date[6] === 'n')
  ) {
    monthIdx = 0 // Jan
  } else if (
    (date[4] === 'F' && date[5] === 'e' && date[6] === 'b')
  ) {
    monthIdx = 1 // Feb
  } else if (
    (date[4] === 'M' && date[5] === 'a')
  ) {
    if (date[6] === 'r') {
      monthIdx = 2 // Mar
    } else if (date[6] === 'y') {
      monthIdx = 4 // May
    } else {
      return undefined // Invalid month
    }
  } else if (
    (date[4] === 'J')
  ) {
    if (date[5] === 'a' && date[6] === 'n') {
      monthIdx = 0 // Jan
    } else if (date[5] === 'u') {
      if (date[6] === 'n') {
        monthIdx = 5 // Jun
      } else if (date[6] === 'l') {
        monthIdx = 6 // Jul
      } else {
        return undefined // Invalid month
      }
    } else {
      return undefined // Invalid month
    }
  } else if (
    (date[4] === 'A')
  ) {
    if (date[5] === 'p' && date[6] === 'r') {
      monthIdx = 3 // Apr
    } else if (date[5] === 'u' && date[6] === 'g') {
      monthIdx = 7 // Aug
    } else {
      return undefined // Invalid month
    }
  } else if (
    (date[4] === 'S' && date[5] === 'e' && date[6] === 'p')
  ) {
    monthIdx = 8 // Sep
  } else if (
    (date[4] === 'O' && date[5] === 'c' && date[6] === 't')
  ) {
    monthIdx = 9 // Oct
  } else if (
    (date[4] === 'N' && date[5] === 'o' && date[6] === 'v')
  ) {
    monthIdx = 10 // Nov
  } else if (
    (date[4] === 'D' && date[5] === 'e' && date[6] === 'c')
  ) {
    monthIdx = 11 // Dec
  } else {
    // Not a valid month
    return undefined
  }

  let day = 0
  if (date[8] === ' ') {
    // Single digit day, e.g. "Sun Nov 6 08:49:37 1994"
    const code = date.charCodeAt(9)
    if (code < 49 || code > 57) {
      return undefined // Not a digit
    }
    day = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(8)
    if (code1 < 49 || code1 > 51) {
      return undefined // Not a digit between 1 and 3
    }
    const code2 = date.charCodeAt(9)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    day = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  let hour = 0
  if (date[11] === '0') {
    const code = date.charCodeAt(12)
    if (code < 48 || code > 57) {
      return undefined // Not a digit
    }
    hour = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(11)
    if (code1 < 48 || code1 > 50) {
      return undefined // Not a digit between 0 and 2
    }
    const code2 = date.charCodeAt(12)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    if (code1 === 50 && code2 > 51) {
      return undefined // Hour cannot be greater than 23
    }
    hour = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  let minute = 0
  if (date[14] === '0') {
    const code = date.charCodeAt(15)
    if (code < 48 || code > 57) {
      return undefined // Not a digit
    }
    minute = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(14)
    if (code1 < 48 || code1 > 53) {
      return undefined // Not a digit between 0 and 5
    }
    const code2 = date.charCodeAt(15)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    minute = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  let second = 0
  if (date[17] === '0') {
    const code = date.charCodeAt(18)
    if (code < 48 || code > 57) {
      return undefined // Not a digit
    }
    second = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(17)
    if (code1 < 48 || code1 > 53) {
      return undefined // Not a digit between 0 and 5
    }
    const code2 = date.charCodeAt(18)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    second = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  const yearDigit1 = date.charCodeAt(20)
  if (yearDigit1 < 48 || yearDigit1 > 57) {
    return undefined // Not a digit
  }
  const yearDigit2 = date.charCodeAt(21)
  if (yearDigit2 < 48 || yearDigit2 > 57) {
    return undefined // Not a digit
  }
  const yearDigit3 = date.charCodeAt(22)
  if (yearDigit3 < 48 || yearDigit3 > 57) {
    return undefined // Not a digit
  }
  const yearDigit4 = date.charCodeAt(23)
  if (yearDigit4 < 48 || yearDigit4 > 57) {
    return undefined // Not a digit
  }
  const year = (yearDigit1 - 48) * 1000 + (yearDigit2 - 48) * 100 + (yearDigit3 - 48) * 10 + (yearDigit4 - 48)

  const result = new Date(Date.UTC(year, monthIdx, day, hour, minute, second))
  return result.getUTCDay() === weekday ? result : undefined
}

/**
 * @see https://httpwg.org/specs/rfc9110.html#obsolete.date.formats
 *
 * @param {string} date
 * @returns {Date | undefined}
 */
function parseRfc850Date (date) {
  let commaIndex = -1

  let weekday = -1
  if (date[0] === 'S') {
    if (date[1] === 'u' && date[2] === 'n' && date[3] === 'd' && date[4] === 'a' && date[5] === 'y') {
      weekday = 0 // Sunday
      commaIndex = 6
    } else if (date[1] === 'a' && date[2] === 't' && date[3] === 'u' && date[4] === 'r' && date[5] === 'd' && date[6] === 'a' && date[7] === 'y') {
      weekday = 6 // Saturday
      commaIndex = 8
    }
  } else if (date[0] === 'M' && date[1] === 'o' && date[2] === 'n' && date[3] === 'd' && date[4] === 'a' && date[5] === 'y') {
    weekday = 1 // Monday
    commaIndex = 6
  } else if (date[0] === 'T') {
    if (date[1] === 'u' && date[2] === 'e' && date[3] === 's' && date[4] === 'd' && date[5] === 'a' && date[6] === 'y') {
      weekday = 2 // Tuesday
      commaIndex = 7
    } else if (date[1] === 'h' && date[2] === 'u' && date[3] === 'r' && date[4] === 's' && date[5] === 'd' && date[6] === 'a' && date[7] === 'y') {
      weekday = 4 // Thursday
      commaIndex = 8
    }
  } else if (date[0] === 'W' && date[1] === 'e' && date[2] === 'd' && date[3] === 'n' && date[4] === 'e' && date[5] === 's' && date[6] === 'd' && date[7] === 'a' && date[8] === 'y') {
    weekday = 3 // Wednesday
    commaIndex = 9
  } else if (date[0] === 'F' && date[1] === 'r' && date[2] === 'i' && date[3] === 'd' && date[4] === 'a' && date[5] === 'y') {
    weekday = 5 // Friday
    commaIndex = 6
  } else {
    // Not a valid day name
    return undefined
  }

  if (
    date[commaIndex] !== ',' ||
    (date.length - commaIndex - 1) !== 23 ||
    date[commaIndex + 1] !== ' ' ||
    date[commaIndex + 4] !== '-' ||
    date[commaIndex + 8] !== '-' ||
    date[commaIndex + 11] !== ' ' ||
    date[commaIndex + 14] !== ':' ||
    date[commaIndex + 17] !== ':' ||
    date[commaIndex + 20] !== ' ' ||
    date[commaIndex + 21] !== 'G' ||
    date[commaIndex + 22] !== 'M' ||
    date[commaIndex + 23] !== 'T'
  ) {
    return undefined
  }

  let day = 0
  if (date[commaIndex + 2] === '0') {
    // Single digit day, e.g. "Sun Nov 6 08:49:37 1994"
    const code = date.charCodeAt(commaIndex + 3)
    if (code < 49 || code > 57) {
      return undefined // Not a digit
    }
    day = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(commaIndex + 2)
    if (code1 < 49 || code1 > 51) {
      return undefined // Not a digit between 1 and 3
    }
    const code2 = date.charCodeAt(commaIndex + 3)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    day = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  let monthIdx = -1
  if (
    (date[commaIndex + 5] === 'J' && date[commaIndex + 6] === 'a' && date[commaIndex + 7] === 'n')
  ) {
    monthIdx = 0 // Jan
  } else if (
    (date[commaIndex + 5] === 'F' && date[commaIndex + 6] === 'e' && date[commaIndex + 7] === 'b')
  ) {
    monthIdx = 1 // Feb
  } else if (
    (date[commaIndex + 5] === 'M' && date[commaIndex + 6] === 'a' && date[commaIndex + 7] === 'r')
  ) {
    monthIdx = 2 // Mar
  } else if (
    (date[commaIndex + 5] === 'A' && date[commaIndex + 6] === 'p' && date[commaIndex + 7] === 'r')
  ) {
    monthIdx = 3 // Apr
  } else if (
    (date[commaIndex + 5] === 'M' && date[commaIndex + 6] === 'a' && date[commaIndex + 7] === 'y')
  ) {
    monthIdx = 4 // May
  } else if (
    (date[commaIndex + 5] === 'J' && date[commaIndex + 6] === 'u' && date[commaIndex + 7] === 'n')
  ) {
    monthIdx = 5 // Jun
  } else if (
    (date[commaIndex + 5] === 'J' && date[commaIndex + 6] === 'u' && date[commaIndex + 7] === 'l')
  ) {
    monthIdx = 6 // Jul
  } else if (
    (date[commaIndex + 5] === 'A' && date[commaIndex + 6] === 'u' && date[commaIndex + 7] === 'g')
  ) {
    monthIdx = 7 // Aug
  } else if (
    (date[commaIndex + 5] === 'S' && date[commaIndex + 6] === 'e' && date[commaIndex + 7] === 'p')
  ) {
    monthIdx = 8 // Sep
  } else if (
    (date[commaIndex + 5] === 'O' && date[commaIndex + 6] === 'c' && date[commaIndex + 7] === 't')
  ) {
    monthIdx = 9 // Oct
  } else if (
    (date[commaIndex + 5] === 'N' && date[commaIndex + 6] === 'o' && date[commaIndex + 7] === 'v')
  ) {
    monthIdx = 10 // Nov
  } else if (
    (date[commaIndex + 5] === 'D' && date[commaIndex + 6] === 'e' && date[commaIndex + 7] === 'c')
  ) {
    monthIdx = 11 // Dec
  } else {
    // Not a valid month
    return undefined
  }

  const yearDigit1 = date.charCodeAt(commaIndex + 9)
  if (yearDigit1 < 48 || yearDigit1 > 57) {
    return undefined // Not a digit
  }
  const yearDigit2 = date.charCodeAt(commaIndex + 10)
  if (yearDigit2 < 48 || yearDigit2 > 57) {
    return undefined // Not a digit
  }

  let year = (yearDigit1 - 48) * 10 + (yearDigit2 - 48) // Convert ASCII codes to number

  // RFC 6265 states that the year is in the range 1970-2069.
  // @see https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1
  //
  // 3. If the year-value is greater than or equal to 70 and less than or
  //    equal to 99, increment the year-value by 1900.
  // 4. If the year-value is greater than or equal to 0 and less than or
  //    equal to 69, increment the year-value by 2000.
  year += year < 70 ? 2000 : 1900

  let hour = 0
  if (date[commaIndex + 12] === '0') {
    const code = date.charCodeAt(commaIndex + 13)
    if (code < 48 || code > 57) {
      return undefined // Not a digit
    }
    hour = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(commaIndex + 12)
    if (code1 < 48 || code1 > 50) {
      return undefined // Not a digit between 0 and 2
    }
    const code2 = date.charCodeAt(commaIndex + 13)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    if (code1 === 50 && code2 > 51) {
      return undefined // Hour cannot be greater than 23
    }
    hour = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  let minute = 0
  if (date[commaIndex + 15] === '0') {
    const code = date.charCodeAt(commaIndex + 16)
    if (code < 48 || code > 57) {
      return undefined // Not a digit
    }
    minute = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(commaIndex + 15)
    if (code1 < 48 || code1 > 53) {
      return undefined // Not a digit between 0 and 5
    }
    const code2 = date.charCodeAt(commaIndex + 16)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    minute = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  let second = 0
  if (date[commaIndex + 18] === '0') {
    const code = date.charCodeAt(commaIndex + 19)
    if (code < 48 || code > 57) {
      return undefined // Not a digit
    }
    second = code - 48 // Convert ASCII code to number
  } else {
    const code1 = date.charCodeAt(commaIndex + 18)
    if (code1 < 48 || code1 > 53) {
      return undefined // Not a digit between 0 and 5
    }
    const code2 = date.charCodeAt(commaIndex + 19)
    if (code2 < 48 || code2 > 57) {
      return undefined // Not a digit
    }
    second = (code1 - 48) * 10 + (code2 - 48) // Convert ASCII codes to number
  }

  const result = new Date(Date.UTC(year, monthIdx, day, hour, minute, second))
  return result.getUTCDay() === weekday ? result : undefined
}

module.exports = {
  parseHttpDate
}
