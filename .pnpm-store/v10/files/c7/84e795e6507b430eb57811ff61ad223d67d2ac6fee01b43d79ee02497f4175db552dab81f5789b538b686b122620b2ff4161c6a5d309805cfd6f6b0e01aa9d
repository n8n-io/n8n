/*
  Copyright © 2018 Andrew Powell

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of this Source Code Form.
*/
const { unquote } = require('quote-unquote');

const { registerWalker } = require('../walker');

const Node = require('./Node');

class Quoted extends Node {
  constructor(options) {
    super(options);
    this.type = 'quoted';
    /**
     * When cloning the node via {@link Node.clone()} there are no constructor params
     */
    if (options && options.value) {
      this.contents = unquote(options.value);
      [this.quote] = options.value;
    }
  }

  static fromTokens(tokens, parser) {
    parser.fromFirst(tokens, Quoted);
  }
}

registerWalker(Quoted);

module.exports = Quoted;
