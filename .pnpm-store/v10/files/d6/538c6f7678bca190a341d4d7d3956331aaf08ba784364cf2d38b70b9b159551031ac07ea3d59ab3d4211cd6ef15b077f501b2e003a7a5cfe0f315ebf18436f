/*
  Copyright © 2018 Andrew Powell

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of this Source Code Form.
*/
const Parser = require('postcss/lib/parser');

const AtWord = require('./nodes/AtWord');
const Comment = require('./nodes/Comment');
const Func = require('./nodes/Func');
const Interpolation = require('./nodes/Interpolation');
const Numeric = require('./nodes/Numeric');
const Operator = require('./nodes/Operator');
const Punctuation = require('./nodes/Punctuation');
const Quoted = require('./nodes/Quoted');
const UnicodeRange = require('./nodes/UnicodeRange');
const Word = require('./nodes/Word');

const defaults = {
  ignoreUnknownWords: false,
  // interpolation: { prefix: '@' }
  interpolation: false,
  parentNode: null,
  variables: {
    prefixes: ['--']
  }
};

module.exports = class ValuesParser extends Parser {
  constructor(input, opts = {}) {
    super(input);

    this.lastNode = null;
    this.options = Object.assign({}, defaults, opts);
    this.parentNode = this.options.parentNode;
  }

  back(tokens) {
    for (const token of tokens.reverse()) {
      this.tokenizer.back(token);
    }
  }

  comment(token) {
    super.comment(token);

    const inline = Comment.testInline(token);
    const node = this.lastNode;
    node.inline = inline;
    Object.setPrototypeOf(node, Comment.prototype);
  }

  fromFirst(tokens, Constructor) {
    const [first] = tokens;
    const [, value, startLine, startChar] = first;
    const node = new Constructor({ value });

    this.init(node, startLine, startChar);
    this.current = node;
    this.end(first);
    this.back(tokens.slice(1));
  }

  init(node, line, column) {
    super.init(node, line, column);

    // base methods like comment() don't set this.current, so we need some way of tracking the last
    // node for manipulation
    this.lastNode = node;
  }

  other(start) {
    // console.log('other', start);

    const brackets = [];
    const tokens = [];
    let token = start;
    let type = null;
    let bracket = null;

    while (token) {
      [type] = token;
      tokens.push(token);

      if (type === '(' || type === '[') {
        if (!bracket) {
          bracket = token;
        }

        brackets.push(type === '(' ? ')' : ']');
      } else if (type === brackets[brackets.length - 1]) {
        brackets.pop();
        if (brackets.length === 0) {
          bracket = null;
        }
      }

      token = this.tokenizer.nextToken();
    }

    if (brackets.length > 0) {
      this.unclosedBracket(bracket);
    }

    this.unknownWord(tokens);
  }

  // overriden to remove certain node types we don't need
  parse() {
    let token;
    while (!this.tokenizer.endOfFile()) {
      token = this.tokenizer.nextToken();

      switch (token[0]) {
        case 'space':
          this.spaces += token[1];
          break;

        case 'comment':
          this.comment(token);
          break;

        case 'at-word':
          this.atrule(token);
          Object.setPrototypeOf(this.lastNode, AtWord.prototype);
          this.lastNode.type = 'atword';
          break;

        default:
          this.other(token);
          break;
      }
    }
    this.endFile();
  }

  unknownWord(tokens) {
    // NOTE: keep commented for examining unknown structures
    // console.log('unknown', tokens);

    const [first] = tokens;
    const [type, value] = first;

    if (Punctuation.chars.includes(type)) {
      Punctuation.fromTokens(tokens, this);
    } else if (type === 'word' && Operator.test(tokens, this)) {
      Operator.fromTokens(tokens, this);
    } else if (Func.test(tokens)) {
      Func.fromTokens(tokens, this);
    } else if (this.options.interpolation && Interpolation.test(tokens, this)) {
      Interpolation.fromTokens(tokens, this);
    } else if (type === 'brackets') {
      Punctuation.tokenizeBrackets(tokens, this);
    } else if (type === 'comma') {
      Punctuation.fromTokens(tokens, this);
    } else if (type === 'operator') {
      Operator.fromTokens(tokens, this);
    } else if (type === 'string') {
      Quoted.fromTokens(tokens, this);
    } else if (type === 'word') {
      if (value === ',') {
        Punctuation.fromTokens(tokens, this);
      } else if (value === '//') {
        Comment.tokenizeNext(tokens, this);
      } else if (Comment.testInline(first)) {
        // catch protocol-relative urls in a url() function
        // https://github.com/shellscape/postcss-values-parser/issues/65
        const { parentNode } = this;
        if (parentNode && parentNode.type === 'func' && parentNode.name === 'url') {
          Word.fromTokens(tokens, this);
        } else {
          Comment.tokenizeInline(tokens, this);
        }
      } else if (value.includes(',')) {
        Punctuation.tokenizeCommas(tokens, this);
      } else if (Word.testWord(tokens, this)) {
        // we need to catch variables before the numeric and operator tests
        Word.fromTokens(tokens, this);
      } else if (Numeric.test(value)) {
        Numeric.fromTokens(tokens, this);
      } else if (UnicodeRange.test(value)) {
        UnicodeRange.fromTokens(tokens, this);
      } else if (Operator.chars.includes(value)) {
        Operator.fromTokens(tokens, this);
      } else if (/^[\w-]+$/.test(value)) {
        Word.fromTokens(tokens, this);
      } else if (Operator.regex.test(value)) {
        Operator.tokenize(tokens, this);
      } else if (this.options.ignoreUnknownWords) {
        Word.fromTokens(tokens, this);
      } else {
        super.unknownWord(tokens);
      }
    } else {
      /* istanbul ignore next */
      super.unknownWord(tokens);
    }
  }
};
