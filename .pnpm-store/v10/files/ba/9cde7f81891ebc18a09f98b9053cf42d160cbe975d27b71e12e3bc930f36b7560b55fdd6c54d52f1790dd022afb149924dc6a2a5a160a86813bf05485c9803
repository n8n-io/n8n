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

class UnicodeRange extends Node {
  constructor(options) {
    super(options);
    this.type = 'unicodeRange';
  }

  static fromTokens(tokens, parser) {
    parser.fromFirst(tokens, UnicodeRange);
  }

  static test(what) {
    return /U\+(\d|\w)+(-\w+)?(\?+)?/.test(what);
  }
}

registerWalker(UnicodeRange);

module.exports = UnicodeRange;
