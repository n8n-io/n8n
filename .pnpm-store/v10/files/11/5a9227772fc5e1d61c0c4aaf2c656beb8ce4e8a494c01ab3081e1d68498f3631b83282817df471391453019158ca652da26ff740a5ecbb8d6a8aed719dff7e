"use strict";Object.defineProperty(exports, "__esModule", {value: true});/* eslint max-len: 0 */

// A recursive descent parser operates by defining functions for all
// syntactic elements, and recursively calling those, each function
// advancing the input stream and returning an AST node. Precedence
// of constructs (for example, the fact that `!x[1]` means `!(x[1])`
// instead of `(!x)[1]` is handled by the fact that the parser
// function that parses unary prefix operators is called first, and
// in turn calls the function that parses `[]` subscripts — that
// way, it'll receive the node for `x[1]` already parsed, and wraps
// *that* in the unary operator node.
//
// Acorn uses an [operator precedence parser][opp] to handle binary
// operator precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser











var _flow = require('../plugins/flow');
var _index = require('../plugins/jsx/index');
var _types = require('../plugins/types');









var _typescript = require('../plugins/typescript');












var _index3 = require('../tokenizer/index');
var _keywords = require('../tokenizer/keywords');
var _state = require('../tokenizer/state');
var _types3 = require('../tokenizer/types');
var _charcodes = require('../util/charcodes');
var _identifier = require('../util/identifier');
var _base = require('./base');






var _lval = require('./lval');







var _statement = require('./statement');









var _util = require('./util');

 class StopState {
  
  constructor(stop) {
    this.stop = stop;
  }
} exports.StopState = StopState;

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function (s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.
 function parseExpression(noIn = false) {
  parseMaybeAssign(noIn);
  if (_index3.match.call(void 0, _types3.TokenType.comma)) {
    while (_index3.eat.call(void 0, _types3.TokenType.comma)) {
      parseMaybeAssign(noIn);
    }
  }
} exports.parseExpression = parseExpression;

/**
 * noIn is used when parsing a for loop so that we don't interpret a following "in" as the binary
 * operatior.
 * isWithinParens is used to indicate that we're parsing something that might be a comma expression
 * or might be an arrow function or might be a Flow type assertion (which requires explicit parens).
 * In these cases, we should allow : and ?: after the initial "left" part.
 */
 function parseMaybeAssign(noIn = false, isWithinParens = false) {
  if (_base.isTypeScriptEnabled) {
    return _typescript.tsParseMaybeAssign.call(void 0, noIn, isWithinParens);
  } else if (_base.isFlowEnabled) {
    return _flow.flowParseMaybeAssign.call(void 0, noIn, isWithinParens);
  } else {
    return baseParseMaybeAssign(noIn, isWithinParens);
  }
} exports.parseMaybeAssign = parseMaybeAssign;

// Parse an assignment expression. This includes applications of
// operators like `+=`.
// Returns true if the expression was an arrow function.
 function baseParseMaybeAssign(noIn, isWithinParens) {
  if (_index3.match.call(void 0, _types3.TokenType._yield)) {
    parseYield();
    return false;
  }

  if (_index3.match.call(void 0, _types3.TokenType.parenL) || _index3.match.call(void 0, _types3.TokenType.name) || _index3.match.call(void 0, _types3.TokenType._yield)) {
    _base.state.potentialArrowAt = _base.state.start;
  }

  const wasArrow = parseMaybeConditional(noIn);
  if (isWithinParens) {
    parseParenItem();
  }
  if (_base.state.type & _types3.TokenType.IS_ASSIGN) {
    _index3.next.call(void 0, );
    parseMaybeAssign(noIn);
    return false;
  }
  return wasArrow;
} exports.baseParseMaybeAssign = baseParseMaybeAssign;

// Parse a ternary conditional (`?:`) operator.
// Returns true if the expression was an arrow function.
function parseMaybeConditional(noIn) {
  const wasArrow = parseExprOps(noIn);
  if (wasArrow) {
    return true;
  }
  parseConditional(noIn);
  return false;
}

function parseConditional(noIn) {
  if (_base.isTypeScriptEnabled || _base.isFlowEnabled) {
    _types.typedParseConditional.call(void 0, noIn);
  } else {
    baseParseConditional(noIn);
  }
}

 function baseParseConditional(noIn) {
  if (_index3.eat.call(void 0, _types3.TokenType.question)) {
    parseMaybeAssign();
    _util.expect.call(void 0, _types3.TokenType.colon);
    parseMaybeAssign(noIn);
  }
} exports.baseParseConditional = baseParseConditional;

// Start the precedence parser.
// Returns true if this was an arrow function
function parseExprOps(noIn) {
  const startTokenIndex = _base.state.tokens.length;
  const wasArrow = parseMaybeUnary();
  if (wasArrow) {
    return true;
  }
  parseExprOp(startTokenIndex, -1, noIn);
  return false;
}

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.
function parseExprOp(startTokenIndex, minPrec, noIn) {
  if (
    _base.isTypeScriptEnabled &&
    (_types3.TokenType._in & _types3.TokenType.PRECEDENCE_MASK) > minPrec &&
    !_util.hasPrecedingLineBreak.call(void 0, ) &&
    (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as) || _util.eatContextual.call(void 0, _keywords.ContextualKeyword._satisfies))
  ) {
    const oldIsType = _index3.pushTypeContext.call(void 0, 1);
    _typescript.tsParseType.call(void 0, );
    _index3.popTypeContext.call(void 0, oldIsType);
    _index3.rescan_gt.call(void 0, );
    parseExprOp(startTokenIndex, minPrec, noIn);
    return;
  }

  const prec = _base.state.type & _types3.TokenType.PRECEDENCE_MASK;
  if (prec > 0 && (!noIn || !_index3.match.call(void 0, _types3.TokenType._in))) {
    if (prec > minPrec) {
      const op = _base.state.type;
      _index3.next.call(void 0, );
      if (op === _types3.TokenType.nullishCoalescing) {
        _base.state.tokens[_base.state.tokens.length - 1].nullishStartIndex = startTokenIndex;
      }

      const rhsStartTokenIndex = _base.state.tokens.length;
      parseMaybeUnary();
      // Extend the right operand of this operator if possible.
      parseExprOp(rhsStartTokenIndex, op & _types3.TokenType.IS_RIGHT_ASSOCIATIVE ? prec - 1 : prec, noIn);
      if (op === _types3.TokenType.nullishCoalescing) {
        _base.state.tokens[startTokenIndex].numNullishCoalesceStarts++;
        _base.state.tokens[_base.state.tokens.length - 1].numNullishCoalesceEnds++;
      }
      // Continue with any future operator holding this expression as the left operand.
      parseExprOp(startTokenIndex, minPrec, noIn);
    }
  }
}

