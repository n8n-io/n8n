"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _index = require('../tokenizer/index');
var _types = require('../tokenizer/types');
var _base = require('../traverser/base');
var _expression = require('../traverser/expression');
var _flow = require('./flow');
var _typescript = require('./typescript');

/**
 * Common parser code for TypeScript and Flow.
 */

// An apparent conditional expression could actually be an optional parameter in an arrow function.
 function typedParseConditional(noIn) {
  // If we see ?:, this can't possibly be a valid conditional. typedParseParenItem will be called
  // later to finish off the arrow parameter. We also need to handle bare ? tokens for optional
  // parameters without type annotations, i.e. ?, and ?) .
  if (_index.match.call(void 0, _types.TokenType.question)) {
    const nextType = _index.lookaheadType.call(void 0, );
    if (nextType === _types.TokenType.colon || nextType === _types.TokenType.comma || nextType === _types.TokenType.parenR) {
      return;
    }
  }
  _expression.baseParseConditional.call(void 0, noIn);
} exports.typedParseConditional = typedParseConditional;

// Note: These "type casts" are *not* valid TS expressions.
// But we parse them here and change them when completing the arrow function.
 function typedParseParenItem() {
  _index.eatTypeToken.call(void 0, _types.TokenType.question);
  if (_index.match.call(void 0, _types.TokenType.colon)) {
    if (_base.isTypeScriptEnabled) {
      _typescript.tsParseTypeAnnotation.call(void 0, );
    } else if (_base.isFlowEnabled) {
      _flow.flowParseTypeAnnotation.call(void 0, );
    }
  }
} exports.typedParseParenItem = typedParseParenItem;
