/* eslint max-len: 0 */

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

import {
  flowParseArrow,
  flowParseFunctionBodyAndFinish,
  flowParseMaybeAssign,
  flowParseSubscript,
  flowParseSubscripts,
  flowParseVariance,
  flowStartParseAsyncArrowFromCallExpression,
  flowStartParseNewArguments,
  flowStartParseObjPropValue,
} from "../plugins/flow";
import {jsxParseElement} from "../plugins/jsx/index";
import {typedParseConditional, typedParseParenItem} from "../plugins/types";
import {
  tsParseArrow,
  tsParseFunctionBodyAndFinish,
  tsParseMaybeAssign,
  tsParseSubscript,
  tsParseType,
  tsParseTypeAssertion,
  tsStartParseAsyncArrowFromCallExpression,
  tsStartParseObjPropValue,
} from "../plugins/typescript";
import {
  eat,
  IdentifierRole,
  lookaheadCharCode,
  lookaheadType,
  match,
  next,
  nextTemplateToken,
  popTypeContext,
  pushTypeContext,
  rescan_gt,
  retokenizeSlashAsRegex,
} from "../tokenizer/index";
import {ContextualKeyword} from "../tokenizer/keywords";
import {Scope} from "../tokenizer/state";
import {TokenType, TokenType as tt} from "../tokenizer/types";
import {charCodes} from "../util/charcodes";
import {IS_IDENTIFIER_START} from "../util/identifier";
import {getNextContextId, isFlowEnabled, isJSXEnabled, isTypeScriptEnabled, state} from "./base";
import {
  markPriorBindingIdentifier,
  parseBindingIdentifier,
  parseMaybeDefault,
  parseRest,
  parseSpread,
} from "./lval";
import {
  parseBlock,
  parseBlockBody,
  parseClass,
  parseDecorators,
  parseFunction,
  parseFunctionParams,
} from "./statement";
import {
  canInsertSemicolon,
  eatContextual,
  expect,
  expectContextual,
  hasFollowingLineBreak,
  hasPrecedingLineBreak,
  isContextual,
  unexpected,
} from "./util";

export class StopState {
  
  constructor(stop) {
    this.stop = stop;
  }
}

// ### Expression parsing

// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function (s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.
export function parseExpression(noIn = false) {
  parseMaybeAssign(noIn);
  if (match(tt.comma)) {
    while (eat(tt.comma)) {
      parseMaybeAssign(noIn);
    }
  }
}

/**
 * noIn is used when parsing a for loop so that we don't interpret a following "in" as the binary
 * operatior.
 * isWithinParens is used to indicate that we're parsing something that might be a comma expression
 * or might be an arrow function or might be a Flow type assertion (which requires explicit parens).
 * In these cases, we should allow : and ?: after the initial "left" part.
 */
export function parseMaybeAssign(noIn = false, isWithinParens = false) {
  if (isTypeScriptEnabled) {
    return tsParseMaybeAssign(noIn, isWithinParens);
  } else if (isFlowEnabled) {
    return flowParseMaybeAssign(noIn, isWithinParens);
  } else {
    return baseParseMaybeAssign(noIn, isWithinParens);
  }
}

// Parse an assignment expression. This includes applications of
// operators like `+=`.
// Returns true if the expression was an arrow function.
export function baseParseMaybeAssign(noIn, isWithinParens) {
  if (match(tt._yield)) {
    parseYield();
    return false;
  }

  if (match(tt.parenL) || match(tt.name) || match(tt._yield)) {
    state.potentialArrowAt = state.start;
  }

  const wasArrow = parseMaybeConditional(noIn);
  if (isWithinParens) {
    parseParenItem();
  }
  if (state.type & TokenType.IS_ASSIGN) {
    next();
    parseMaybeAssign(noIn);
    return false;
  }
  return wasArrow;
}

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
  if (isTypeScriptEnabled || isFlowEnabled) {
    typedParseConditional(noIn);
  } else {
    baseParseConditional(noIn);
  }
}

