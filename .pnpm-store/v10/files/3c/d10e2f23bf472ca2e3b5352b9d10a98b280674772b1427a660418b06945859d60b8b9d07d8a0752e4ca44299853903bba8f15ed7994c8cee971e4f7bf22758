/* eslint max-len: 0 */

import {input, isFlowEnabled, state} from "../traverser/base";
import {unexpected} from "../traverser/util";
import {charCodes} from "../util/charcodes";
import {IS_IDENTIFIER_CHAR, IS_IDENTIFIER_START} from "../util/identifier";
import {IS_WHITESPACE, skipWhiteSpace} from "../util/whitespace";
import {ContextualKeyword} from "./keywords";
import readWord from "./readWord";
import { TokenType as tt} from "./types";

export var IdentifierRole; (function (IdentifierRole) {
  const Access = 0; IdentifierRole[IdentifierRole["Access"] = Access] = "Access";
  const ExportAccess = Access + 1; IdentifierRole[IdentifierRole["ExportAccess"] = ExportAccess] = "ExportAccess";
  const TopLevelDeclaration = ExportAccess + 1; IdentifierRole[IdentifierRole["TopLevelDeclaration"] = TopLevelDeclaration] = "TopLevelDeclaration";
  const FunctionScopedDeclaration = TopLevelDeclaration + 1; IdentifierRole[IdentifierRole["FunctionScopedDeclaration"] = FunctionScopedDeclaration] = "FunctionScopedDeclaration";
  const BlockScopedDeclaration = FunctionScopedDeclaration + 1; IdentifierRole[IdentifierRole["BlockScopedDeclaration"] = BlockScopedDeclaration] = "BlockScopedDeclaration";
  const ObjectShorthandTopLevelDeclaration = BlockScopedDeclaration + 1; IdentifierRole[IdentifierRole["ObjectShorthandTopLevelDeclaration"] = ObjectShorthandTopLevelDeclaration] = "ObjectShorthandTopLevelDeclaration";
  const ObjectShorthandFunctionScopedDeclaration = ObjectShorthandTopLevelDeclaration + 1; IdentifierRole[IdentifierRole["ObjectShorthandFunctionScopedDeclaration"] = ObjectShorthandFunctionScopedDeclaration] = "ObjectShorthandFunctionScopedDeclaration";
  const ObjectShorthandBlockScopedDeclaration = ObjectShorthandFunctionScopedDeclaration + 1; IdentifierRole[IdentifierRole["ObjectShorthandBlockScopedDeclaration"] = ObjectShorthandBlockScopedDeclaration] = "ObjectShorthandBlockScopedDeclaration";
  const ObjectShorthand = ObjectShorthandBlockScopedDeclaration + 1; IdentifierRole[IdentifierRole["ObjectShorthand"] = ObjectShorthand] = "ObjectShorthand";
  // Any identifier bound in an import statement, e.g. both A and b from
  // `import A, * as b from 'A';`
  const ImportDeclaration = ObjectShorthand + 1; IdentifierRole[IdentifierRole["ImportDeclaration"] = ImportDeclaration] = "ImportDeclaration";
  const ObjectKey = ImportDeclaration + 1; IdentifierRole[IdentifierRole["ObjectKey"] = ObjectKey] = "ObjectKey";
  // The `foo` in `import {foo as bar} from "./abc";`.
  const ImportAccess = ObjectKey + 1; IdentifierRole[IdentifierRole["ImportAccess"] = ImportAccess] = "ImportAccess";
})(IdentifierRole || (IdentifierRole = {}));

/**
 * Extra information on jsxTagStart tokens, used to determine which of the three
 * jsx functions are called in the automatic transform.
 */
export var JSXRole; (function (JSXRole) {
  // The element is self-closing or has a body that resolves to empty. We
  // shouldn't emit children at all in this case.
  const NoChildren = 0; JSXRole[JSXRole["NoChildren"] = NoChildren] = "NoChildren";
  // The element has a single explicit child, which might still be an arbitrary
  // expression like an array. We should emit that expression as the children.
  const OneChild = NoChildren + 1; JSXRole[JSXRole["OneChild"] = OneChild] = "OneChild";
  // The element has at least two explicitly-specified children or has spread
  // children, so child positions are assumed to be "static". We should wrap
  // these children in an array.
  const StaticChildren = OneChild + 1; JSXRole[JSXRole["StaticChildren"] = StaticChildren] = "StaticChildren";
  // The element has a prop named "key" after a prop spread, so we should fall
  // back to the createElement function.
  const KeyAfterPropSpread = StaticChildren + 1; JSXRole[JSXRole["KeyAfterPropSpread"] = KeyAfterPropSpread] = "KeyAfterPropSpread";
})(JSXRole || (JSXRole = {}));

