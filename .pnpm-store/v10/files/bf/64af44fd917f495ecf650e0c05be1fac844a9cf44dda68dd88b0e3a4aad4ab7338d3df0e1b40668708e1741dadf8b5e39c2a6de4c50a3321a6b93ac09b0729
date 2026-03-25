'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.extractor = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const NOT_A_DOT = '(?<!\\.\\s*)';
const CAPTURE_STRING_LITERAL = pos => `([\`'"])([^'"\`]*?)(?:\\${pos})`;
const WORD_SEPARATOR = '\\b';
const LEFT_PARENTHESIS = '\\(';
const RIGHT_PARENTHESIS = '\\)';
const WHITESPACE = '\\s*';
const OPTIONAL_COMMA = '(:?,\\s*)?';
function createRegExp(parts, flags) {
  return new RegExp(parts.join(''), flags);
}
function alternatives(...parts) {
  return `(?:${parts.join('|')})`;
}
function functionCallStart(...names) {
  return [
    NOT_A_DOT,
    WORD_SEPARATOR,
    alternatives(...names),
    WHITESPACE,
    LEFT_PARENTHESIS,
    WHITESPACE
  ];
}
const BLOCK_COMMENT_RE = /\/\*[^]*?\*\//g;
const LINE_COMMENT_RE = /\/\/.*/g;
const REQUIRE_OR_DYNAMIC_IMPORT_RE = createRegExp(
  [
    ...functionCallStart('require', 'import'),
    CAPTURE_STRING_LITERAL(1),
    WHITESPACE,
    OPTIONAL_COMMA,
    RIGHT_PARENTHESIS
  ],
  'g'
);
const IMPORT_OR_EXPORT_RE = createRegExp(
  [
    '\\b(?:import|export)\\s+(?!type(?:of)?\\s+)(?:[^\'"]+\\s+from\\s+)?',
    CAPTURE_STRING_LITERAL(1)
  ],
  'g'
);
const JEST_EXTENSIONS_RE = createRegExp(
  [
    ...functionCallStart(
      'jest\\s*\\.\\s*(?:requireActual|requireMock|genMockFromModule|createMockFromModule)'
    ),
    CAPTURE_STRING_LITERAL(1),
    WHITESPACE,
    OPTIONAL_COMMA,
    RIGHT_PARENTHESIS
  ],
  'g'
);
const extractor = {
  extract(code) {
    const dependencies = new Set();
    const addDependency = (match, _, dep) => {
      dependencies.add(dep);
      return match;
    };
    code
      .replace(BLOCK_COMMENT_RE, '')
      .replace(LINE_COMMENT_RE, '')
      .replace(IMPORT_OR_EXPORT_RE, addDependency)
      .replace(REQUIRE_OR_DYNAMIC_IMPORT_RE, addDependency)
      .replace(JEST_EXTENSIONS_RE, addDependency);
    return dependencies;
  }
};
exports.extractor = extractor;
