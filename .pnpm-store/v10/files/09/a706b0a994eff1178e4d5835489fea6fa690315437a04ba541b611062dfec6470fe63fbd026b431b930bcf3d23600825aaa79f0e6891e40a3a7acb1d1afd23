"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }/* eslint max-len: 0 */

var _base = require('../traverser/base');
var _util = require('../traverser/util');
var _charcodes = require('../util/charcodes');
var _identifier = require('../util/identifier');
var _whitespace = require('../util/whitespace');
var _keywords = require('./keywords');
var _readWord = require('./readWord'); var _readWord2 = _interopRequireDefault(_readWord);
var _types = require('./types');

var IdentifierRole; (function (IdentifierRole) {
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
})(IdentifierRole || (exports.IdentifierRole = IdentifierRole = {}));

/**
 * Extra information on jsxTagStart tokens, used to determine which of the three
 * jsx functions are called in the automatic transform.
 */
var JSXRole; (function (JSXRole) {
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
})(JSXRole || (exports.JSXRole = JSXRole = {}));

 function isDeclaration(token) {
  const role = token.identifierRole;
  return (
    role === IdentifierRole.TopLevelDeclaration ||
    role === IdentifierRole.FunctionScopedDeclaration ||
    role === IdentifierRole.BlockScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandTopLevelDeclaration ||
    role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandBlockScopedDeclaration
  );
} exports.isDeclaration = isDeclaration;

 function isNonTopLevelDeclaration(token) {
  const role = token.identifierRole;
  return (
    role === IdentifierRole.FunctionScopedDeclaration ||
    role === IdentifierRole.BlockScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandBlockScopedDeclaration
  );
} exports.isNonTopLevelDeclaration = isNonTopLevelDeclaration;

 function isTopLevelDeclaration(token) {
  const role = token.identifierRole;
  return (
    role === IdentifierRole.TopLevelDeclaration ||
    role === IdentifierRole.ObjectShorthandTopLevelDeclaration ||
    role === IdentifierRole.ImportDeclaration
  );
} exports.isTopLevelDeclaration = isTopLevelDeclaration;

 function isBlockScopedDeclaration(token) {
  const role = token.identifierRole;
  // Treat top-level declarations as block scope since the distinction doesn't matter here.
  return (
    role === IdentifierRole.TopLevelDeclaration ||
    role === IdentifierRole.BlockScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandTopLevelDeclaration ||
    role === IdentifierRole.ObjectShorthandBlockScopedDeclaration
  );
} exports.isBlockScopedDeclaration = isBlockScopedDeclaration;

 function isFunctionScopedDeclaration(token) {
  const role = token.identifierRole;
  return (
    role === IdentifierRole.FunctionScopedDeclaration ||
    role === IdentifierRole.ObjectShorthandFunctionScopedDeclaration
  );
} exports.isFunctionScopedDeclaration = isFunctionScopedDeclaration;

 function isObjectShorthandDeclaration(token) {
  return (
    token.identifierRole === IdentifierRole.ObjectShorthandTopLevelDeclaration ||
    token.identifierRole === IdentifierRole.ObjectShorthandBlockScopedDeclaration ||
    token.identifierRole === IdentifierRole.ObjectShorthandFunctionScopedDeclaration
  );
} exports.isObjectShorthandDeclaration = isObjectShorthandDeclaration;