export function isDeclaration(token) {
  const role = token.identifierRole;
  return (
    role === IdentifierRole.TopLevelDeclaration ||
    role === IdentifierRole.FunctionScopedDeclaration ||
    role === IdentifierRole.BlockScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandTopLevelDeclaration ||
    role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandBlockScopedDeclaration
  );
}

export function isNonTopLevelDeclaration(token) {
  const role = token.identifierRole;
  return (
    role === IdentifierRole.FunctionScopedDeclaration ||
    role === IdentifierRole.BlockScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandBlockScopedDeclaration
  );
}

export function isTopLevelDeclaration(token) {
  const role = token.identifierRole;
  return (
    role === IdentifierRole.TopLevelDeclaration ||
    role === IdentifierRole.ObjectShorthandTopLevelDeclaration ||
    role === IdentifierRole.ImportDeclaration
  );
}

export function isBlockScopedDeclaration(token) {
  const role = token.identifierRole;
  // Treat top-level declarations as block scope since the distinction doesn't matter here.
  return (
    role === IdentifierRole.TopLevelDeclaration ||
    role === IdentifierRole.BlockScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandTopLevelDeclaration ||
    role === IdentifierRole.ObjectShorthandBlockScopedDeclaration
  );
}

export function isFunctionScopedDeclaration(token) {
  const role = token.identifierRole;
  return (
    role === IdentifierRole.FunctionScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration
  );
}

export function isObjectShorthandDeclaration(token) {
  return (
    token.identifierRole === IdentifierRole.ObjectShorthandTopLevelDeclaration ||
    token.identifierRole === IdentifierRole.ObjectShorthandBlockScopedDeclaration ||
    token.identifierRole === IdentifierRole.ObjectShorthandFunctionScopedDeclaration
  );
}

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.
export class Token {
  constructor() {
    this.type = state.type;
    this.contextualKeyword = state.contextualKeyword;
    this.start = state.start;
    this.end = state.end;
    this.scopeDepth = state.scopeDepth;
    this.isType = state.isType;
    this.identifierRole = null;
    this.jsxRole = null;
    this.shadowsGlobal = false;
    this.isAsyncOperation = false;
    this.contextId = null;
    this.rhsEndIndex = null;
    this.isExpression = false;
    this.numNullishCoalesceStarts = 0;
    this.numNullishCoalesceEnds = 0;
    this.isOptionalChainStart = false;
    this.isOptionalChainEnd = false;
    this.subscriptStartIndex = null;
    this.nullishStartIndex = null;
  }

  
  
  
  
  
  
  
  
  // Initially false for all tokens, then may be computed in a follow-up step that does scope
  // analysis.
  
  // Initially false for all tokens, but may be set during transform to mark it as containing an
  // await operation.
  
  
  // For assignments, the index of the RHS. For export tokens, the end of the export.
  
  // For class tokens, records if the class is a class expression or a class statement.
  
  // Number of times to insert a `nullishCoalesce(` snippet before this token.
  
  // Number of times to insert a `)` snippet after this token.
  
  // If true, insert an `optionalChain([` snippet before this token.
  
  // If true, insert a `])` snippet after this token.
  
  // Tag for `.`, `?.`, `[`, `?.[`, `(`, and `?.(` to denote the "root" token for this
  // subscript chain. This can be used to determine if this chain is an optional chain.
  
  // Tag for `??` operators to denote the root token for this nullish coalescing call.
  
}

// ## Tokenizer

// Move to the next token
export function next() {
  state.tokens.push(new Token());
  nextToken();
}

// Call instead of next when inside a template, since that needs to be handled differently.
export function nextTemplateToken() {
  state.tokens.push(new Token());
  state.start = state.pos;
  readTmplToken();
}

// The tokenizer never parses regexes by default. Instead, the parser is responsible for
// instructing it to parse a regex when we see a slash at the start of an expression.
export function retokenizeSlashAsRegex() {
  if (state.type === tt.assign) {
    --state.pos;
  }
  readRegexp();
}