// Parse unary operators, both prefix and postfix.
// Returns true if this was an arrow function.
 function parseMaybeUnary() {
  if (_base.isTypeScriptEnabled && !_base.isJSXEnabled && _index3.eat.call(void 0, _types3.TokenType.lessThan)) {
    _typescript.tsParseTypeAssertion.call(void 0, );
    return false;
  }
  if (
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._module) &&
    _index3.lookaheadCharCode.call(void 0, ) === _charcodes.charCodes.leftCurlyBrace &&
    !_util.hasFollowingLineBreak.call(void 0, )
  ) {
    parseModuleExpression();
    return false;
  }
  if (_base.state.type & _types3.TokenType.IS_PREFIX) {
    _index3.next.call(void 0, );
    parseMaybeUnary();
    return false;
  }

  const wasArrow = parseExprSubscripts();
  if (wasArrow) {
    return true;
  }
  while (_base.state.type & _types3.TokenType.IS_POSTFIX && !_util.canInsertSemicolon.call(void 0, )) {
    // The tokenizer calls everything a preincrement, so make it a postincrement when
    // we see it in that context.
    if (_base.state.type === _types3.TokenType.preIncDec) {
      _base.state.type = _types3.TokenType.postIncDec;
    }
    _index3.next.call(void 0, );
  }
  return false;
} exports.parseMaybeUnary = parseMaybeUnary;

// Parse call, dot, and `[]`-subscript expressions.
// Returns true if this was an arrow function.
 function parseExprSubscripts() {
  const startTokenIndex = _base.state.tokens.length;
  const wasArrow = parseExprAtom();
  if (wasArrow) {
    return true;
  }
  parseSubscripts(startTokenIndex);
  // If there was any optional chain operation, the start token would be marked
  // as such, so also mark the end now.
  if (_base.state.tokens.length > startTokenIndex && _base.state.tokens[startTokenIndex].isOptionalChainStart) {
    _base.state.tokens[_base.state.tokens.length - 1].isOptionalChainEnd = true;
  }
  return false;
} exports.parseExprSubscripts = parseExprSubscripts;