export function baseParseConditional(noIn) {
  if (eat(tt.question)) {
    parseMaybeAssign();
    expect(tt.colon);
    parseMaybeAssign(noIn);
  }
}

// Start the precedence parser.
// Returns true if this was an arrow function
function parseExprOps(noIn) {
  const startTokenIndex = state.tokens.length;
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
    isTypeScriptEnabled &&
    (tt._in & TokenType.PRECEDENCE_MASK) > minPrec &&
    !hasPrecedingLineBreak() &&
    (eatContextual(ContextualKeyword._as) || eatContextual(ContextualKeyword._satisfies))
  ) {
    const oldIsType = pushTypeContext(1);
    tsParseType();
    popTypeContext(oldIsType);
    rescan_gt();
    parseExprOp(startTokenIndex, minPrec, noIn);
    return;
  }

  const prec = state.type & TokenType.PRECEDENCE_MASK;
  if (prec > 0 && (!noIn || !match(tt._in))) {
    if (prec > minPrec) {
      const op = state.type;
      next();
      if (op === tt.nullishCoalescing) {
        state.tokens[state.tokens.length - 1].nullishStartIndex = startTokenIndex;
      }

      const rhsStartTokenIndex = state.tokens.length;
      parseMaybeUnary();
      // Extend the right operand of this operator if possible.
      parseExprOp(rhsStartTokenIndex, op & TokenType.IS_RIGHT_ASSOCIATIVE ? prec - 1 : prec, noIn);
      if (op === tt.nullishCoalescing) {
        state.tokens[startTokenIndex].numNullishCoalesceStarts++;
        state.tokens[state.tokens.length - 1].numNullishCoalesceEnds++;
      }
      // Continue with any future operator holding this expression as the left operand.
      parseExprOp(startTokenIndex, minPrec, noIn);
    }
  }
}

// Parse unary operators, both prefix and postfix.
// Returns true if this was an arrow function.
export function parseMaybeUnary() {
  if (isTypeScriptEnabled && !isJSXEnabled && eat(tt.lessThan)) {
    tsParseTypeAssertion();
    return false;
  }
  if (
    isContextual(ContextualKeyword._module) &&
    lookaheadCharCode() === charCodes.leftCurlyBrace &&
    !hasFollowingLineBreak()
  ) {
    parseModuleExpression();
    return false;
  }
  if (state.type & TokenType.IS_PREFIX) {
    next();
    parseMaybeUnary();
    return false;
  }

  const wasArrow = parseExprSubscripts();
  if (wasArrow) {
    return true;
  }
  while (state.type & TokenType.IS_POSTFIX && !canInsertSemicolon()) {
    // The tokenizer calls everything a preincrement, so make it a postincrement when
    // we see it in that context.
    if (state.type === tt.preIncDec) {
      state.type = tt.postIncDec;
    }
    next();
  }
  return false;
}

// Parse call, dot, and `[]`-subscript expressions.
// Returns true if this was an arrow function.
export function parseExprSubscripts() {
  const startTokenIndex = state.tokens.length;
  const wasArrow = parseExprAtom();
  if (wasArrow) {
    return true;
  }
  parseSubscripts(startTokenIndex);
  // If there was any optional chain operation, the start token would be marked
  // as such, so also mark the end now.
  if (state.tokens.length > startTokenIndex && state.tokens[startTokenIndex].isOptionalChainStart) {
    state.tokens[state.tokens.length - 1].isOptionalChainEnd = true;
  }
  return false;
}

function parseSubscripts(startTokenIndex, noCalls = false) {
  if (isFlowEnabled) {
    flowParseSubscripts(startTokenIndex, noCalls);
  } else {
    baseParseSubscripts(startTokenIndex, noCalls);
  }
}