export function pushTypeContext(existingTokensInType) {
  for (let i = state.tokens.length - existingTokensInType; i < state.tokens.length; i++) {
    state.tokens[i].isType = true;
  }
  const oldIsType = state.isType;
  state.isType = true;
  return oldIsType;
}

export function popTypeContext(oldIsType) {
  state.isType = oldIsType;
}

export function eat(type) {
  if (match(type)) {
    next();
    return true;
  } else {
    return false;
  }
}

export function eatTypeToken(tokenType) {
  const oldIsType = state.isType;
  state.isType = true;
  eat(tokenType);
  state.isType = oldIsType;
}

export function match(type) {
  return state.type === type;
}

export function lookaheadType() {
  const snapshot = state.snapshot();
  next();
  const type = state.type;
  state.restoreFromSnapshot(snapshot);
  return type;
}

export class TypeAndKeyword {
  
  
  constructor(type, contextualKeyword) {
    this.type = type;
    this.contextualKeyword = contextualKeyword;
  }
}

export function lookaheadTypeAndKeyword() {
  const snapshot = state.snapshot();
  next();
  const type = state.type;
  const contextualKeyword = state.contextualKeyword;
  state.restoreFromSnapshot(snapshot);
  return new TypeAndKeyword(type, contextualKeyword);
}

export function nextTokenStart() {
  return nextTokenStartSince(state.pos);
}

export function nextTokenStartSince(pos) {
  skipWhiteSpace.lastIndex = pos;
  const skip = skipWhiteSpace.exec(input);
  return pos + skip[0].length;
}

export function lookaheadCharCode() {
  return input.charCodeAt(nextTokenStart());
}

// Read a single token, updating the parser object's token-related
// properties.
export function nextToken() {
  skipSpace();
  state.start = state.pos;
  if (state.pos >= input.length) {
    const tokens = state.tokens;
    // We normally run past the end a bit, but if we're way past the end, avoid an infinite loop.
    // Also check the token positions rather than the types since sometimes we rewrite the token
    // type to something else.
    if (
      tokens.length >= 2 &&
      tokens[tokens.length - 1].start >= input.length &&
      tokens[tokens.length - 2].start >= input.length
    ) {
      unexpected("Unexpectedly reached the end of input.");
    }
    finishToken(tt.eof);
    return;
  }
  readToken(input.charCodeAt(state.pos));
}

function readToken(code) {
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (
    IS_IDENTIFIER_START[code] ||
    code === charCodes.backslash ||
    (code === charCodes.atSign && input.charCodeAt(state.pos + 1) === charCodes.atSign)
  ) {
    readWord();
  } else {
    getTokenFromCode(code);
  }
}

function skipBlockComment() {
  while (
    input.charCodeAt(state.pos) !== charCodes.asterisk ||
    input.charCodeAt(state.pos + 1) !== charCodes.slash
  ) {
    state.pos++;
    if (state.pos > input.length) {
      unexpected("Unterminated comment", state.pos - 2);
      return;
    }
  }
  state.pos += 2;
}

export function skipLineComment(startSkip) {
  let ch = input.charCodeAt((state.pos += startSkip));
  if (state.pos < input.length) {
    while (
      ch !== charCodes.lineFeed &&
      ch !== charCodes.carriageReturn &&
      ch !== charCodes.lineSeparator &&
      ch !== charCodes.paragraphSeparator &&
      ++state.pos < input.length
    ) {
      ch = input.charCodeAt(state.pos);
    }
  }
}

// Called at the start of the parse and after every token. Skips
// whitespace and comments.
export function skipSpace() {
  while (state.pos < input.length) {
    const ch = input.charCodeAt(state.pos);
    switch (ch) {
      case charCodes.carriageReturn:
        if (input.charCodeAt(state.pos + 1) === charCodes.lineFeed) {
          ++state.pos;
        }

      case charCodes.lineFeed:
      case charCodes.lineSeparator:
      case charCodes.paragraphSeparator:
        ++state.pos;
        break;

      case charCodes.slash:
        switch (input.charCodeAt(state.pos + 1)) {
          case charCodes.asterisk:
            state.pos += 2;
            skipBlockComment();
            break;

          case charCodes.slash:
            skipLineComment(2);
            break;

          default:
            return;
        }
        break;

      default:
        if (IS_WHITESPACE[ch]) {
          ++state.pos;
        } else {
          return;
        }
    }
  }
}