function parseSubscripts(startTokenIndex, noCalls = false) {
  if (_base.isFlowEnabled) {
    _flow.flowParseSubscripts.call(void 0, startTokenIndex, noCalls);
  } else {
    baseParseSubscripts(startTokenIndex, noCalls);
  }
}

 function baseParseSubscripts(startTokenIndex, noCalls = false) {
  const stopState = new StopState(false);
  do {
    parseSubscript(startTokenIndex, noCalls, stopState);
  } while (!stopState.stop && !_base.state.error);
} exports.baseParseSubscripts = baseParseSubscripts;

function parseSubscript(startTokenIndex, noCalls, stopState) {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
  } else if (_base.isFlowEnabled) {
    _flow.flowParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
  } else {
    baseParseSubscript(startTokenIndex, noCalls, stopState);
  }
}

/** Set 'state.stop = true' to indicate that we should stop parsing subscripts. */
 function baseParseSubscript(
  startTokenIndex,
  noCalls,
  stopState,
) {
  if (!noCalls && _index3.eat.call(void 0, _types3.TokenType.doubleColon)) {
    parseNoCallExpr();
    stopState.stop = true;
    // Propagate startTokenIndex so that `a::b?.()` will keep `a` as the first token. We may want
    // to revisit this in the future when fully supporting bind syntax.
    parseSubscripts(startTokenIndex, noCalls);
  } else if (_index3.match.call(void 0, _types3.TokenType.questionDot)) {
    _base.state.tokens[startTokenIndex].isOptionalChainStart = true;
    if (noCalls && _index3.lookaheadType.call(void 0, ) === _types3.TokenType.parenL) {
      stopState.stop = true;
      return;
    }
    _index3.next.call(void 0, );
    _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;

    if (_index3.eat.call(void 0, _types3.TokenType.bracketL)) {
      parseExpression();
      _util.expect.call(void 0, _types3.TokenType.bracketR);
    } else if (_index3.eat.call(void 0, _types3.TokenType.parenL)) {
      parseCallExpressionArguments();
    } else {
      parseMaybePrivateName();
    }
  } else if (_index3.eat.call(void 0, _types3.TokenType.dot)) {
    _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
    parseMaybePrivateName();
  } else if (_index3.eat.call(void 0, _types3.TokenType.bracketL)) {
    _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
    parseExpression();
    _util.expect.call(void 0, _types3.TokenType.bracketR);
  } else if (!noCalls && _index3.match.call(void 0, _types3.TokenType.parenL)) {
    if (atPossibleAsync()) {
      // We see "async", but it's possible it's a usage of the name "async". Parse as if it's a
      // function call, and if we see an arrow later, backtrack and re-parse as a parameter list.
      const snapshot = _base.state.snapshot();
      const asyncStartTokenIndex = _base.state.tokens.length;
      _index3.next.call(void 0, );
      _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;

      const callContextId = _base.getNextContextId.call(void 0, );

      _base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
      parseCallExpressionArguments();
      _base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;

      if (shouldParseAsyncArrow()) {
        // We hit an arrow, so backtrack and start again parsing function parameters.
        _base.state.restoreFromSnapshot(snapshot);
        stopState.stop = true;
        _base.state.scopeDepth++;

        _statement.parseFunctionParams.call(void 0, );
        parseAsyncArrowFromCallExpression(asyncStartTokenIndex);
      }
    } else {
      _index3.next.call(void 0, );
      _base.state.tokens[_base.state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
      const callContextId = _base.getNextContextId.call(void 0, );
      _base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
      parseCallExpressionArguments();
      _base.state.tokens[_base.state.tokens.length - 1].contextId = callContextId;
    }
  } else if (_index3.match.call(void 0, _types3.TokenType.backQuote)) {
    // Tagged template expression.
    parseTemplate();
  } else {
    stopState.stop = true;
  }
} exports.baseParseSubscript = baseParseSubscript;

 function atPossibleAsync() {
  // This was made less strict than the original version to avoid passing around nodes, but it
  // should be safe to have rare false positives here.
  return (
    _base.state.tokens[_base.state.tokens.length - 1].contextualKeyword === _keywords.ContextualKeyword._async &&
    !_util.canInsertSemicolon.call(void 0, )
  );
} exports.atPossibleAsync = atPossibleAsync;

 function parseCallExpressionArguments() {
  let first = true;
  while (!_index3.eat.call(void 0, _types3.TokenType.parenR) && !_base.state.error) {
    if (first) {
      first = false;
    } else {
      _util.expect.call(void 0, _types3.TokenType.comma);
      if (_index3.eat.call(void 0, _types3.TokenType.parenR)) {
        break;
      }
    }

    parseExprListItem(false);
  }
} exports.parseCallExpressionArguments = parseCallExpressionArguments;

function shouldParseAsyncArrow() {
  return _index3.match.call(void 0, _types3.TokenType.colon) || _index3.match.call(void 0, _types3.TokenType.arrow);
}

function parseAsyncArrowFromCallExpression(startTokenIndex) {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsStartParseAsyncArrowFromCallExpression.call(void 0, );
  } else if (_base.isFlowEnabled) {
    _flow.flowStartParseAsyncArrowFromCallExpression.call(void 0, );
  }
  _util.expect.call(void 0, _types3.TokenType.arrow);
  parseArrowExpression(startTokenIndex);
}

