/*
  Copyright © 2018 Andrew Powell

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of this Source Code Form.
*/
const Input = require('postcss/lib/input');
const tokenizer = require('postcss/lib/tokenize');

const operators = ['*', '-', '%', '+', '/'];
const operRegex = /([*/])/g;

const brackets = (token, tokenize) => {
  const [, , startLine, startChar, endLine, endChar] = token;
  const part = token[1].slice(1, token[1].length - 1);
  const subTokens = getTokens(part); // eslint-disable-line no-use-before-define

  // adjust line position numbers
  for (const sub of subTokens) {
    if (sub[0] !== 'space') {
      const length = sub[5] - sub[3];
      sub[2] = startLine;
      sub[3] += startChar;
      sub[4] += endLine - 1;
      sub[5] = sub[3] + length;
    }
  }

  const tokens = [['(', '(', startLine, startChar, startLine, startChar], ...subTokens];
  tokens.push([')', ')', startLine, endChar, endLine, endChar]);

  for (const tokn of tokens.reverse()) {
    tokenize.back(tokn);
  }
};

const comma = (token, tokenize) => {
  const bits = token[1].split(/([,])/);
  const tokens = [];
  const [, , startLine, , endLine] = token;
  let [, , , startChar, , endChar] = token;

  for (let bit of bits) {
    bit = bit || ',';
    const name = bit === ',' ? 'comma' : 'word';

    if (bit !== bits[0]) {
      startChar = endChar + 1;
    }

    endChar = startChar + bit.length - 1;

    tokens.push([name, bit, startLine, startChar, endLine, endChar]);
  }

  for (const tokn of tokens.reverse()) {
    tokenize.back(tokn);
  }
};

const getTokens = (what) => {
  const input = new Input(what, {});
  const tokenize = wrapTokenizer(input); // eslint-disable-line no-use-before-define
  const result = [];

  // this shouldn't ever be slow as the string being tokenized will always be small
  while (!tokenize.endOfFile()) {
    const token = tokenize.nextToken();
    result.push(token);
  }

  return result;
};

const operator = (token, tokenize) => {
  const [, value, startLine, , endLine, endChar] = token;
  const parts = value.split(operRegex);
  let [, , , startChar] = token;

  const tokens = parts.map((part) => {
    const type = operators.includes(part) ? 'operator' : 'word';
    const newToken = [type, part, startLine, startChar, endLine, endChar];

    startChar += part.length;

    return newToken;
  });

  for (const tokn of tokens.reverse()) {
    tokenize.back(tokn);
  }
};

const wrapTokenizer = (...args) => {
  const tokenize = tokenizer(...args);
  const ogNextToken = tokenize.nextToken;

  tokenize.nextToken = (...nextArgs) => {
    let token = ogNextToken(...nextArgs);

    if (!token) {
      return token;
    }

    const [type, value] = token;

    // TODO: need to adjust the line/char offsets
    if (type === 'brackets') {
      brackets(token, tokenize);
      token = ogNextToken(...nextArgs);
    } else if (type === 'word') {
      if (operators.includes(value)) {
        token[0] = 'operator';
      } else if (operRegex.test(value)) {
        operator(token, tokenize);
        token = ogNextToken(...nextArgs);
      } else if (value.length > 1 && value.includes(',')) {
        comma(token, tokenize);
        token = ogNextToken(...nextArgs);
      }
    }

    return token;
  };

  return tokenize;
};

module.exports = { getTokens, tokenizer: wrapTokenizer };