// Called at the end of every token. Sets various fields, and skips the space after the token, so
// that the next one's `start` will point at the right position.
export function finishToken(
  type,
  contextualKeyword = ContextualKeyword.NONE,
) {
  state.end = state.pos;
  state.type = type;
  state.contextualKeyword = contextualKeyword;
}

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
function readToken_dot() {
  const nextChar = input.charCodeAt(state.pos + 1);
  if (nextChar >= charCodes.digit0 && nextChar <= charCodes.digit9) {
    readNumber(true);
    return;
  }

  if (nextChar === charCodes.dot && input.charCodeAt(state.pos + 2) === charCodes.dot) {
    state.pos += 3;
    finishToken(tt.ellipsis);
  } else {
    ++state.pos;
    finishToken(tt.dot);
  }
}

function readToken_slash() {
  const nextChar = input.charCodeAt(state.pos + 1);
  if (nextChar === charCodes.equalsTo) {
    finishOp(tt.assign, 2);
  } else {
    finishOp(tt.slash, 1);
  }
}

function readToken_mult_modulo(code) {
  // '%*'
  let tokenType = code === charCodes.asterisk ? tt.star : tt.modulo;
  let width = 1;
  let nextChar = input.charCodeAt(state.pos + 1);

  // Exponentiation operator **
  if (code === charCodes.asterisk && nextChar === charCodes.asterisk) {
    width++;
    nextChar = input.charCodeAt(state.pos + 2);
    tokenType = tt.exponent;
  }

  // Match *= or %=, disallowing *=> which can be valid in flow.
  if (
    nextChar === charCodes.equalsTo &&
    input.charCodeAt(state.pos + 2) !== charCodes.greaterThan
  ) {
    width++;
    tokenType = tt.assign;
  }

  finishOp(tokenType, width);
}

function readToken_pipe_amp(code) {
  // '|&'
  const nextChar = input.charCodeAt(state.pos + 1);

  if (nextChar === code) {
    if (input.charCodeAt(state.pos + 2) === charCodes.equalsTo) {
      // ||= or &&=
      finishOp(tt.assign, 3);
    } else {
      // || or &&
      finishOp(code === charCodes.verticalBar ? tt.logicalOR : tt.logicalAND, 2);
    }
    return;
  }

  if (code === charCodes.verticalBar) {
    // '|>'
    if (nextChar === charCodes.greaterThan) {
      finishOp(tt.pipeline, 2);
      return;
    } else if (nextChar === charCodes.rightCurlyBrace && isFlowEnabled) {
      // '|}'
      finishOp(tt.braceBarR, 2);
      return;
    }
  }

  if (nextChar === charCodes.equalsTo) {
    finishOp(tt.assign, 2);
    return;
  }

  finishOp(code === charCodes.verticalBar ? tt.bitwiseOR : tt.bitwiseAND, 1);
}

function readToken_caret() {
  // '^'
  const nextChar = input.charCodeAt(state.pos + 1);
  if (nextChar === charCodes.equalsTo) {
    finishOp(tt.assign, 2);
  } else {
    finishOp(tt.bitwiseXOR, 1);
  }
}

function readToken_plus_min(code) {
  // '+-'
  const nextChar = input.charCodeAt(state.pos + 1);

  if (nextChar === code) {
    // Tentatively call this a prefix operator, but it might be changed to postfix later.
    finishOp(tt.preIncDec, 2);
    return;
  }

  if (nextChar === charCodes.equalsTo) {
    finishOp(tt.assign, 2);
  } else if (code === charCodes.plusSign) {
    finishOp(tt.plus, 1);
  } else {
    finishOp(tt.minus, 1);
  }
}