// Parse a no-call expression (like argument of `new` or `::` operators).

function parseNoCallExpr() {
  const startTokenIndex = _base.state.tokens.length;
  parseExprAtom();
  parseSubscripts(startTokenIndex, true);
}

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.
// Returns true if the parsed expression was an arrow function.
 function parseExprAtom() {
  if (_index3.eat.call(void 0, _types3.TokenType.modulo)) {
    // V8 intrinsic expression. Just parse the identifier, and the function invocation is parsed
    // naturally.
    parseIdentifier();
    return false;
  }

  if (_index3.match.call(void 0, _types3.TokenType.jsxText) || _index3.match.call(void 0, _types3.TokenType.jsxEmptyText)) {
    parseLiteral();
    return false;
  } else if (_index3.match.call(void 0, _types3.TokenType.lessThan) && _base.isJSXEnabled) {
    _base.state.type = _types3.TokenType.jsxTagStart;
    _index.jsxParseElement.call(void 0, );
    _index3.next.call(void 0, );
    return false;
  }

  const canBeArrow = _base.state.potentialArrowAt === _base.state.start;
  switch (_base.state.type) {
    case _types3.TokenType.slash:
    case _types3.TokenType.assign:
      _index3.retokenizeSlashAsRegex.call(void 0, );
    // Fall through.

    case _types3.TokenType._super:
    case _types3.TokenType._this:
    case _types3.TokenType.regexp:
    case _types3.TokenType.num:
    case _types3.TokenType.bigint:
    case _types3.TokenType.decimal:
    case _types3.TokenType.string:
    case _types3.TokenType._null:
    case _types3.TokenType._true:
    case _types3.TokenType._false:
      _index3.next.call(void 0, );
      return false;

    case _types3.TokenType._import:
      _index3.next.call(void 0, );
      if (_index3.match.call(void 0, _types3.TokenType.dot)) {
        // import.meta
        _base.state.tokens[_base.state.tokens.length - 1].type = _types3.TokenType.name;
        _index3.next.call(void 0, );
        parseIdentifier();
      }
      return false;

    case _types3.TokenType.name: {
      const startTokenIndex = _base.state.tokens.length;
      const functionStart = _base.state.start;
      const contextualKeyword = _base.state.contextualKeyword;
      parseIdentifier();
      if (contextualKeyword === _keywords.ContextualKeyword._await) {
        parseAwait();
        return false;
      } else if (
        contextualKeyword === _keywords.ContextualKeyword._async &&
        _index3.match.call(void 0, _types3.TokenType._function) &&
        !_util.canInsertSemicolon.call(void 0, )
      ) {
        _index3.next.call(void 0, );
        _statement.parseFunction.call(void 0, functionStart, false);
        return false;
      } else if (
        canBeArrow &&
        contextualKeyword === _keywords.ContextualKeyword._async &&
        !_util.canInsertSemicolon.call(void 0, ) &&
        _index3.match.call(void 0, _types3.TokenType.name)
      ) {
        _base.state.scopeDepth++;
        _lval.parseBindingIdentifier.call(void 0, false);
        _util.expect.call(void 0, _types3.TokenType.arrow);
        // let foo = async bar => {};
        parseArrowExpression(startTokenIndex);
        return true;
      } else if (_index3.match.call(void 0, _types3.TokenType._do) && !_util.canInsertSemicolon.call(void 0, )) {
        _index3.next.call(void 0, );
        _statement.parseBlock.call(void 0, );
        return false;
      }

      if (canBeArrow && !_util.canInsertSemicolon.call(void 0, ) && _index3.match.call(void 0, _types3.TokenType.arrow)) {
        _base.state.scopeDepth++;
        _lval.markPriorBindingIdentifier.call(void 0, false);
        _util.expect.call(void 0, _types3.TokenType.arrow);
        parseArrowExpression(startTokenIndex);
        return true;
      }

      _base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index3.IdentifierRole.Access;
      return false;
    }

    case _types3.TokenType._do: {
      _index3.next.call(void 0, );
      _statement.parseBlock.call(void 0, );
      return false;
    }

    case _types3.TokenType.parenL: {
      const wasArrow = parseParenAndDistinguishExpression(canBeArrow);
      return wasArrow;
    }

    case _types3.TokenType.bracketL:
      _index3.next.call(void 0, );
      parseExprList(_types3.TokenType.bracketR, true);
      return false;

    case _types3.TokenType.braceL:
      parseObj(false, false);
      return false;

    case _types3.TokenType._function:
      parseFunctionExpression();
      return false;

    case _types3.TokenType.at:
      _statement.parseDecorators.call(void 0, );
    // Fall through.

    case _types3.TokenType._class:
      _statement.parseClass.call(void 0, false);
      return false;

    case _types3.TokenType._new:
      parseNew();
      return false;

    case _types3.TokenType.backQuote:
      parseTemplate();
      return false;

    case _types3.TokenType.doubleColon: {
      _index3.next.call(void 0, );
      parseNoCallExpr();
      return false;
    }

    case _types3.TokenType.hash: {
      const code = _index3.lookaheadCharCode.call(void 0, );
      if (_identifier.IS_IDENTIFIER_START[code] || code === _charcodes.charCodes.backslash) {
        parseMaybePrivateName();
      } else {
        _index3.next.call(void 0, );
      }
      // Smart pipeline topic reference.
      return false;
    }

    default:
      _util.unexpected.call(void 0, );
      return false;
  }
} exports.parseExprAtom = parseExprAtom;

