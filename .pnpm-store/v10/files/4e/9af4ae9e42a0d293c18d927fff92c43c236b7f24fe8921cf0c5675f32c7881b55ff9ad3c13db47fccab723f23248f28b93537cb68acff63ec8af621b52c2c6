"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _index = require('../tokenizer/index');

var _types = require('../tokenizer/types');
var _charcodes = require('../util/charcodes');
var _base = require('./base');

// ## Parser utilities

// Tests whether parsed token is a contextual keyword.
 function isContextual(contextualKeyword) {
  return _base.state.contextualKeyword === contextualKeyword;
} exports.isContextual = isContextual;

 function isLookaheadContextual(contextualKeyword) {
  const l = _index.lookaheadTypeAndKeyword.call(void 0, );
  return l.type === _types.TokenType.name && l.contextualKeyword === contextualKeyword;
} exports.isLookaheadContextual = isLookaheadContextual;

// Consumes contextual keyword if possible.
 function eatContextual(contextualKeyword) {
  return _base.state.contextualKeyword === contextualKeyword && _index.eat.call(void 0, _types.TokenType.name);
} exports.eatContextual = eatContextual;

// Asserts that following token is given contextual keyword.
 function expectContextual(contextualKeyword) {
  if (!eatContextual(contextualKeyword)) {
    unexpected();
  }
} exports.expectContextual = expectContextual;

// Test whether a semicolon can be inserted at the current position.
 function canInsertSemicolon() {
  return _index.match.call(void 0, _types.TokenType.eof) || _index.match.call(void 0, _types.TokenType.braceR) || hasPrecedingLineBreak();
} exports.canInsertSemicolon = canInsertSemicolon;

 function hasPrecedingLineBreak() {
  const prevToken = _base.state.tokens[_base.state.tokens.length - 1];
  const lastTokEnd = prevToken ? prevToken.end : 0;
  for (let i = lastTokEnd; i < _base.state.start; i++) {
    const code = _base.input.charCodeAt(i);
    if (
      code === _charcodes.charCodes.lineFeed ||
      code === _charcodes.charCodes.carriageReturn ||
      code === 0x2028 ||
      code === 0x2029
    ) {
      return true;
    }
  }
  return false;
} exports.hasPrecedingLineBreak = hasPrecedingLineBreak;

 function hasFollowingLineBreak() {
  const nextStart = _index.nextTokenStart.call(void 0, );
  for (let i = _base.state.end; i < nextStart; i++) {
    const code = _base.input.charCodeAt(i);
    if (
      code === _charcodes.charCodes.lineFeed ||
      code === _charcodes.charCodes.carriageReturn ||
      code === 0x2028 ||
      code === 0x2029
    ) {
      return true;
    }
  }
  return false;
} exports.hasFollowingLineBreak = hasFollowingLineBreak;

 function isLineTerminator() {
  return _index.eat.call(void 0, _types.TokenType.semi) || canInsertSemicolon();
} exports.isLineTerminator = isLineTerminator;

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.
 function semicolon() {
  if (!isLineTerminator()) {
    unexpected('Unexpected token, expected ";"');
  }
} exports.semicolon = semicolon;

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error at given pos.
 function expect(type) {
  const matched = _index.eat.call(void 0, type);
  if (!matched) {
    unexpected(`Unexpected token, expected "${_types.formatTokenType.call(void 0, type)}"`);
  }
} exports.expect = expect;

/**
 * Transition the parser to an error state. All code needs to be written to naturally unwind in this
 * state, which allows us to backtrack without exceptions and without error plumbing everywhere.
 */
 function unexpected(message = "Unexpected token", pos = _base.state.start) {
  if (_base.state.error) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = new SyntaxError(message);
  err.pos = pos;
  _base.state.error = err;
  _base.state.pos = _base.input.length;
  _index.finishToken.call(void 0, _types.TokenType.eof);
} exports.unexpected = unexpected;