function readToken_lt() {
  const nextChar = input.charCodeAt(state.pos + 1);

  if (nextChar === charCodes.lessThan) {
    if (input.charCodeAt(state.pos + 2) === charCodes.equalsTo) {
      finishOp(tt.assign, 3);
      return;
    }
    // We see <<, but need to be really careful about whether to treat it as a
    // true left-shift or as two < tokens.
    if (state.isType) {
      // Within a type, << might come up in a snippet like `Array<<T>() => void>`,
      // so treat it as two < tokens. Importantly, this should only override <<
      // rather than other tokens like <= . If we treated <= as < in a type
      // context, then the snippet `a as T <= 1` would incorrectly start parsing
      // a type argument on T. We don't need to worry about `a as T << 1`
      // because TypeScript disallows that syntax.
      finishOp(tt.lessThan, 1);
    } else {
      // Outside a type, this might be a true left-shift operator, or it might
      // still be two open-type-arg tokens, such as in `f<<T>() => void>()`. We
      // look at the token while considering the `f`, so we don't yet know that
      // we're in a type context. In this case, we initially tokenize as a
      // left-shift and correct after-the-fact as necessary in
      // tsParseTypeArgumentsWithPossibleBitshift .
      finishOp(tt.bitShiftL, 2);
    }
    return;
  }

  if (nextChar === charCodes.equalsTo) {
    // <=
    finishOp(tt.relationalOrEqual, 2);
  } else {
    finishOp(tt.lessThan, 1);
  }
}

function readToken_gt() {
  if (state.isType) {
    // Avoid right-shift for things like `Array<Array<string>>` and
    // greater-than-or-equal for things like `const a: Array<number>=[];`.
    finishOp(tt.greaterThan, 1);
    return;
  }

  const nextChar = input.charCodeAt(state.pos + 1);

  if (nextChar === charCodes.greaterThan) {
    const size = input.charCodeAt(state.pos + 2) === charCodes.greaterThan ? 3 : 2;
    if (input.charCodeAt(state.pos + size) === charCodes.equalsTo) {
      finishOp(tt.assign, size + 1);
      return;
    }
    finishOp(tt.bitShiftR, size);
    return;
  }

  if (nextChar === charCodes.equalsTo) {
    // >=
    finishOp(tt.relationalOrEqual, 2);
  } else {
    finishOp(tt.greaterThan, 1);
  }
}

/**
 * Reinterpret a possible > token when transitioning from a type to a non-type
 * context.
 *
 * This comes up in two situations where >= needs to be treated as one token:
 * - After an `as` expression, like in the code `a as T >= 1`.
 * - In a type argument in an expression context, e.g. `f(a < b, c >= d)`, we
 *   need to see the token as >= so that we get an error and backtrack to
 *   normal expression parsing.
 *
 * Other situations require >= to be seen as two tokens, e.g.
 * `const x: Array<T>=[];`, so it's important to treat > as its own token in
 * typical type parsing situations.
 */
export function rescan_gt() {
  if (state.type === tt.greaterThan) {
    state.pos -= 1;
    readToken_gt();
  }
}

function readToken_eq_excl(code) {
  // '=!'
  const nextChar = input.charCodeAt(state.pos + 1);
  if (nextChar === charCodes.equalsTo) {
    finishOp(tt.equality, input.charCodeAt(state.pos + 2) === charCodes.equalsTo ? 3 : 2);
    return;
  }
  if (code === charCodes.equalsTo && nextChar === charCodes.greaterThan) {
    // '=>'
    state.pos += 2;
    finishToken(tt.arrow);
    return;
  }
  finishOp(code === charCodes.equalsTo ? tt.eq : tt.bang, 1);
}

function readToken_question() {
  // '?'
  const nextChar = input.charCodeAt(state.pos + 1);
  const nextChar2 = input.charCodeAt(state.pos + 2);
  if (
    nextChar === charCodes.questionMark &&
    // In Flow (but not TypeScript), ??string is a valid type that should be
    // tokenized as two individual ? tokens.
    !(isFlowEnabled && state.isType)
  ) {
    if (nextChar2 === charCodes.equalsTo) {
      // '??='
      finishOp(tt.assign, 3);
    } else {
      // '??'
      finishOp(tt.nullishCoalescing, 2);
    }
  } else if (
    nextChar === charCodes.dot &&
    !(nextChar2 >= charCodes.digit0 && nextChar2 <= charCodes.digit9)
  ) {
    // '.' not followed by a number
    state.pos += 2;
    finishToken(tt.questionDot);
  } else {
    ++state.pos;
    finishToken(tt.question);
  }
}