function parseMaybePrivateName() {
  _index3.eat.call(void 0, _types3.TokenType.hash);
  parseIdentifier();
}

function parseFunctionExpression() {
  const functionStart = _base.state.start;
  parseIdentifier();
  if (_index3.eat.call(void 0, _types3.TokenType.dot)) {
    // function.sent
    parseIdentifier();
  }
  _statement.parseFunction.call(void 0, functionStart, false);
}

 function parseLiteral() {
  _index3.next.call(void 0, );
} exports.parseLiteral = parseLiteral;

 function parseParenExpression() {
  _util.expect.call(void 0, _types3.TokenType.parenL);
  parseExpression();
  _util.expect.call(void 0, _types3.TokenType.parenR);
} exports.parseParenExpression = parseParenExpression;

// Returns true if this was an arrow expression.
function parseParenAndDistinguishExpression(canBeArrow) {
  // Assume this is a normal parenthesized expression, but if we see an arrow, we'll bail and
  // start over as a parameter list.
  const snapshot = _base.state.snapshot();

  const startTokenIndex = _base.state.tokens.length;
  _util.expect.call(void 0, _types3.TokenType.parenL);

  let first = true;

  while (!_index3.match.call(void 0, _types3.TokenType.parenR) && !_base.state.error) {
    if (first) {
      first = false;
    } else {
      _util.expect.call(void 0, _types3.TokenType.comma);
      if (_index3.match.call(void 0, _types3.TokenType.parenR)) {
        break;
      }
    }

    if (_index3.match.call(void 0, _types3.TokenType.ellipsis)) {
      _lval.parseRest.call(void 0, false /* isBlockScope */);
      parseParenItem();
      break;
    } else {
      parseMaybeAssign(false, true);
    }
  }

  _util.expect.call(void 0, _types3.TokenType.parenR);

  if (canBeArrow && shouldParseArrow()) {
    const wasArrow = parseArrow();
    if (wasArrow) {
      // It was an arrow function this whole time, so start over and parse it as params so that we
      // get proper token annotations.
      _base.state.restoreFromSnapshot(snapshot);
      _base.state.scopeDepth++;
      // Don't specify a context ID because arrow functions don't need a context ID.
      _statement.parseFunctionParams.call(void 0, );
      parseArrow();
      parseArrowExpression(startTokenIndex);
      if (_base.state.error) {
        // Nevermind! This must have been something that looks very much like an
        // arrow function but where its "parameter list" isn't actually a valid
        // parameter list. Force non-arrow parsing.
        // See https://github.com/alangpierce/sucrase/issues/666 for an example.
        _base.state.restoreFromSnapshot(snapshot);
        parseParenAndDistinguishExpression(false);
        return false;
      }
      return true;
    }
  }

  return false;
}

