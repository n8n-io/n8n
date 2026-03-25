/*
  Copyright © 2018 Andrew Powell

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of this Source Code Form.
*/
const PostCssComment = require('postcss/lib/comment');

const { stringify } = require('../ValuesStringifier');

const inlineRegex = /(\/\/)/;

class Comment extends PostCssComment {
  static testInline(token) {
    return inlineRegex.test(token[1]);
  }

  static tokenizeNext(tokens, parser) {
    const [first] = tokens;
    const newlineIndex = tokens.findIndex((t) => /\n/.test(t[1]));
    let bits = tokens;
    let rest = [];

    if (newlineIndex >= 0) {
      bits = tokens.slice(0, newlineIndex);
      rest = tokens.slice(newlineIndex);
    }

    bits = bits.map((t) => t[1]);

    // see tilde comment in tokenizeInline
    const text = bits.concat('~~').join('');
    const last = bits[bits.length - 1];
    const newToken = ['comment', text, first[2], first[3], last[2], last[3]];

    parser.back([newToken, ...rest]);
  }

  static tokenizeInline(tokens, parser) {
    const [first, ...rest] = tokens;
    const bits = first[1].split(/(\/\/.+)/).filter((t) => !!t);
    const newTokens = [];
    const [, , startLine, , endLine] = first;
    let [, , , startChar, , endChar] = first;

    for (let bit of bits) {
      const comment = bit.slice(0, 2) === '//';
      const type = comment ? 'comment' : 'word';

      if (comment) {
        // the Parser base comment() method trims the last two characters when creating the node
        // these tildes are added to counter that. it's hacky, but it works, and we don't have to
        // re-implement the method
        bit += '~~';
      }

      if (bit !== bits[0]) {
        startChar = endChar + 1;
      }

      endChar = startChar + bit.length - 1;

      newTokens.push([type, bit, startLine, startChar, endLine, endChar]);
    }

    parser.back(newTokens.concat(rest));
  }

  toString(stringifier = stringify) {
    return super.toString(stringifier);
  }
}

module.exports = Comment;
