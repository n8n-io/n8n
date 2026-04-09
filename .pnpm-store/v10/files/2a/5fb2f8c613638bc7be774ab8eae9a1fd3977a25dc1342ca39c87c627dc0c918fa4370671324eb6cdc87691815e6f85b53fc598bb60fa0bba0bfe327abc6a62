/**
Faker - Copyright (c) 2022-2023

This software consists of voluntary contributions made by many individuals.
For exact contribution history, see the revision history
available at https://github.com/faker-js/faker

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

===

From: https://github.com/faker-js/faker/commit/a9f98046c7d5eeaabe12fc587024c06d683800b8
To: https://github.com/faker-js/faker/commit/29234378807c4141588861f69421bf20b5ac635e

Based on faker.js, copyright Marak Squires and contributor, what follows below is the original license.

===

faker.js - Copyright (c) 2020
Marak Squires
http://github.com/marak/faker.js/

faker.js was inspired by and has used data definitions from:

 * https://github.com/stympy/faker/ - Copyright (c) 2007-2010 Benjamin Curtis
 * http://search.cpan.org/~jasonk/Data-Faker-0.07/ - Copyright 2004-2005 by Jason Kohles

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/** @returns {boolean} */
function boolSample() {
  return true;
}

/**
 * @param {number} min - inclusive
 * @param {number} _max - inclusive
 * @returns {number}
 */
function intSample(min, _max) {
  return min;
}

/**
 * Returns a number based on given RegEx-based quantifier symbol or quantifier values.
 *
 * @param {string} quantifierSymbol Quantifier symbols can be either of these: `?`, `*`, `+`.
 * @param {string} quantifierMin Quantifier minimum value. If given without a maximum, this will be used as the quantifier value.
 * @param {string} quantifierMax Quantifier maximum value. Will randomly get a value between the minimum and maximum if both are provided.
 *
 * @returns {number} a random number based on the given quantifier parameters.
 *
 * @example
 * getRepetitionsBasedOnQuantifierParameters('*', null, null) // 3
 * getRepetitionsBasedOnQuantifierParameters(null, 10, null) // 10
 * getRepetitionsBasedOnQuantifierParameters(null, 5, 8) // 6
 *
 * @since 8.0.0
 */
function getRepetitionsBasedOnQuantifierParameters(
  quantifierSymbol,
  quantifierMin,
  quantifierMax
) {
  let repetitions = 1;
  if (quantifierSymbol) {
    switch (quantifierSymbol) {
      case '?': {
        repetitions = boolSample() ? 0 : 1;
        break;
      }

      case '*': {
        const limit = 8;
        repetitions = intSample(0, limit);
        break;
      }

      case '+': {
        const limit = 8;
        repetitions = intSample(1, limit);
        break;
      }

      default:
        throw new Error('Unknown quantifier symbol provided.');
    }
  } else if (quantifierMin != null && quantifierMax != null) {
    repetitions = intSample(parseInt(quantifierMin), parseInt(quantifierMax));
  } else if (quantifierMin != null && quantifierMax == null) {
    repetitions = parseInt(quantifierMin);
  }

  return repetitions;
}