function shouldParseArrow() {
  return _index3.match.call(void 0, _types3.TokenType.colon) || !_util.canInsertSemicolon.call(void 0, );
}

// Returns whether there was an arrow token.
 function parseArrow() {
  if (_base.isTypeScriptEnabled) {
    return _typescript.tsParseArrow.call(void 0, );
  } else if (_base.isFlowEnabled) {
    return _flow.flowParseArrow.call(void 0, );
  } else {
    return _index3.eat.call(void 0, _types3.TokenType.arrow);
  }
} exports.parseArrow = parseArrow;

function parseParenItem() {
  if (_base.isTypeScriptEnabled || _base.isFlowEnabled) {
    _types.typedParseParenItem.call(void 0, );
  }
}

// New's precedence is slightly tricky. It must allow its argument to
// be a `[]` or dot subscript expression, but not a call — at least,
// not without wrapping it in parentheses. Thus, it uses the noCalls
// argument to parseSubscripts to prevent it from consuming the
// argument list.
function parseNew() {
  _util.expect.call(void 0, _types3.TokenType._new);
  if (_index3.eat.call(void 0, _types3.TokenType.dot)) {
    // new.target
    parseIdentifier();
    return;
  }
  parseNewCallee();
  if (_base.isFlowEnabled) {
    _flow.flowStartParseNewArguments.call(void 0, );
  }
  if (_index3.eat.call(void 0, _types3.TokenType.parenL)) {
    parseExprList(_types3.TokenType.parenR);
  }
}

function parseNewCallee() {
  parseNoCallExpr();
  _index3.eat.call(void 0, _types3.TokenType.questionDot);
}

 function parseTemplate() {
  // Finish `, read quasi
  _index3.nextTemplateToken.call(void 0, );
  // Finish quasi, read ${
  _index3.nextTemplateToken.call(void 0, );
  while (!_index3.match.call(void 0, _types3.TokenType.backQuote) && !_base.state.error) {
    _util.expect.call(void 0, _types3.TokenType.dollarBraceL);
    parseExpression();
    // Finish }, read quasi
    _index3.nextTemplateToken.call(void 0, );
    // Finish quasi, read either ${ or `
    _index3.nextTemplateToken.call(void 0, );
  }
  _index3.next.call(void 0, );
} exports.parseTemplate = parseTemplate;

// Parse an object literal or binding pattern.
 function parseObj(isPattern, isBlockScope) {
  // Attach a context ID to the object open and close brace and each object key.
  const contextId = _base.getNextContextId.call(void 0, );
  let first = true;

  _index3.next.call(void 0, );
  _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;

  while (!_index3.eat.call(void 0, _types3.TokenType.braceR) && !_base.state.error) {
    if (first) {
      first = false;
    } else {
      _util.expect.call(void 0, _types3.TokenType.comma);
      if (_index3.eat.call(void 0, _types3.TokenType.braceR)) {
        break;
      }
    }

    let isGenerator = false;
    if (_index3.match.call(void 0, _types3.TokenType.ellipsis)) {
      const previousIndex = _base.state.tokens.length;
      _lval.parseSpread.call(void 0, );
      if (isPattern) {
        // Mark role when the only thing being spread over is an identifier.
        if (_base.state.tokens.length === previousIndex + 2) {
          _lval.markPriorBindingIdentifier.call(void 0, isBlockScope);
        }
        if (_index3.eat.call(void 0, _types3.TokenType.braceR)) {
          break;
        }
      }
      continue;
    }

    if (!isPattern) {
      isGenerator = _index3.eat.call(void 0, _types3.TokenType.star);
    }

    if (!isPattern && _util.isContextual.call(void 0, _keywords.ContextualKeyword._async)) {
      if (isGenerator) _util.unexpected.call(void 0, );

      parseIdentifier();
      if (
        _index3.match.call(void 0, _types3.TokenType.colon) ||
        _index3.match.call(void 0, _types3.TokenType.parenL) ||
        _index3.match.call(void 0, _types3.TokenType.braceR) ||
        _index3.match.call(void 0, _types3.TokenType.eq) ||
        _index3.match.call(void 0, _types3.TokenType.comma)
      ) {
        // This is a key called "async" rather than an async function.
      } else {
        if (_index3.match.call(void 0, _types3.TokenType.star)) {
          _index3.next.call(void 0, );
          isGenerator = true;
        }
        parsePropertyName(contextId);
      }
    } else {
      parsePropertyName(contextId);
    }

    parseObjPropValue(isPattern, isBlockScope, contextId);
  }

  _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
} exports.parseObj = parseObj;