export function getTokenFromCode(code) {
  switch (code) {
    case charCodes.numberSign:
      ++state.pos;
      finishToken(tt.hash);
      return;

    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.

    case charCodes.dot:
      readToken_dot();
      return;

    // Punctuation tokens.
    case charCodes.leftParenthesis:
      ++state.pos;
      finishToken(tt.parenL);
      return;
    case charCodes.rightParenthesis:
      ++state.pos;
      finishToken(tt.parenR);
      return;
    case charCodes.semicolon:
      ++state.pos;
      finishToken(tt.semi);
      return;
    case charCodes.comma:
      ++state.pos;
      finishToken(tt.comma);
      return;
    case charCodes.leftSquareBracket:
      ++state.pos;
      finishToken(tt.bracketL);
      return;
    case charCodes.rightSquareBracket:
      ++state.pos;
      finishToken(tt.bracketR);
      return;

    case charCodes.leftCurlyBrace:
      if (isFlowEnabled && input.charCodeAt(state.pos + 1) === charCodes.verticalBar) {
        finishOp(tt.braceBarL, 2);
      } else {
        ++state.pos;
        finishToken(tt.braceL);
      }
      return;

    case charCodes.rightCurlyBrace:
      ++state.pos;
      finishToken(tt.braceR);
      return;

    case charCodes.colon:
      if (input.charCodeAt(state.pos + 1) === charCodes.colon) {
        finishOp(tt.doubleColon, 2);
      } else {
        ++state.pos;
        finishToken(tt.colon);
      }
      return;

    case charCodes.questionMark:
      readToken_question();
      return;
    case charCodes.atSign:
      ++state.pos;
      finishToken(tt.at);
      return;

    case charCodes.graveAccent:
      ++state.pos;
      finishToken(tt.backQuote);
      return;

    case charCodes.digit0: {
      const nextChar = input.charCodeAt(state.pos + 1);
      // '0x', '0X', '0o', '0O', '0b', '0B'
      if (
        nextChar === charCodes.lowercaseX ||
        nextChar === charCodes.uppercaseX ||
        nextChar === charCodes.lowercaseO ||
        nextChar === charCodes.uppercaseO ||
        nextChar === charCodes.lowercaseB ||
        nextChar === charCodes.uppercaseB
      ) {
        readRadixNumber();
        return;
      }
    }
    // Anything else beginning with a digit is an integer, octal
    // number, or float.
    case charCodes.digit1:
    case charCodes.digit2:
    case charCodes.digit3:
    case charCodes.digit4:
    case charCodes.digit5:
    case charCodes.digit6:
    case charCodes.digit7:
    case charCodes.digit8:
    case charCodes.digit9:
      readNumber(false);
      return;

    // Quotes produce strings.
    case charCodes.quotationMark:
    case charCodes.apostrophe:
      readString(code);
      return;

    // Operators are parsed inline in tiny state machines. '=' (charCodes.equalsTo) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

    case charCodes.slash:
      readToken_slash();
      return;

    case charCodes.percentSign:
    case charCodes.asterisk:
      readToken_mult_modulo(code);
      return;

    case charCodes.verticalBar:
    case charCodes.ampersand:
      readToken_pipe_amp(code);
      return;

    case charCodes.caret:
      readToken_caret();
      return;

    case charCodes.plusSign:
    case charCodes.dash:
      readToken_plus_min(code);
      return;

    case charCodes.lessThan:
      readToken_lt();
      return;

    case charCodes.greaterThan:
      readToken_gt();
      return;

    case charCodes.equalsTo:
    case charCodes.exclamationMark:
      readToken_eq_excl(code);
      return;

    case charCodes.tilde:
      finishOp(tt.tilde, 1);
      return;

    default:
      break;
  }

  unexpected(`Unexpected character '${String.fromCharCode(code)}'`, state.pos);
}

function finishOp(type, size) {
  state.pos += size;
  finishToken(type);
}

function readRegexp() {
  const start = state.pos;
  let escaped = false;
  let inClass = false;
  for (;;) {
    if (state.pos >= input.length) {
      unexpected("Unterminated regular expression", start);
      return;
    }
    const code = input.charCodeAt(state.pos);
    if (escaped) {
      escaped = false;
    } else {
      if (code === charCodes.leftSquareBracket) {
        inClass = true;
      } else if (code === charCodes.rightSquareBracket && inClass) {
        inClass = false;
      } else if (code === charCodes.slash && !inClass) {
        break;
      }
      escaped = code === charCodes.backslash;
    }
    ++state.pos;
  }
  ++state.pos;
  // Need to use `skipWord` because '\uXXXX' sequences are allowed here (don't ask).
  skipWord();

  finishToken(tt.regexp);
}