/**
  * Generates a string matching the given regex like expressions.
  *
  * This function doesn't provide full support of actual `RegExp`.
  * Features such as grouping, anchors and character classes are not supported.
  * If you are looking for a library that randomly generates strings based on
  * `RegExp`s, see [randexp.js](https://github.com/fent/randexp.js)
  *
  * Supported patterns:
  * - `x{times}` => Repeat the `x` exactly `times` times.
  * - `x{min,max}` => Repeat the `x` `min` to `max` times.
  * - `[x-y]` => Randomly get a character between `x` and `y` (inclusive).
  * - `[x-y]{times}` => Randomly get a character between `x` and `y` (inclusive) and repeat it `times` times.
  * - `[x-y]{min,max}` => Randomly get a character between `x` and `y` (inclusive) and repeat it `min` to `max` times.
  * - `[^...]` => Randomly get an ASCII number or letter character that is not in the given range. (e.g. `[^0-9]` will get a random non-numeric character).
  * - `[-...]` => Include dashes in the range. Must be placed after the negate character `^` and before any character sets if used (e.g. `[^-0-9]` will not get any numeric characters or dashes).
  * - `/[x-y]/i` => Randomly gets an uppercase or lowercase character between `x` and `y` (inclusive).
  * - `x?` => Randomly decide to include or not include `x`.
  * - `[x-y]?` => Randomly decide to include or not include characters between `x` and `y` (inclusive).
  * - `x*` => Repeat `x` 0 or more times.
  * - `[x-y]*` => Repeat characters between `x` and `y` (inclusive) 0 or more times.
  * - `x+` => Repeat `x` 1 or more times.
  * - `[x-y]+` => Repeat characters between `x` and `y` (inclusive) 1 or more times.
  * - `.` => returns a wildcard ASCII character that can be any number, character or symbol. Can be combined with quantifiers as well.
  *
  * @param {string | RegExp} pattern The template string/RegExp to generate a matching string for.
  * @returns {string} A string matching the given pattern.
  *
  * @throws If min value is more than max value in quantifier. e.g. `#{10,5}`
  * @throws If invalid quantifier symbol is passed in.
  *
  * @example
  * regexSample('#{5}') // '#####'
  * regexSample('#{2,9}') // '#######'
  * regexSample('[1-7]') // '5'
  * regexSample('#{3}test[1-5]') // '###test3'
  * regexSample('[0-9a-dmno]') // '5'
  * regexSample('[^a-zA-Z0-8]') // '9'
  * regexSample('[a-d0-6]{2,8}') // 'a0dc45b0'
  * regexSample('[-a-z]{5}') // 'a-zab'
  * regexSample(/[A-Z0-9]{4}-[A-Z0-9]{4}/) // 'BS4G-485H'
  * regexSample(/[A-Z]{5}/i) // 'pDKfh'
  * regexSample(/.{5}/) // '14(#B'
  * regexSample(/Joh?n/) // 'Jon'
  * regexSample(/ABC*DE/) // 'ABDE'
  * regexSample(/bee+p/) // 'beeeeeeeep'
  *
  * @since 8.0.0
  */
