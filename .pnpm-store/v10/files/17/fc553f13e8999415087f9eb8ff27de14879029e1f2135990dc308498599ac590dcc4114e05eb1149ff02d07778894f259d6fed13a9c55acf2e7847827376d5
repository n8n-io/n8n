'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.extract = extract;
exports.parse = parse;
exports.parseWithComments = parseWithComments;
exports.print = print;
exports.strip = strip;
function _os() {
  const data = require('os');
  _os = function () {
    return data;
  };
  return data;
}
function _detectNewline() {
  const data = _interopRequireDefault(require('detect-newline'));
  _detectNewline = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const commentEndRe = /\*\/$/;
const commentStartRe = /^\/\*\*?/;
const docblockRe = /^\s*(\/\*\*?(.|\r?\n)*?\*\/)/;
const lineCommentRe = /(^|\s+)\/\/([^\r\n]*)/g;
const ltrimNewlineRe = /^(\r?\n)+/;
const multilineRe =
  /(?:^|\r?\n) *(@[^\r\n]*?) *\r?\n *(?![^@\r\n]*\/\/[^]*)([^@\r\n\s][^@\r\n]+?) *\r?\n/g;
const propertyRe = /(?:^|\r?\n) *@(\S+) *([^\r\n]*)/g;
const stringStartRe = /(\r?\n|^) *\* ?/g;
const STRING_ARRAY = [];
function extract(contents) {
  const match = contents.match(docblockRe);
  return match ? match[0].trimLeft() : '';
}
function strip(contents) {
  const match = contents.match(docblockRe);
  return match && match[0] ? contents.substring(match[0].length) : contents;
}
function parse(docblock) {
  return parseWithComments(docblock).pragmas;
}
function parseWithComments(docblock) {
  const line = (0, _detectNewline().default)(docblock) ?? _os().EOL;
  docblock = docblock
    .replace(commentStartRe, '')
    .replace(commentEndRe, '')
    .replace(stringStartRe, '$1');

  // Normalize multi-line directives
  let prev = '';
  while (prev !== docblock) {
    prev = docblock;
    docblock = docblock.replace(multilineRe, `${line}$1 $2${line}`);
  }
  docblock = docblock.replace(ltrimNewlineRe, '').trimRight();
  const result = Object.create(null);
  const comments = docblock
    .replace(propertyRe, '')
    .replace(ltrimNewlineRe, '')
    .trimRight();
  let match;
  while ((match = propertyRe.exec(docblock))) {
    // strip linecomments from pragmas
    const nextPragma = match[2].replace(lineCommentRe, '');
    if (
      typeof result[match[1]] === 'string' ||
      Array.isArray(result[match[1]])
    ) {
      result[match[1]] = STRING_ARRAY.concat(result[match[1]], nextPragma);
    } else {
      result[match[1]] = nextPragma;
    }
  }
  return {
    comments,
    pragmas: result
  };
}
function print({comments = '', pragmas = {}}) {
  const line = (0, _detectNewline().default)(comments) ?? _os().EOL;
  const head = '/**';
  const start = ' *';
  const tail = ' */';
  const keys = Object.keys(pragmas);
  const printedObject = keys
    .flatMap(key => printKeyValues(key, pragmas[key]))
    .map(keyValue => `${start} ${keyValue}${line}`)
    .join('');
  if (!comments) {
    if (keys.length === 0) {
      return '';
    }
    if (keys.length === 1 && !Array.isArray(pragmas[keys[0]])) {
      const value = pragmas[keys[0]];
      return `${head} ${printKeyValues(keys[0], value)[0]}${tail}`;
    }
  }
  const printedComments =
    comments
      .split(line)
      .map(textLine => `${start} ${textLine}`)
      .join(line) + line;
  return (
    head +
    line +
    (comments ? printedComments : '') +
    (comments && keys.length ? start + line : '') +
    printedObject +
    tail
  );
}
function printKeyValues(key, valueOrArray) {
  return STRING_ARRAY.concat(valueOrArray).map(value =>
    `@${key} ${value}`.trim()
  );
}