function isGetterOrSetterMethod(isPattern) {
  // We go off of the next and don't bother checking if the node key is actually "get" or "set".
  // This lets us avoid generating a node, and should only make the validation worse.
  return (
    !isPattern &&
    (_index3.match.call(void 0, _types3.TokenType.string) || // get "string"() {}
      _index3.match.call(void 0, _types3.TokenType.num) || // get 1() {}
      _index3.match.call(void 0, _types3.TokenType.bracketL) || // get ["string"]() {}
      _index3.match.call(void 0, _types3.TokenType.name) || // get foo() {}
      !!(_base.state.type & _types3.TokenType.IS_KEYWORD)) // get debugger() {}
  );
}

// Returns true if this was a method.
function parseObjectMethod(isPattern, objectContextId) {
  // We don't need to worry about modifiers because object methods can't have optional bodies, so
  // the start will never be used.
  const functionStart = _base.state.start;
  if (_index3.match.call(void 0, _types3.TokenType.parenL)) {
    if (isPattern) _util.unexpected.call(void 0, );
    parseMethod(functionStart, /* isConstructor */ false);
    return true;
  }

  if (isGetterOrSetterMethod(isPattern)) {
    parsePropertyName(objectContextId);
    parseMethod(functionStart, /* isConstructor */ false);
    return true;
  }
  return false;
}

function parseObjectProperty(isPattern, isBlockScope) {
  if (_index3.eat.call(void 0, _types3.TokenType.colon)) {
    if (isPattern) {
      _lval.parseMaybeDefault.call(void 0, isBlockScope);
    } else {
      parseMaybeAssign(false);
    }
    return;
  }

  // Since there's no colon, we assume this is an object shorthand.

  // If we're in a destructuring, we've now discovered that the key was actually an assignee, so
  // we need to tag it as a declaration with the appropriate scope. Otherwise, we might need to
  // transform it on access, so mark it as a normal object shorthand.
  let identifierRole;
  if (isPattern) {
    if (_base.state.scopeDepth === 0) {
      identifierRole = _index3.IdentifierRole.ObjectShorthandTopLevelDeclaration;
    } else if (isBlockScope) {
      identifierRole = _index3.IdentifierRole.ObjectShorthandBlockScopedDeclaration;
    } else {
      identifierRole = _index3.IdentifierRole.ObjectShorthandFunctionScopedDeclaration;
    }
  } else {
    identifierRole = _index3.IdentifierRole.ObjectShorthand;
  }
  _base.state.tokens[_base.state.tokens.length - 1].identifierRole = identifierRole;

  // Regardless of whether we know this to be a pattern or if we're in an ambiguous context, allow
  // parsing as if there's a default value.
  _lval.parseMaybeDefault.call(void 0, isBlockScope, true);
}

function parseObjPropValue(
  isPattern,
  isBlockScope,
  objectContextId,
) {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsStartParseObjPropValue.call(void 0, );
  } else if (_base.isFlowEnabled) {
    _flow.flowStartParseObjPropValue.call(void 0, );
  }
  const wasMethod = parseObjectMethod(isPattern, objectContextId);
  if (!wasMethod) {
    parseObjectProperty(isPattern, isBlockScope);
  }
}

 function parsePropertyName(objectContextId) {
  if (_base.isFlowEnabled) {
    _flow.flowParseVariance.call(void 0, );
  }
  if (_index3.eat.call(void 0, _types3.TokenType.bracketL)) {
    _base.state.tokens[_base.state.tokens.length - 1].contextId = objectContextId;
    parseMaybeAssign();
    _util.expect.call(void 0, _types3.TokenType.bracketR);
    _base.state.tokens[_base.state.tokens.length - 1].contextId = objectContextId;
  } else {
    if (_index3.match.call(void 0, _types3.TokenType.num) || _index3.match.call(void 0, _types3.TokenType.string) || _index3.match.call(void 0, _types3.TokenType.bigint) || _index3.match.call(void 0, _types3.TokenType.decimal)) {
      parseExprAtom();
    } else {
      parseMaybePrivateName();
    }

    _base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index3.IdentifierRole.ObjectKey;
    _base.state.tokens[_base.state.tokens.length - 1].contextId = objectContextId;
  }
} exports.parsePropertyName = parsePropertyName;