export function regexSample(pattern) {
  let isCaseInsensitive = false;

  if (pattern instanceof RegExp) {
    isCaseInsensitive = pattern.flags.includes('i');
    pattern = pattern.toString();
    pattern = pattern.match(/\/(.+?)\//)?.[1] ?? ''; // Remove frontslash from front and back of RegExp
  }
  
  pattern = pattern.replace(/^(\^)?(.*?)(\$)?$/, '$2'); // Remove anchors if present
  
  let min
  let max
  let repetitions

  // Deal with single wildcards
  const SINGLE_CHAR_REG =
    /([.A-Za-z0-9])(?:\{(\d+)(?:\,(\d+)|)\}|(\?|\*|\+))(?![^[]*]|[^{]*})/;
  let token = pattern.match(SINGLE_CHAR_REG);
  while (token != null) {
    const quantifierMin = token[2];
    const quantifierMax = token[3];
    const quantifierSymbol = token[4];

    repetitions = getRepetitionsBasedOnQuantifierParameters(
      quantifierSymbol,
      quantifierMin,
      quantifierMax
    );

    pattern =
      pattern.slice(0, token.index) +
      token[1].repeat(repetitions) +
      pattern.slice(token.index + token[0].length);
    token = pattern.match(SINGLE_CHAR_REG);
  }

  const SINGLE_RANGE_REG = /(\d-\d|\w-\w|\d|\w|[-!@#$&()`.+,/"])/;
  const RANGE_ALPHANUMEMRIC_REG =
    /\[(\^|)(-|)(.+?)\](?:\{(\d+)(?:\,(\d+)|)\}|(\?|\*|\+)|)/;
  // Deal with character classes with quantifiers `[a-z0-9]{min[, max]}`
  token = pattern.match(RANGE_ALPHANUMEMRIC_REG);
  while (token != null) {
    const isNegated = token[1] === '^';
    const includesDash = token[2] === '-';
    const quantifierMin = token[4];
    const quantifierMax = token[5];
    const quantifierSymbol = token[6];

    const rangeCodes = [];

    let ranges = token[3];
    let range = ranges.match(SINGLE_RANGE_REG);

    if (includesDash) {
      // 45 is the ascii code for '-'
      rangeCodes.push(45);
    }

    while (range != null) {
      if (range[0].indexOf('-') === -1) {
        // handle non-ranges
        if (isCaseInsensitive && isNaN(Number(range[0]))) {
          rangeCodes.push(range[0].toUpperCase().charCodeAt(0));
          rangeCodes.push(range[0].toLowerCase().charCodeAt(0));
        } else {
          rangeCodes.push(range[0].charCodeAt(0));
        }
      } else {
        // handle ranges
        const rangeMinMax = range[0].split('-').map((x) => x.charCodeAt(0));
        min = rangeMinMax[0];
        max = rangeMinMax[1];
        // throw error if min larger than max
        if (min > max) {
          throw new Error('Character range provided is out of order.');
        }

        for (let i = min; i <= max; i++) {
          if (isCaseInsensitive && isNaN(Number(String.fromCharCode(i)))) {
            const ch = String.fromCharCode(i);
            rangeCodes.push(ch.toUpperCase().charCodeAt(0));
            rangeCodes.push(ch.toLowerCase().charCodeAt(0));
          } else {
            rangeCodes.push(i);
          }
        }
      }

      ranges = ranges.substring(range[0].length);
      range = ranges.match(SINGLE_RANGE_REG);
    }

    repetitions = getRepetitionsBasedOnQuantifierParameters(
      quantifierSymbol,
      quantifierMin,
      quantifierMax
    );

    if (isNegated) {
      let index = -1;
      // 0-9
      for (let i = 48; i <= 57; i++) {
        index = rangeCodes.indexOf(i);
        if (index > -1) {
          rangeCodes.splice(index, 1);
          continue;
        }

        rangeCodes.push(i);
      }

      // A-Z
      for (let i = 65; i <= 90; i++) {
        index = rangeCodes.indexOf(i);
        if (index > -1) {
          rangeCodes.splice(index, 1);
          continue;
        }

        rangeCodes.push(i);
      }

      // a-z
      for (let i = 97; i <= 122; i++) {
        index = rangeCodes.indexOf(i);
        if (index > -1) {
          rangeCodes.splice(index, 1);
          continue;
        }

        rangeCodes.push(i);
      }
    }

    const generatedString = Array.from(
      { length: repetitions },
      () => String.fromCharCode(rangeCodes[intSample(0, rangeCodes.length - 1)]),
    ).join('');

    pattern =
      pattern.slice(0, token.index) +
      generatedString +
      pattern.slice(token.index + token[0].length);
    token = pattern.match(RANGE_ALPHANUMEMRIC_REG);
  }

  const RANGE_REP_REG = /(.)\{(\d+)\,(\d+)\}/;
  // Deal with quantifier ranges `{min,max}`
  token = pattern.match(RANGE_REP_REG);
  while (token != null) {
    min = parseInt(token[2]);
    max = parseInt(token[3]);
    // throw error if min larger than max
    if (min > max) {
      throw new Error('Numbers out of order in {} quantifier.');
    }

    repetitions = intSample(min, max);
    pattern =
      pattern.slice(0, token.index) +
      token[1].repeat(repetitions) +
      pattern.slice(token.index + token[0].length);
    token = pattern.match(RANGE_REP_REG);
  }

  const REP_REG = /(.)\{(\d+)\}/;
  // Deal with repeat `{num}`
  token = pattern.match(REP_REG);
  while (token != null) {
    repetitions = parseInt(token[2]);
    pattern =
      pattern.slice(0, token.index) +
      token[1].repeat(repetitions) +
      pattern.slice(token.index + token[0].length);
    token = pattern.match(REP_REG);
  }

  return pattern;
}
