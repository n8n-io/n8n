/*
  Copyright © 2018 Andrew Powell

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of this Source Code Form.
*/
const { registerWalker } = require('../walker');

const Container = require('./Container');

class Interpolation extends Container {
  constructor(options = {}) {
    super(options);
    this.type = 'interpolation';
    this.prefix = options.prefix || '';
    if (!this.nodes) {
      this.nodes = [];
    }
  }

  static test(tokens, parser) {
    const { prefix } = parser.options.interpolation;
    const [first, next] = tokens;
    return tokens.length > 1 && first[0] === 'word' && prefix === first[1] && next[0] === '{';
  }

  static fromTokens(tokens, parser) {
    const [[, , startLine, startChar]] = tokens;
    const [first] = tokens.splice(0, 2);
    const [, prefix] = first;
    const node = new Interpolation({ prefix });
    const rightTokens = [];

    let closed = false;
    let lastToken;
    let brackets = '{';

    parser.init(node, startLine, startChar);
    parser.current = node; // eslint-disable-line no-param-reassign

    for (const token of tokens) {
      if (closed) {
        rightTokens.push(token);
      } else {
        if (token[1] === '}') {
          closed = true;
        }
        brackets += token[1];
        lastToken = token;
      }
    }

    if (!closed) {
      parser.unclosedBracket(first);
    }

    node.params = brackets;

    const params = brackets.slice(1, -1);

    if (params.length) {
      // use a new parser to parse the params of the function. recursion here makes for easier maint
      // we must require this here due to circular dependency resolution
      const { parse } = require('../'); // eslint-disable-line global-require
      const { nodes: children } = parse(params, parser.options);

      // TODO: correct line and character position (should we just pad the input? probably easiest)
      for (const child of children) {
        node.push(child);
      }
    }

    parser.end(lastToken);
    parser.back(rightTokens);
  }
}

registerWalker(Interpolation);

module.exports = Interpolation;