// Object type used to represent tokens. Note that normally, tokens
// simply exist as properties on the parser object. This is only
// used for the onToken callback and the external tokenizer.
 class Token {
  constructor() {
    this.type = _base.state.type;
    this.contextualKeyword = _base.state.contextualKeyword;
    this.start = _base.state.start;
    this.end = _base.state.end;
    this.scopeDepth = _base.state.scopeDepth;
    this.isType = _base.state.isType;
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
  
} exports.Token = Token;

// ## Tokenizer

// Move to the next token
 function next() {
  _base.state.tokens.push(new Token());
  nextToken();
} exports.next = next;

// Call instead of next when inside a template, since that needs to be handled differently.
 function nextTemplateToken() {
  _base.state.tokens.push(new Token());
  _base.state.start = _base.state.pos;
  readTmplToken();
} exports.nextTemplateToken = nextTemplateToken;

// The tokenizer never parses regexes by default. Instead, the parser is responsible for
// instructing it to parse a regex when we see a slash at the start of an expression.
 function retokenizeSlashAsRegex() {
  if (_base.state.type === _types.TokenType.assign) {
    --_base.state.pos;
  }
  readRegexp();
} exports.retokenizeSlashAsRegex = retokenizeSlashAsRegex;

 function pushTypeContext(existingTokensInType) {
  for (let i = _base.state.tokens.length - existingTokensInType; i < _base.state.tokens.length; i++) {
    _base.state.tokens[i].isType = true;
  }
  const oldIsType = _base.state.isType;
  _base.state.isType = true;
  return oldIsType;
} exports.pushTypeContext = pushTypeContext;

 function popTypeContext(oldIsType) {
  _base.state.isType = oldIsType;
} exports.popTypeContext = popTypeContext;

 function eat(type) {
  if (match(type)) {
    next();
    return true;
  } else {
    return false;
  }
} exports.eat = eat;

 function eatTypeToken(tokenType) {
  const oldIsType = _base.state.isType;
  _base.state.isType = true;
  eat(tokenType);
  _base.state.isType = oldIsType;
} exports.eatTypeToken = eatTypeToken;

 function match(type) {
  return _base.state.type === type;
} exports.match = match;

 function lookaheadType() {
  const snapshot = _base.state.snapshot();
  next();
  const type = _base.state.type;
  _base.state.restoreFromSnapshot(snapshot);
  return type;
} exports.lookaheadType = lookaheadType;

 class TypeAndKeyword {
  
  
  constructor(type, contextualKeyword) {
    this.type = type;
    this.contextualKeyword = contextualKeyword;
  }
} exports.TypeAndKeyword = TypeAndKeyword;

 function lookaheadTypeAndKeyword() {
  const snapshot = _base.state.snapshot();
  next();
  const type = _base.state.type;
  const contextualKeyword = _base.state.contextualKeyword;
  _base.state.restoreFromSnapshot(snapshot);
  return new TypeAndKeyword(type, contextualKeyword);
} exports.lookaheadTypeAndKeyword = lookaheadTypeAndKeyword;

 function nextTokenStart() {
  return nextTokenStartSince(_base.state.pos);
} exports.nextTokenStart = nextTokenStart;

 function nextTokenStartSince(pos) {
  _whitespace.skipWhiteSpace.lastIndex = pos;
  const skip = _whitespace.skipWhiteSpace.exec(_base.input);
  return pos + skip[0].length;
} exports.nextTokenStartSince = nextTokenStartSince;

 function lookaheadCharCode() {
  return _base.input.charCodeAt(nextTokenStart());
} exports.lookaheadCharCode = lookaheadCharCode;

// Read a single token, updating the parser object's token-related
// properties.
 function nextToken() {
  skipSpace();
  _base.state.start = _base.state.pos;
  if (_base.state.pos >= _base.input.length) {
    const tokens = _base.state.tokens;
    // We normally run past the end a bit, but if we're way past the end, avoid an infinite loop.
    // Also check the token positions rather than the types since sometimes we rewrite the token
    // type to something else.
    if (
      tokens.length >= 2 &&
      tokens[tokens.length - 1].start >= _base.input.length &&
      tokens[tokens.length - 2].start >= _base.input.length
    ) {
      _util.unexpected.call(void 0, "Unexpectedly reached the end of input.");
    }
    finishToken(_types.TokenType.eof);
    return;
  }
  readToken(_base.input.charCodeAt(_base.state.pos));
} exports.nextToken = nextToken;

function readToken(code) {
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (
    _identifier.IS_IDENTIFIER_START[code] ||
    code === _charcodes.charCodes.backslash ||
    (code === _charcodes.charCodes.atSign && _base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.atSign)
  ) {
    _readWord2.default.call(void 0, );
  } else {
    getTokenFromCode(code);
  }
}

function skipBlockComment() {
  while (
    _base.input.charCodeAt(_base.state.pos) !== _charcodes.charCodes.asterisk ||
    _base.input.charCodeAt(_base.state.pos + 1) !== _charcodes.charCodes.slash
  ) {
    _base.state.pos++;
    if (_base.state.pos > _base.input.length) {
      _util.unexpected.call(void 0, "Unterminated comment", _base.state.pos - 2);
      return;
    }
  }
  _base.state.pos += 2;
}

 function skipLineComment(startSkip) {
  let ch = _base.input.charCodeAt((_base.state.pos += startSkip));
  if (_base.state.pos < _base.input.length) {
    while (
      ch !== _charcodes.charCodes.lineFeed &&
      ch !== _charcodes.charCodes.carriageReturn &&
      ch !== _charcodes.charCodes.lineSeparator &&
      ch !== _charcodes.charCodes.paragraphSeparator &&
      ++_base.state.pos < _base.input.length
    ) {
      ch = _base.input.charCodeAt(_base.state.pos);
    }
  }
} exports.skipLineComment = skipLineComment;

// Called at the start of the parse and after every token. Skips
// whitespace and comments.
 function skipSpace() {
  while (_base.state.pos < _base.input.length) {
    const ch = _base.input.charCodeAt(_base.state.pos);
    switch (ch) {
      case _charcodes.charCodes.carriageReturn:
        if (_base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.lineFeed) {
          ++_base.state.pos;
        }

      case _charcodes.charCodes.lineFeed:
      case _charcodes.charCodes.lineSeparator:
      case _charcodes.charCodes.paragraphSeparator:
        ++_base.state.pos;
        break;

      case _charcodes.charCodes.slash:
        switch (_base.input.charCodeAt(_base.state.pos + 1)) {
          case _charcodes.charCodes.asterisk:
            _base.state.pos += 2;
            skipBlockComment();
            break;

          case _charcodes.charCodes.slash:
            skipLineComment(2);
            break;

          default:
            return;
        }
        break;

      default:
        if (_whitespace.IS_WHITESPACE[ch]) {
          ++_base.state.pos;
        } else {
          return;
        }
    }
  }
} exports.skipSpace = skipSpace;

// Called at the end of every token. Sets various fields, and skips the space after the token, so
// that the next one's `start` will point at the right position.
 function finishToken(
  type,
  contextualKeyword = _keywords.ContextualKeyword.NONE,
) {
  _base.state.end = _base.state.pos;
  _base.state.type = type;
  _base.state.contextualKeyword = contextualKeyword;
} exports.finishToken = finishToken;

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
function readToken_dot() {
  const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
  if (nextChar >= _charcodes.charCodes.digit0 && nextChar <= _charcodes.charCodes.digit9) {
    readNumber(true);
    return;
  }

  if (nextChar === _charcodes.charCodes.dot && _base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.dot) {
    _base.state.pos += 3;
    finishToken(_types.TokenType.ellipsis);
  } else {
    ++_base.state.pos;
    finishToken(_types.TokenType.dot);
  }
}

function readToken_slash() {
  const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
  if (nextChar === _charcodes.charCodes.equalsTo) {
    finishOp(_types.TokenType.assign, 2);
  } else {
    finishOp(_types.TokenType.slash, 1);
  }
}

function readToken_mult_modulo(code) {
  // '%*'
  let tokenType = code === _charcodes.charCodes.asterisk ? _types.TokenType.star : _types.TokenType.modulo;
  let width = 1;
  let nextChar = _base.input.charCodeAt(_base.state.pos + 1);

  // Exponentiation operator **
  if (code === _charcodes.charCodes.asterisk && nextChar === _charcodes.charCodes.asterisk) {
    width++;
    nextChar = _base.input.charCodeAt(_base.state.pos + 2);
    tokenType = _types.TokenType.exponent;
  }

  // Match *= or %=, disallowing *=> which can be valid in flow.
  if (
    nextChar === _charcodes.charCodes.equalsTo &&
    _base.input.charCodeAt(_base.state.pos + 2) !== _charcodes.charCodes.greaterThan
  ) {
    width++;
    tokenType = _types.TokenType.assign;
  }

  finishOp(tokenType, width);
}

function readToken_pipe_amp(code) {
  // '|&'
  const nextChar = _base.input.charCodeAt(_base.state.pos + 1);

  if (nextChar === code) {
    if (_base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.equalsTo) {
      // ||= or &&=
      finishOp(_types.TokenType.assign, 3);
    } else {
      // || or &&
      finishOp(code === _charcodes.charCodes.verticalBar ? _types.TokenType.logicalOR : _types.TokenType.logicalAND, 2);
    }
    return;
  }

  if (code === _charcodes.charCodes.verticalBar) {
    // '|>'
    if (nextChar === _charcodes.charCodes.greaterThan) {
      finishOp(_types.TokenType.pipeline, 2);
      return;
    } else if (nextChar === _charcodes.charCodes.rightCurlyBrace && _base.isFlowEnabled) {
      // '|}'
      finishOp(_types.TokenType.braceBarR, 2);
      return;
    }
  }

  if (nextChar === _charcodes.charCodes.equalsTo) {
    finishOp(_types.TokenType.assign, 2);
    return;
  }

  finishOp(code === _charcodes.charCodes.verticalBar ? _types.TokenType.bitwiseOR : _types.TokenType.bitwiseAND, 1);
}

function readToken_caret() {
  // '^'
  const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
  if (nextChar === _charcodes.charCodes.equalsTo) {
    finishOp(_types.TokenType.assign, 2);
  } else {
    finishOp(_types.TokenType.bitwiseXOR, 1);
  }
}

function readToken_plus_min(code) {
  // '+-'
  const nextChar = _base.input.charCodeAt(_base.state.pos + 1);

  if (nextChar === code) {
    // Tentatively call this a prefix operator, but it might be changed to postfix later.
    finishOp(_types.TokenType.preIncDec, 2);
    return;
  }

  if (nextChar === _charcodes.charCodes.equalsTo) {
    finishOp(_types.TokenType.assign, 2);
  } else if (code === _charcodes.charCodes.plusSign) {
    finishOp(_types.TokenType.plus, 1);
  } else {
    finishOp(_types.TokenType.minus, 1);
  }
}

function readToken_lt() {
  const nextChar = _base.input.charCodeAt(_base.state.pos + 1);

  if (nextChar === _charcodes.charCodes.lessThan) {
    if (_base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.equalsTo) {
      finishOp(_types.TokenType.assign, 3);
      return;
    }
    // We see <<, but need to be really careful about whether to treat it as a
    // true left-shift or as two < tokens.
    if (_base.state.isType) {
      // Within a type, << might come up in a snippet like `Array<<T>() => void>`,
      // so treat it as two < tokens. Importantly, this should only override <<
      // rather than other tokens like <= . If we treated <= as < in a type
      // context, then the snippet `a as T <= 1` would incorrectly start parsing
      // a type argument on T. We don't need to worry about `a as T << 1`
      // because TypeScript disallows that syntax.
      finishOp(_types.TokenType.lessThan, 1);
    } else {
      // Outside a type, this might be a true left-shift operator, or it might
      // still be two open-type-arg tokens, such as in `f<<T>() => void>()`. We
      // look at the token while considering the `f`, so we don't yet know that
      // we're in a type context. In this case, we initially tokenize as a
      // left-shift and correct after-the-fact as necessary in
      // tsParseTypeArgumentsWithPossibleBitshift .
      finishOp(_types.TokenType.bitShiftL, 2);
    }
    return;
  }

  if (nextChar === _charcodes.charCodes.equalsTo) {
    // <=
    finishOp(_types.TokenType.relationalOrEqual, 2);
  } else {
    finishOp(_types.TokenType.lessThan, 1);
  }
}

function readToken_gt() {
  if (_base.state.isType) {
    // Avoid right-shift for things like `Array<Array<string>>` and
    // greater-than-or-equal for things like `const a: Array<number>=[];`.
    finishOp(_types.TokenType.greaterThan, 1);
    return;
  }

  const nextChar = _base.input.charCodeAt(_base.state.pos + 1);

  if (nextChar === _charcodes.charCodes.greaterThan) {
    const size = _base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.greaterThan ? 3 : 2;
    if (_base.input.charCodeAt(_base.state.pos + size) === _charcodes.charCodes.equalsTo) {
      finishOp(_types.TokenType.assign, size + 1);
      return;
    }
    finishOp(_types.TokenType.bitShiftR, size);
    return;
  }

  if (nextChar === _charcodes.charCodes.equalsTo) {
    // >=
    finishOp(_types.TokenType.relationalOrEqual, 2);
  } else {
    finishOp(_types.TokenType.greaterThan, 1);
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
 function rescan_gt() {
  if (_base.state.type === _types.TokenType.greaterThan) {
    _base.state.pos -= 1;
    readToken_gt();
  }
} exports.rescan_gt = rescan_gt;

function readToken_eq_excl(code) {
  // '=!'
  const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
  if (nextChar === _charcodes.charCodes.equalsTo) {
    finishOp(_types.TokenType.equality, _base.input.charCodeAt(_base.state.pos + 2) === _charcodes.charCodes.equalsTo ? 3 : 2);
    return;
  }
  if (code === _charcodes.charCodes.equalsTo && nextChar === _charcodes.charCodes.greaterThan) {
    // '=>'
    _base.state.pos += 2;
    finishToken(_types.TokenType.arrow);
    return;
  }
  finishOp(code === _charcodes.charCodes.equalsTo ? _types.TokenType.eq : _types.TokenType.bang, 1);
}

function readToken_question() {
  // '?'
  const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
  const nextChar2 = _base.input.charCodeAt(_base.state.pos + 2);
  if (
    nextChar === _charcodes.charCodes.questionMark &&
    // In Flow (but not TypeScript), ??string is a valid type that should be
    // tokenized as two individual ? tokens.
    !(_base.isFlowEnabled && _base.state.isType)
  ) {
    if (nextChar2 === _charcodes.charCodes.equalsTo) {
      // '??='
      finishOp(_types.TokenType.assign, 3);
    } else {
      // '??'
      finishOp(_types.TokenType.nullishCoalescing, 2);
    }
  } else if (
    nextChar === _charcodes.charCodes.dot &&
    !(nextChar2 >= _charcodes.charCodes.digit0 && nextChar2 <= _charcodes.charCodes.digit9)
  ) {
    // '.' not followed by a number
    _base.state.pos += 2;
    finishToken(_types.TokenType.questionDot);
  } else {
    ++_base.state.pos;
    finishToken(_types.TokenType.question);
  }
}

 function getTokenFromCode(code) {
  switch (code) {
    case _charcodes.charCodes.numberSign:
      ++_base.state.pos;
      finishToken(_types.TokenType.hash);
      return;

    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.

    case _charcodes.charCodes.dot:
      readToken_dot();
      return;

    // Punctuation tokens.
    case _charcodes.charCodes.leftParenthesis:
      ++_base.state.pos;
      finishToken(_types.TokenType.parenL);
      return;
    case _charcodes.charCodes.rightParenthesis:
      ++_base.state.pos;
      finishToken(_types.TokenType.parenR);
      return;
    case _charcodes.charCodes.semicolon:
      ++_base.state.pos;
      finishToken(_types.TokenType.semi);
      return;
    case _charcodes.charCodes.comma:
      ++_base.state.pos;
      finishToken(_types.TokenType.comma);
      return;
    case _charcodes.charCodes.leftSquareBracket:
      ++_base.state.pos;
      finishToken(_types.TokenType.bracketL);
      return;
    case _charcodes.charCodes.rightSquareBracket:
      ++_base.state.pos;
      finishToken(_types.TokenType.bracketR);
      return;

    case _charcodes.charCodes.leftCurlyBrace:
      if (_base.isFlowEnabled && _base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.verticalBar) {
        finishOp(_types.TokenType.braceBarL, 2);
      } else {
        ++_base.state.pos;
        finishToken(_types.TokenType.braceL);
      }
      return;

    case _charcodes.charCodes.rightCurlyBrace:
      ++_base.state.pos;
      finishToken(_types.TokenType.braceR);
      return;

    case _charcodes.charCodes.colon:
      if (_base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.colon) {
        finishOp(_types.TokenType.doubleColon, 2);
      } else {
        ++_base.state.pos;
        finishToken(_types.TokenType.colon);
      }
      return;

    case _charcodes.charCodes.questionMark:
      readToken_question();
      return;
    case _charcodes.charCodes.atSign:
      ++_base.state.pos;
      finishToken(_types.TokenType.at);
      return;

    case _charcodes.charCodes.graveAccent:
      ++_base.state.pos;
      finishToken(_types.TokenType.backQuote);
      return;

    case _charcodes.charCodes.digit0: {
      const nextChar = _base.input.charCodeAt(_base.state.pos + 1);
      // '0x', '0X', '0o', '0O', '0b', '0B'
      if (
        nextChar === _charcodes.charCodes.lowercaseX ||
        nextChar === _charcodes.charCodes.uppercaseX ||
        nextChar === _charcodes.charCodes.lowercaseO ||
        nextChar === _charcodes.charCodes.uppercaseO ||
        nextChar === _charcodes.charCodes.lowercaseB ||
        nextChar === _charcodes.charCodes.uppercaseB
      ) {
        readRadixNumber();
        return;
      }
    }
    // Anything else beginning with a digit is an integer, octal
    // number, or float.
    case _charcodes.charCodes.digit1:
    case _charcodes.charCodes.digit2:
    case _charcodes.charCodes.digit3:
    case _charcodes.charCodes.digit4:
    case _charcodes.charCodes.digit5:
    case _charcodes.charCodes.digit6:
    case _charcodes.charCodes.digit7:
    case _charcodes.charCodes.digit8:
    case _charcodes.charCodes.digit9:
      readNumber(false);
      return;

    // Quotes produce strings.
    case _charcodes.charCodes.quotationMark:
    case _charcodes.charCodes.apostrophe:
      readString(code);
      return;

    // Operators are parsed inline in tiny state machines. '=' (charCodes.equalsTo) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

    case _charcodes.charCodes.slash:
      readToken_slash();
      return;

    case _charcodes.charCodes.percentSign:
    case _charcodes.charCodes.asterisk:
      readToken_mult_modulo(code);
      return;

    case _charcodes.charCodes.verticalBar:
    case _charcodes.charCodes.ampersand:
      readToken_pipe_amp(code);
      return;

    case _charcodes.charCodes.caret:
      readToken_caret();
      return;

    case _charcodes.charCodes.plusSign:
    case _charcodes.charCodes.dash:
      readToken_plus_min(code);
      return;

    case _charcodes.charCodes.lessThan:
      readToken_lt();
      return;

    case _charcodes.charCodes.greaterThan:
      readToken_gt();
      return;

    case _charcodes.charCodes.equalsTo:
    case _charcodes.charCodes.exclamationMark:
      readToken_eq_excl(code);
      return;

    case _charcodes.charCodes.tilde:
      finishOp(_types.TokenType.tilde, 1);
      return;

    default:
      break;
  }

  _util.unexpected.call(void 0, `Unexpected character '${String.fromCharCode(code)}'`, _base.state.pos);
} exports.getTokenFromCode = getTokenFromCode;

function finishOp(type, size) {
  _base.state.pos += size;
  finishToken(type);
}

function readRegexp() {
  const start = _base.state.pos;
  let escaped = false;
  let inClass = false;
  for (;;) {
    if (_base.state.pos >= _base.input.length) {
      _util.unexpected.call(void 0, "Unterminated regular expression", start);
      return;
    }
    const code = _base.input.charCodeAt(_base.state.pos);
    if (escaped) {
      escaped = false;
    } else {
      if (code === _charcodes.charCodes.leftSquareBracket) {
        inClass = true;
      } else if (code === _charcodes.charCodes.rightSquareBracket && inClass) {
        inClass = false;
      } else if (code === _charcodes.charCodes.slash && !inClass) {
        break;
      }
      escaped = code === _charcodes.charCodes.backslash;
    }
    ++_base.state.pos;
  }
  ++_base.state.pos;
  // Need to use `skipWord` because '\uXXXX' sequences are allowed here (don't ask).
  skipWord();

  finishToken(_types.TokenType.regexp);
}

/**
 * Read a decimal integer. Note that this can't be unified with the similar code
 * in readRadixNumber (which also handles hex digits) because "e" needs to be
 * the end of the integer so that we can properly handle scientific notation.
 */
function readInt() {
  while (true) {
    const code = _base.input.charCodeAt(_base.state.pos);
    if ((code >= _charcodes.charCodes.digit0 && code <= _charcodes.charCodes.digit9) || code === _charcodes.charCodes.underscore) {
      _base.state.pos++;
    } else {
      break;
    }
  }
}

function readRadixNumber() {
  _base.state.pos += 2; // 0x

  // Walk to the end of the number, allowing hex digits.
  while (true) {
    const code = _base.input.charCodeAt(_base.state.pos);
    if (
      (code >= _charcodes.charCodes.digit0 && code <= _charcodes.charCodes.digit9) ||
      (code >= _charcodes.charCodes.lowercaseA && code <= _charcodes.charCodes.lowercaseF) ||
      (code >= _charcodes.charCodes.uppercaseA && code <= _charcodes.charCodes.uppercaseF) ||
      code === _charcodes.charCodes.underscore
    ) {
      _base.state.pos++;
    } else {
      break;
    }
  }

  const nextChar = _base.input.charCodeAt(_base.state.pos);
  if (nextChar === _charcodes.charCodes.lowercaseN) {
    ++_base.state.pos;
    finishToken(_types.TokenType.bigint);
  } else {
    finishToken(_types.TokenType.num);
  }
}

// Read an integer, octal integer, or floating-point number.
function readNumber(startsWithDot) {
  let isBigInt = false;
  let isDecimal = false;

  if (!startsWithDot) {
    readInt();
  }

  let nextChar = _base.input.charCodeAt(_base.state.pos);
  if (nextChar === _charcodes.charCodes.dot) {
    ++_base.state.pos;
    readInt();
    nextChar = _base.input.charCodeAt(_base.state.pos);
  }

  if (nextChar === _charcodes.charCodes.uppercaseE || nextChar === _charcodes.charCodes.lowercaseE) {
    nextChar = _base.input.charCodeAt(++_base.state.pos);
    if (nextChar === _charcodes.charCodes.plusSign || nextChar === _charcodes.charCodes.dash) {
      ++_base.state.pos;
    }
    readInt();
    nextChar = _base.input.charCodeAt(_base.state.pos);
  }

  if (nextChar === _charcodes.charCodes.lowercaseN) {
    ++_base.state.pos;
    isBigInt = true;
  } else if (nextChar === _charcodes.charCodes.lowercaseM) {
    ++_base.state.pos;
    isDecimal = true;
  }

  if (isBigInt) {
    finishToken(_types.TokenType.bigint);
    return;
  }

  if (isDecimal) {
    finishToken(_types.TokenType.decimal);
    return;
  }

  finishToken(_types.TokenType.num);
}

function readString(quote) {
  _base.state.pos++;
  for (;;) {
    if (_base.state.pos >= _base.input.length) {
      _util.unexpected.call(void 0, "Unterminated string constant");
      return;
    }
    const ch = _base.input.charCodeAt(_base.state.pos);
    if (ch === _charcodes.charCodes.backslash) {
      _base.state.pos++;
    } else if (ch === quote) {
      break;
    }
    _base.state.pos++;
  }
  _base.state.pos++;
  finishToken(_types.TokenType.string);
}

// Reads template string tokens.
function readTmplToken() {
  for (;;) {
    if (_base.state.pos >= _base.input.length) {
      _util.unexpected.call(void 0, "Unterminated template");
      return;
    }
    const ch = _base.input.charCodeAt(_base.state.pos);
    if (
      ch === _charcodes.charCodes.graveAccent ||
      (ch === _charcodes.charCodes.dollarSign && _base.input.charCodeAt(_base.state.pos + 1) === _charcodes.charCodes.leftCurlyBrace)
    ) {
      if (_base.state.pos === _base.state.start && match(_types.TokenType.template)) {
        if (ch === _charcodes.charCodes.dollarSign) {
          _base.state.pos += 2;
          finishToken(_types.TokenType.dollarBraceL);
          return;
        } else {
          ++_base.state.pos;
          finishToken(_types.TokenType.backQuote);
          return;
        }
      }
      finishToken(_types.TokenType.template);
      return;
    }
    if (ch === _charcodes.charCodes.backslash) {
      _base.state.pos++;
    }
    _base.state.pos++;
  }
}

// Skip to the end of the current word. Note that this is the same as the snippet at the end of
// readWord, but calling skipWord from readWord seems to slightly hurt performance from some rough
// measurements.
 function skipWord() {
  while (_base.state.pos < _base.input.length) {
    const ch = _base.input.charCodeAt(_base.state.pos);
    if (_identifier.IS_IDENTIFIER_CHAR[ch]) {
      _base.state.pos++;
    } else if (ch === _charcodes.charCodes.backslash) {
      // \u
      _base.state.pos += 2;
      if (_base.input.charCodeAt(_base.state.pos) === _charcodes.charCodes.leftCurlyBrace) {
        while (
          _base.state.pos < _base.input.length &&
          _base.input.charCodeAt(_base.state.pos) !== _charcodes.charCodes.rightCurlyBrace
        ) {
          _base.state.pos++;
        }
        _base.state.pos++;
      }
    } else {
      break;
    }
  }
} exports.skipWord = skipWord;