/**
 * Read a decimal integer. Note that this can't be unified with the similar code
 * in readRadixNumber (which also handles hex digits) because "e" needs to be
 * the end of the integer so that we can properly handle scientific notation.
 */
function readInt() {
  while (true) {
    const code = input.charCodeAt(state.pos);
    if ((code >= charCodes.digit0 && code <= charCodes.digit9) || code === charCodes.underscore) {
      state.pos++;
    } else {
      break;
    }
  }
}

function readRadixNumber() {
  state.pos += 2; // 0x

  // Walk to the end of the number, allowing hex digits.
  while (true) {
    const code = input.charCodeAt(state.pos);
    if (
      (code >= charCodes.digit0 && code <= charCodes.digit9) ||
      (code >= charCodes.lowercaseA && code <= charCodes.lowercaseF) ||
      (code >= charCodes.uppercaseA && code <= charCodes.uppercaseF) ||
      code === charCodes.underscore
    ) {
      state.pos++;
    } else {
      break;
    }
  }

  const nextChar = input.charCodeAt(state.pos);
  if (nextChar === charCodes.lowercaseN) {
    ++state.pos;
    finishToken(tt.bigint);
  } else {
    finishToken(tt.num);
  }
}

// Read an integer, octal integer, or floating-point number.
function readNumber(startsWithDot) {
  let isBigInt = false;
  let isDecimal = false;

  if (!startsWithDot) {
    readInt();
  }

  let nextChar = input.charCodeAt(state.pos);
  if (nextChar === charCodes.dot) {
    ++state.pos;
    readInt();
    nextChar = input.charCodeAt(state.pos);
  }

  if (nextChar === charCodes.uppercaseE || nextChar === charCodes.lowercaseE) {
    nextChar = input.charCodeAt(++state.pos);
    if (nextChar === charCodes.plusSign || nextChar === charCodes.dash) {
      ++state.pos;
    }
    readInt();
    nextChar = input.charCodeAt(state.pos);
  }

  if (nextChar === charCodes.lowercaseN) {
    ++state.pos;
    isBigInt = true;
  } else if (nextChar === charCodes.lowercaseM) {
    ++state.pos;
    isDecimal = true;
  }

  if (isBigInt) {
    finishToken(tt.bigint);
    return;
  }

  if (isDecimal) {
    finishToken(tt.decimal);
    return;
  }

  finishToken(tt.num);
}

function readString(quote) {
  state.pos++;
  for (;;) {
    if (state.pos >= input.length) {
      unexpected("Unterminated string constant");
      return;
    }
    const ch = input.charCodeAt(state.pos);
    if (ch === charCodes.backslash) {
      state.pos++;
    } else if (ch === quote) {
      break;
    }
    state.pos++;
  }
  state.pos++;
  finishToken(tt.string);
}

// Reads template string tokens.
function readTmplToken() {
  for (;;) {
    if (state.pos >= input.length) {
      unexpected("Unterminated template");
      return;
    }
    const ch = input.charCodeAt(state.pos);
    if (
      ch === charCodes.graveAccent ||
      (ch === charCodes.dollarSign && input.charCodeAt(state.pos + 1) === charCodes.leftCurlyBrace)
    ) {
      if (state.pos === state.start && match(tt.template)) {
        if (ch === charCodes.dollarSign) {
          state.pos += 2;
          finishToken(tt.dollarBraceL);
          return;
        } else {
          ++state.pos;
          finishToken(tt.backQuote);
          return;
        }
      }
      finishToken(tt.template);
      return;
    }
    if (ch === charCodes.backslash) {
      state.pos++;
    }
    state.pos++;
  }
}

// Skip to the end of the current word. Note that this is the same as the snippet at the end of
// readWord, but calling skipWord from readWord seems to slightly hurt performance from some rough
// measurements.
export function skipWord() {
  while (state.pos < input.length) {
    const ch = input.charCodeAt(state.pos);
    if (IS_IDENTIFIER_CHAR[ch]) {
      state.pos++;
    } else if (ch === charCodes.backslash) {
      // \u
      state.pos += 2;
      if (input.charCodeAt(state.pos) === charCodes.leftCurlyBrace) {
        while (
          state.pos < input.length &&
          input.charCodeAt(state.pos) !== charCodes.rightCurlyBrace
        ) {
          state.pos++;
        }
        state.pos++;
      }
    } else {
      break;
    }
  }
}
