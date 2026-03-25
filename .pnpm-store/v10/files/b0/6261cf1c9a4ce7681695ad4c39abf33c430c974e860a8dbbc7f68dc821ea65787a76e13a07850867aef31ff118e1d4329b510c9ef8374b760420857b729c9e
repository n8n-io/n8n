/*
  Copyright © 2018 Andrew Powell

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of this Source Code Form.
*/

const { registerWalker } = require('../walker');

const Node = require('./Node');

/** A Number is:
 * 1. None or one plus or minus symbol; then
 * 2. Either,
 *    2.1. One or more digits; and / or,
 *    2.2. One period symbol; followed by,
 *         2.2.1. One or more digits;
 *    then,
 * 3. If one "e" letter,
 *    3.1. One "e" letter; followed by,
 *         3.1.1. None or one plus or minus symbol; followed by,
 *                3.1.1.1. One or more digits.
 * @see https://drafts.csswg.org/css-syntax/#consume-a-number
 */
const numberRegex = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)$/;

/** A Unit is:
 * 1. Either,
 *    1.1. One dash; followed by,
 *         1.1.1. One letter, non-ASCII, underscore, dash; or,
 *         1.1.2. One escape slash; followed by,
 *              1.1.2.1 One non-newline;
 *         or,
 *    1.2. One letter, non-ASCII, underscore; or,
 *    1.3. One escape slash; followed by,
 *       1.3.1. One non-newline;
 *    then,
 * 2. Zero or more of;
 *    2.1 One letter, non-ASCII, underscore, dash; then / or,
 *    2.2 One escape slash; followed by,
 *        2.2.1. One non-newline.
 * @see https://drafts.csswg.org/css-syntax/#consume-numeric-token
 */
const unitRegex = /^(-?(?:[-A-Z_a-z]|[^\x00-\x7F]|\\[^\n\f\r])(?:[-\w]|[^\x00-\x7F]|\\[^\n\f\r])*|%)$/; // eslint-disable-line no-control-regex

/** A Numeric is:
 * 1. One Number; followed by,
 *    1.1 Zero or one Unit.
 */
const numericRegex = new RegExp(
  `^${numberRegex.source.slice(1, -1) + unitRegex.source.slice(1, -1)}?$`
);

class Numeric extends Node {
  constructor(options = {}) {
    super(options);
    this.type = 'numeric';
    this.unit = options.unit || '';
  }

  static fromTokens(tokens, parser) {
    parser.fromFirst(tokens, Numeric);

    const [[, rawValue]] = tokens;
    const [, value, unit = ''] = rawValue.match(numericRegex);

    const { lastNode } = parser;
    lastNode.unit = unit;
    lastNode.value = value;
  }

  static test(what) {
    return numericRegex.test(what);
  }
}

registerWalker(Numeric);

module.exports = Numeric;