// Parse object or class method.
 function parseMethod(functionStart, isConstructor) {
  const funcContextId = _base.getNextContextId.call(void 0, );

  _base.state.scopeDepth++;
  const startTokenIndex = _base.state.tokens.length;
  const allowModifiers = isConstructor; // For TypeScript parameter properties
  _statement.parseFunctionParams.call(void 0, allowModifiers, funcContextId);
  parseFunctionBodyAndFinish(functionStart, funcContextId);
  const endTokenIndex = _base.state.tokens.length;
  _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, true));
  _base.state.scopeDepth--;
} exports.parseMethod = parseMethod;

// Parse arrow function expression.
// If the parameters are provided, they will be converted to an
// assignable list.
 function parseArrowExpression(startTokenIndex) {
  parseFunctionBody(true);
  const endTokenIndex = _base.state.tokens.length;
  _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, true));
  _base.state.scopeDepth--;
} exports.parseArrowExpression = parseArrowExpression;

 function parseFunctionBodyAndFinish(functionStart, funcContextId = 0) {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsParseFunctionBodyAndFinish.call(void 0, functionStart, funcContextId);
  } else if (_base.isFlowEnabled) {
    _flow.flowParseFunctionBodyAndFinish.call(void 0, funcContextId);
  } else {
    parseFunctionBody(false, funcContextId);
  }
} exports.parseFunctionBodyAndFinish = parseFunctionBodyAndFinish;

 function parseFunctionBody(allowExpression, funcContextId = 0) {
  const isExpression = allowExpression && !_index3.match.call(void 0, _types3.TokenType.braceL);

  if (isExpression) {
    parseMaybeAssign();
  } else {
    _statement.parseBlock.call(void 0, true /* isFunctionScope */, funcContextId);
  }
} exports.parseFunctionBody = parseFunctionBody;

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

function parseExprList(close, allowEmpty = false) {
  let first = true;
  while (!_index3.eat.call(void 0, close) && !_base.state.error) {
    if (first) {
      first = false;
    } else {
      _util.expect.call(void 0, _types3.TokenType.comma);
      if (_index3.eat.call(void 0, close)) break;
    }
    parseExprListItem(allowEmpty);
  }
}

function parseExprListItem(allowEmpty) {
  if (allowEmpty && _index3.match.call(void 0, _types3.TokenType.comma)) {
    // Empty item; nothing more to parse for this item.
  } else if (_index3.match.call(void 0, _types3.TokenType.ellipsis)) {
    _lval.parseSpread.call(void 0, );
    parseParenItem();
  } else if (_index3.match.call(void 0, _types3.TokenType.question)) {
    // Partial function application proposal.
    _index3.next.call(void 0, );
  } else {
    parseMaybeAssign(false, true);
  }
}

// Parse the next token as an identifier.
 function parseIdentifier() {
  _index3.next.call(void 0, );
  _base.state.tokens[_base.state.tokens.length - 1].type = _types3.TokenType.name;
} exports.parseIdentifier = parseIdentifier;

// Parses await expression inside async function.
function parseAwait() {
  parseMaybeUnary();
}

// Parses yield expression inside generator.
function parseYield() {
  _index3.next.call(void 0, );
  if (!_index3.match.call(void 0, _types3.TokenType.semi) && !_util.canInsertSemicolon.call(void 0, )) {
    _index3.eat.call(void 0, _types3.TokenType.star);
    parseMaybeAssign();
  }
}

// https://github.com/tc39/proposal-js-module-blocks
function parseModuleExpression() {
  _util.expectContextual.call(void 0, _keywords.ContextualKeyword._module);
  _util.expect.call(void 0, _types3.TokenType.braceL);
  // For now, just call parseBlockBody to parse the block. In the future when we
  // implement full support, we'll want to emit scopes and possibly other
  // information.
  _statement.parseBlockBody.call(void 0, _types3.TokenType.braceR);
}