export function baseParseSubscripts(startTokenIndex, noCalls = false) {
  const stopState = new StopState(false);
  do {
    parseSubscript(startTokenIndex, noCalls, stopState);
  } while (!stopState.stop && !state.error);
}

function parseSubscript(startTokenIndex, noCalls, stopState) {
  if (isTypeScriptEnabled) {
    tsParseSubscript(startTokenIndex, noCalls, stopState);
  } else if (isFlowEnabled) {
    flowParseSubscript(startTokenIndex, noCalls, stopState);
  } else {
    baseParseSubscript(startTokenIndex, noCalls, stopState);
  }
}

/** Set 'state.stop = true' to indicate that we should stop parsing subscripts. */
export function baseParseSubscript(
  startTokenIndex,
  noCalls,
  stopState,
) {
  if (!noCalls && eat(tt.doubleColon)) {
    parseNoCallExpr();
    stopState.stop = true;
    // Propagate startTokenIndex so that `a::b?.()` will keep `a` as the first token. We may want
    // to revisit this in the future when fully supporting bind syntax.
    parseSubscripts(startTokenIndex, noCalls);
  } else if (match(tt.questionDot)) {
    state.tokens[startTokenIndex].isOptionalChainStart = true;
    if (noCalls && lookaheadType() === tt.parenL) {
      stopState.stop = true;
      return;
    }
    next();
    state.tokens[state.tokens.length - 1].subscriptStartIndex = startTokenIndex;

    if (eat(tt.bracketL)) {
      parseExpression();
      expect(tt.bracketR);
    } else if (eat(tt.parenL)) {
      parseCallExpressionArguments();
    } else {
      parseMaybePrivateName();
    }
  } else if (eat(tt.dot)) {
    state.tokens[state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
    parseMaybePrivateName();
  } else if (eat(tt.bracketL)) {
    state.tokens[state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
    parseExpression();
    expect(tt.bracketR);
  } else if (!noCalls && match(tt.parenL)) {
    if (atPossibleAsync()) {
      // We see "async", but it's possible it's a usage of the name "async". Parse as if it's a
      // function call, and if we see an arrow later, backtrack and re-parse as a parameter list.
      const snapshot = state.snapshot();
      const asyncStartTokenIndex = state.tokens.length;
      next();
      state.tokens[state.tokens.length - 1].subscriptStartIndex = startTokenIndex;

      const callContextId = getNextContextId();

      state.tokens[state.tokens.length - 1].contextId = callContextId;
      parseCallExpressionArguments();
      state.tokens[state.tokens.length - 1].contextId = callContextId;

      if (shouldParseAsyncArrow()) {
        // We hit an arrow, so backtrack and start again parsing function parameters.
        state.restoreFromSnapshot(snapshot);
        stopState.stop = true;
        state.scopeDepth++;

        parseFunctionParams();
        parseAsyncArrowFromCallExpression(asyncStartTokenIndex);
      }
    } else {
      next();
      state.tokens[state.tokens.length - 1].subscriptStartIndex = startTokenIndex;
      const callContextId = getNextContextId();
      state.tokens[state.tokens.length - 1].contextId = callContextId;
      parseCallExpressionArguments();
      state.tokens[state.tokens.length - 1].contextId = callContextId;
    }
  } else if (match(tt.backQuote)) {
    // Tagged template expression.
    parseTemplate();
  } else {
    stopState.stop = true;
  }
}

export function atPossibleAsync() {
  // This was made less strict than the original version to avoid passing around nodes, but it
  // should be safe to have rare false positives here.
  return (
    state.tokens[state.tokens.length - 1].contextualKeyword === ContextualKeyword._async &&
    !canInsertSemicolon()
  );
}

export function parseCallExpressionArguments() {
  let first = true;
  while (!eat(tt.parenR) && !state.error) {
    if (first) {
      first = false;
    } else {
      expect(tt.comma);
      if (eat(tt.parenR)) {
        break;
      }
    }

    parseExprListItem(false);
  }
}

function shouldParseAsyncArrow() {
  return match(tt.colon) || match(tt.arrow);
}

function parseAsyncArrowFromCallExpression(startTokenIndex) {
  if (isTypeScriptEnabled) {
    tsStartParseAsyncArrowFromCallExpression();
  } else if (isFlowEnabled) {
    flowStartParseAsyncArrowFromCallExpression();
  }
  expect(tt.arrow);
  parseArrowExpression(startTokenIndex);
}

// Parse a no-call expression (like argument of `new` or `::` operators).

function parseNoCallExpr() {
  const startTokenIndex = state.tokens.length;
  parseExprAtom();
  parseSubscripts(startTokenIndex, true);
}

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.
// Returns true if the parsed expression was an arrow function.
export function parseExprAtom() {
  if (eat(tt.modulo)) {
    // V8 intrinsic expression. Just parse the identifier, and the function invocation is parsed
    // naturally.
    parseIdentifier();
    return false;
  }

  if (match(tt.jsxText) || match(tt.jsxEmptyText)) {
    parseLiteral();
    return false;
  } else if (match(tt.lessThan) && isJSXEnabled) {
    state.type = tt.jsxTagStart;
    jsxParseElement();
    next();
    return false;
  }

  const canBeArrow = state.potentialArrowAt === state.start;
  switch (state.type) {
    case tt.slash:
    case tt.assign:
      retokenizeSlashAsRegex();
    // Fall through.

    case tt._super:
    case tt._this:
    case tt.regexp:
    case tt.num:
    case tt.bigint:
    case tt.decimal:
    case tt.string:
    case tt._null:
    case tt._true:
    case tt._false:
      next();
      return false;

    case tt._import:
      next();
      if (match(tt.dot)) {
        // import.meta
        state.tokens[state.tokens.length - 1].type = tt.name;
        next();
        parseIdentifier();
      }
      return false;

    case tt.name: {
      const startTokenIndex = state.tokens.length;
      const functionStart = state.start;
      const contextualKeyword = state.contextualKeyword;
      parseIdentifier();
      if (contextualKeyword === ContextualKeyword._await) {
        parseAwait();
        return false;
      } else if (
        contextualKeyword === ContextualKeyword._async &&
        match(tt._function) &&
        !canInsertSemicolon()
      ) {
        next();
        parseFunction(functionStart, false);
        return false;
      } else if (
        canBeArrow &&
        contextualKeyword === ContextualKeyword._async &&
        !canInsertSemicolon() &&
        match(tt.name)
      ) {
        state.scopeDepth++;
        parseBindingIdentifier(false);
        expect(tt.arrow);
        // let foo = async bar => {};
        parseArrowExpression(startTokenIndex);
        return true;
      } else if (match(tt._do) && !canInsertSemicolon()) {
        next();
        parseBlock();
        return false;
      }

      if (canBeArrow && !canInsertSemicolon() && match(tt.arrow)) {
        state.scopeDepth++;
        markPriorBindingIdentifier(false);
        expect(tt.arrow);
        parseArrowExpression(startTokenIndex);
        return true;
      }

      state.tokens[state.tokens.length - 1].identifierRole = IdentifierRole.Access;
      return false;
    }

    case tt._do: {
      next();
      parseBlock();
      return false;
    }

    case tt.parenL: {
      const wasArrow = parseParenAndDistinguishExpression(canBeArrow);
      return wasArrow;
    }

    case tt.bracketL:
      next();
      parseExprList(tt.bracketR, true);
      return false;

    case tt.braceL:
      parseObj(false, false);
      return false;

    case tt._function:
      parseFunctionExpression();
      return false;

    case tt.at:
      parseDecorators();
    // Fall through.

    case tt._class:
      parseClass(false);
      return false;

    case tt._new:
      parseNew();
      return false;

    case tt.backQuote:
      parseTemplate();
      return false;

    case tt.doubleColon: {
      next();
      parseNoCallExpr();
      return false;
    }

    case tt.hash: {
      const code = lookaheadCharCode();
      if (IS_IDENTIFIER_START[code] || code === charCodes.backslash) {
        parseMaybePrivateName();
      } else {
        next();
      }
      // Smart pipeline topic reference.
      return false;
    }

    default:
      unexpected();
      return false;
  }
}

function parseMaybePrivateName() {
  eat(tt.hash);
  parseIdentifier();
}

function parseFunctionExpression() {
  const functionStart = state.start;
  parseIdentifier();
  if (eat(tt.dot)) {
    // function.sent
    parseIdentifier();
  }
  parseFunction(functionStart, false);
}

export function parseLiteral() {
  next();
}

export function parseParenExpression() {
  expect(tt.parenL);
  parseExpression();
  expect(tt.parenR);
}

// Returns true if this was an arrow expression.
function parseParenAndDistinguishExpression(canBeArrow) {
  // Assume this is a normal parenthesized expression, but if we see an arrow, we'll bail and
  // start over as a parameter list.
  const snapshot = state.snapshot();

  const startTokenIndex = state.tokens.length;
  expect(tt.parenL);

  let first = true;

  while (!match(tt.parenR) && !state.error) {
    if (first) {
      first = false;
    } else {
      expect(tt.comma);
      if (match(tt.parenR)) {
        break;
      }
    }

    if (match(tt.ellipsis)) {
      parseRest(false /* isBlockScope */);
      parseParenItem();
      break;
    } else {
      parseMaybeAssign(false, true);
    }
  }

  expect(tt.parenR);

  if (canBeArrow && shouldParseArrow()) {
    const wasArrow = parseArrow();
    if (wasArrow) {
      // It was an arrow function this whole time, so start over and parse it as params so that we
      // get proper token annotations.
      state.restoreFromSnapshot(snapshot);
      state.scopeDepth++;
      // Don't specify a context ID because arrow functions don't need a context ID.
      parseFunctionParams();
      parseArrow();
      parseArrowExpression(startTokenIndex);
      if (state.error) {
        // Nevermind! This must have been something that looks very much like an
        // arrow function but where its "parameter list" isn't actually a valid
        // parameter list. Force non-arrow parsing.
        // See https://github.com/alangpierce/sucrase/issues/666 for an example.
        state.restoreFromSnapshot(snapshot);
        parseParenAndDistinguishExpression(false);
        return false;
      }
      return true;
    }
  }

  return false;
}

function shouldParseArrow() {
  return match(tt.colon) || !canInsertSemicolon();
}

// Returns whether there was an arrow token.
export function parseArrow() {
  if (isTypeScriptEnabled) {
    return tsParseArrow();
  } else if (isFlowEnabled) {
    return flowParseArrow();
  } else {
    return eat(tt.arrow);
  }
}

function parseParenItem() {
  if (isTypeScriptEnabled || isFlowEnabled) {
    typedParseParenItem();
  }
}

// New's precedence is slightly tricky. It must allow its argument to
// be a `[]` or dot subscript expression, but not a call — at least,
// not without wrapping it in parentheses. Thus, it uses the noCalls
// argument to parseSubscripts to prevent it from consuming the
// argument list.
function parseNew() {
  expect(tt._new);
  if (eat(tt.dot)) {
    // new.target
    parseIdentifier();
    return;
  }
  parseNewCallee();
  if (isFlowEnabled) {
    flowStartParseNewArguments();
  }
  if (eat(tt.parenL)) {
    parseExprList(tt.parenR);
  }
}

function parseNewCallee() {
  parseNoCallExpr();
  eat(tt.questionDot);
}

export function parseTemplate() {
  // Finish `, read quasi
  nextTemplateToken();
  // Finish quasi, read ${
  nextTemplateToken();
  while (!match(tt.backQuote) && !state.error) {
    expect(tt.dollarBraceL);
    parseExpression();
    // Finish }, read quasi
    nextTemplateToken();
    // Finish quasi, read either ${ or `
    nextTemplateToken();
  }
  next();
}

// Parse an object literal or binding pattern.
export function parseObj(isPattern, isBlockScope) {
  // Attach a context ID to the object open and close brace and each object key.
  const contextId = getNextContextId();
  let first = true;

  next();
  state.tokens[state.tokens.length - 1].contextId = contextId;

  while (!eat(tt.braceR) && !state.error) {
    if (first) {
      first = false;
    } else {
      expect(tt.comma);
      if (eat(tt.braceR)) {
        break;
      }
    }

    let isGenerator = false;
    if (match(tt.ellipsis)) {
      const previousIndex = state.tokens.length;
      parseSpread();
      if (isPattern) {
        // Mark role when the only thing being spread over is an identifier.
        if (state.tokens.length === previousIndex + 2) {
          markPriorBindingIdentifier(isBlockScope);
        }
        if (eat(tt.braceR)) {
          break;
        }
      }
      continue;
    }

    if (!isPattern) {
      isGenerator = eat(tt.star);
    }

    if (!isPattern && isContextual(ContextualKeyword._async)) {
      if (isGenerator) unexpected();

      parseIdentifier();
      if (
        match(tt.colon) ||
        match(tt.parenL) ||
        match(tt.braceR) ||
        match(tt.eq) ||
        match(tt.comma)
      ) {
        // This is a key called "async" rather than an async function.
      } else {
        if (match(tt.star)) {
          next();
          isGenerator = true;
        }
        parsePropertyName(contextId);
      }
    } else {
      parsePropertyName(contextId);
    }

    parseObjPropValue(isPattern, isBlockScope, contextId);
  }

  state.tokens[state.tokens.length - 1].contextId = contextId;
}

function isGetterOrSetterMethod(isPattern) {
  // We go off of the next and don't bother checking if the node key is actually "get" or "set".
  // This lets us avoid generating a node, and should only make the validation worse.
  return (
    !isPattern &&
    (match(tt.string) || // get "string"() {}
      match(tt.num) || // get 1() {}
      match(tt.bracketL) || // get ["string"]() {}
      match(tt.name) || // get foo() {}
      !!(state.type & TokenType.IS_KEYWORD)) // get debugger() {}
  );
}

// Returns true if this was a method.
function parseObjectMethod(isPattern, objectContextId) {
  // We don't need to worry about modifiers because object methods can't have optional bodies, so
  // the start will never be used.
  const functionStart = state.start;
  if (match(tt.parenL)) {
    if (isPattern) unexpected();
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
  if (eat(tt.colon)) {
    if (isPattern) {
      parseMaybeDefault(isBlockScope);
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
    if (state.scopeDepth === 0) {
      identifierRole = IdentifierRole.ObjectShorthandTopLevelDeclaration;
    } else if (isBlockScope) {
      identifierRole = IdentifierRole.ObjectShorthandBlockScopedDeclaration;
    } else {
      identifierRole = IdentifierRole.ObjectShorthandFunctionScopedDeclaration;
    }
  } else {
    identifierRole = IdentifierRole.ObjectShorthand;
  }
  state.tokens[state.tokens.length - 1].identifierRole = identifierRole;

  // Regardless of whether we know this to be a pattern or if we're in an ambiguous context, allow
  // parsing as if there's a default value.
  parseMaybeDefault(isBlockScope, true);
}

function parseObjPropValue(
  isPattern,
  isBlockScope,
  objectContextId,
) {
  if (isTypeScriptEnabled) {
    tsStartParseObjPropValue();
  } else if (isFlowEnabled) {
    flowStartParseObjPropValue();
  }
  const wasMethod = parseObjectMethod(isPattern, objectContextId);
  if (!wasMethod) {
    parseObjectProperty(isPattern, isBlockScope);
  }
}

export function parsePropertyName(objectContextId) {
  if (isFlowEnabled) {
    flowParseVariance();
  }
  if (eat(tt.bracketL)) {
    state.tokens[state.tokens.length - 1].contextId = objectContextId;
    parseMaybeAssign();
    expect(tt.bracketR);
    state.tokens[state.tokens.length - 1].contextId = objectContextId;
  } else {
    if (match(tt.num) || match(tt.string) || match(tt.bigint) || match(tt.decimal)) {
      parseExprAtom();
    } else {
      parseMaybePrivateName();
    }

    state.tokens[state.tokens.length - 1].identifierRole = IdentifierRole.ObjectKey;
    state.tokens[state.tokens.length - 1].contextId = objectContextId;
  }
}

// Parse object or class method.
export function parseMethod(functionStart, isConstructor) {
  const funcContextId = getNextContextId();

  state.scopeDepth++;
  const startTokenIndex = state.tokens.length;
  const allowModifiers = isConstructor; // For TypeScript parameter properties
  parseFunctionParams(allowModifiers, funcContextId);
  parseFunctionBodyAndFinish(functionStart, funcContextId);
  const endTokenIndex = state.tokens.length;
  state.scopes.push(new Scope(startTokenIndex, endTokenIndex, true));
  state.scopeDepth--;
}

// Parse arrow function expression.
// If the parameters are provided, they will be converted to an
// assignable list.
export function parseArrowExpression(startTokenIndex) {
  parseFunctionBody(true);
  const endTokenIndex = state.tokens.length;
  state.scopes.push(new Scope(startTokenIndex, endTokenIndex, true));
  state.scopeDepth--;
}

export function parseFunctionBodyAndFinish(functionStart, funcContextId = 0) {
  if (isTypeScriptEnabled) {
    tsParseFunctionBodyAndFinish(functionStart, funcContextId);
  } else if (isFlowEnabled) {
    flowParseFunctionBodyAndFinish(funcContextId);
  } else {
    parseFunctionBody(false, funcContextId);
  }
}

export function parseFunctionBody(allowExpression, funcContextId = 0) {
  const isExpression = allowExpression && !match(tt.braceL);

  if (isExpression) {
    parseMaybeAssign();
  } else {
    parseBlock(true /* isFunctionScope */, funcContextId);
  }
}

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

function parseExprList(close, allowEmpty = false) {
  let first = true;
  while (!eat(close) && !state.error) {
    if (first) {
      first = false;
    } else {
      expect(tt.comma);
      if (eat(close)) break;
    }
    parseExprListItem(allowEmpty);
  }
}

function parseExprListItem(allowEmpty) {
  if (allowEmpty && match(tt.comma)) {
    // Empty item; nothing more to parse for this item.
  } else if (match(tt.ellipsis)) {
    parseSpread();
    parseParenItem();
  } else if (match(tt.question)) {
    // Partial function application proposal.
    next();
  } else {
    parseMaybeAssign(false, true);
  }
}

// Parse the next token as an identifier.
export function parseIdentifier() {
  next();
  state.tokens[state.tokens.length - 1].type = tt.name;
}

// Parses await expression inside async function.
function parseAwait() {
  parseMaybeUnary();
}

// Parses yield expression inside generator.
function parseYield() {
  next();
  if (!match(tt.semi) && !canInsertSemicolon()) {
    eat(tt.star);
    parseMaybeAssign();
  }
}

// https://github.com/tc39/proposal-js-module-blocks
function parseModuleExpression() {
  expectContextual(ContextualKeyword._module);
  expect(tt.braceL);
  // For now, just call parseBlockBody to parse the block. In the future when we
  // implement full support, we'll want to emit scopes and possibly other
  // information.
  parseBlockBody(tt.braceR);
}
