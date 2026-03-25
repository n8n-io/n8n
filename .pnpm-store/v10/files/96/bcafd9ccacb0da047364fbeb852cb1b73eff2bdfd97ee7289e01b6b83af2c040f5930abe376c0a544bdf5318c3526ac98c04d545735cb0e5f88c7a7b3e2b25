/*
  Copyright © 2018 Andrew Powell

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of this Source Code Form.
*/
const colors = require('color-name');
const isUrl = require('is-url-superb');

const { registerWalker } = require('../walker');

const Node = require('./Node');

const escapeRegex = /^\\(.+)/;
const hexRegex = /^#(.+)/;
const colorRegex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const colorNames = Object.keys(colors);

class Word extends Node {
  constructor(options) {
    super(options);
    this.type = 'word';
    this.isColor = false;
    this.isHex = false;
    this.isUrl = false;
    this.isVariable = false;
  }

  static fromTokens(tokens, parser) {
    parser.fromFirst(tokens, Word);

    const { lastNode } = parser;
    const { value } = lastNode;
    lastNode.isColor = colorRegex.test(value) || colorNames.includes(value.toLowerCase());
    lastNode.isHex = hexRegex.test(value);
    lastNode.isUrl = value.startsWith('//') ? isUrl(`http:${value}`) : isUrl(value);
    lastNode.isVariable = Word.testVariable(tokens[0], parser);
  }

  static testEscaped(tokens) {
    const [first, next] = tokens;
    const [type, value] = first;

    return (
      type === 'word' &&
      (escapeRegex.test(value) || (value === '\\' && next && !/^\s+$/.test(next[1])))
    );
  }

  static testHex(token) {
    const [type, value] = token;

    return type === 'word' && hexRegex.test(value);
  }

  static testVariable(token, parser) {
    const [type, value] = token;
    const { prefixes } = parser.options.variables;
    const varRegex = new RegExp(`^(${prefixes.join('|')})`);

    return type === 'word' && varRegex.test(value);
  }

  static testWord(tokens, parser) {
    const [token] = tokens;

    return Word.testEscaped(tokens) || Word.testHex(token) || Word.testVariable(token, parser);
  }
}

registerWalker(Word);

module.exports = Word;
