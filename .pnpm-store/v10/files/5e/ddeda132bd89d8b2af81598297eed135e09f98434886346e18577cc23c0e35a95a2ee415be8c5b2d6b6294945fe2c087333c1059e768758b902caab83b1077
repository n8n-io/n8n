"use strict";Object.defineProperty(exports, "__esModule", {value: true});/* eslint max-len: 0 */

var _index = require('../index');
















var _flow = require('../plugins/flow');


















var _typescript = require('../plugins/typescript');












var _tokenizer = require('../tokenizer');
var _keywords = require('../tokenizer/keywords');
var _state = require('../tokenizer/state');
var _types = require('../tokenizer/types');
var _charcodes = require('../util/charcodes');
var _base = require('./base');












var _expression = require('./expression');





var _lval = require('./lval');












var _util = require('./util');

 function parseTopLevel() {
  parseBlockBody(_types.TokenType.eof);
  _base.state.scopes.push(new (0, _state.Scope)(0, _base.state.tokens.length, true));
  if (_base.state.scopeDepth !== 0) {
    throw new Error(`Invalid scope depth at end of file: ${_base.state.scopeDepth}`);
  }
  return new (0, _index.File)(_base.state.tokens, _base.state.scopes);
} exports.parseTopLevel = parseTopLevel;

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo)`, where looking at the previous token
// does not help.

 function parseStatement(declaration) {
  if (_base.isFlowEnabled) {
    if (_flow.flowTryParseStatement.call(void 0, )) {
      return;
    }
  }
  if (_tokenizer.match.call(void 0, _types.TokenType.at)) {
    parseDecorators();
  }
  parseStatementContent(declaration);
} exports.parseStatement = parseStatement;

function parseStatementContent(declaration) {
  if (_base.isTypeScriptEnabled) {
    if (_typescript.tsTryParseStatementContent.call(void 0, )) {
      return;
    }
  }

  const starttype = _base.state.type;

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
    case _types.TokenType._break:
    case _types.TokenType._continue:
      parseBreakContinueStatement();
      return;
    case _types.TokenType._debugger:
      parseDebuggerStatement();
      return;
    case _types.TokenType._do:
      parseDoStatement();
      return;
    case _types.TokenType._for:
      parseForStatement();
      return;
    case _types.TokenType._function:
      if (_tokenizer.lookaheadType.call(void 0, ) === _types.TokenType.dot) break;
      if (!declaration) _util.unexpected.call(void 0, );
      parseFunctionStatement();
      return;

    case _types.TokenType._class:
      if (!declaration) _util.unexpected.call(void 0, );
      parseClass(true);
      return;

    case _types.TokenType._if:
      parseIfStatement();
      return;
    case _types.TokenType._return:
      parseReturnStatement();
      return;
    case _types.TokenType._switch:
      parseSwitchStatement();
      return;
    case _types.TokenType._throw:
      parseThrowStatement();
      return;
    case _types.TokenType._try:
      parseTryStatement();
      return;

    case _types.TokenType._let:
    case _types.TokenType._const:
      if (!declaration) _util.unexpected.call(void 0, ); // NOTE: falls through to _var

    case _types.TokenType._var:
      parseVarStatement(starttype !== _types.TokenType._var);
      return;

    case _types.TokenType._while:
      parseWhileStatement();
      return;
    case _types.TokenType.braceL:
      parseBlock();
      return;
    case _types.TokenType.semi:
      parseEmptyStatement();
      return;
    case _types.TokenType._export:
    case _types.TokenType._import: {
      const nextType = _tokenizer.lookaheadType.call(void 0, );
      if (nextType === _types.TokenType.parenL || nextType === _types.TokenType.dot) {
        break;
      }
      _tokenizer.next.call(void 0, );
      if (starttype === _types.TokenType._import) {
        parseImport();
      } else {
        parseExport();
      }
      return;
    }
    case _types.TokenType.name:
      if (_base.state.contextualKeyword === _keywords.ContextualKeyword._async) {
        const functionStart = _base.state.start;
        // peek ahead and see if next token is a function
        const snapshot = _base.state.snapshot();
        _tokenizer.next.call(void 0, );
        if (_tokenizer.match.call(void 0, _types.TokenType._function) && !_util.canInsertSemicolon.call(void 0, )) {
          _util.expect.call(void 0, _types.TokenType._function);
          parseFunction(functionStart, true);
          return;
        } else {
          _base.state.restoreFromSnapshot(snapshot);
        }
      } else if (
        _base.state.contextualKeyword === _keywords.ContextualKeyword._using &&
        !_util.hasFollowingLineBreak.call(void 0, ) &&
        // Statements like `using[0]` and `using in foo` aren't actual using
        // declarations.
        _tokenizer.lookaheadType.call(void 0, ) === _types.TokenType.name
      ) {
        parseVarStatement(true);
        return;
      } else if (startsAwaitUsing()) {
        _util.expectContextual.call(void 0, _keywords.ContextualKeyword._await);
        parseVarStatement(true);
        return;
      }
    default:
      // Do nothing.
      break;
  }

  // If the statement does not start with a statement keyword or a
  // brace, it's an ExpressionStatement or LabeledStatement. We
  // simply start parsing an expression, and afterwards, if the
  // next token is a colon and the expression was a simple
  // Identifier node, we switch to interpreting it as a label.
  const initialTokensLength = _base.state.tokens.length;
  _expression.parseExpression.call(void 0, );
  let simpleName = null;
  if (_base.state.tokens.length === initialTokensLength + 1) {
    const token = _base.state.tokens[_base.state.tokens.length - 1];
    if (token.type === _types.TokenType.name) {
      simpleName = token.contextualKeyword;
    }
  }
  if (simpleName == null) {
    _util.semicolon.call(void 0, );
    return;
  }
  if (_tokenizer.eat.call(void 0, _types.TokenType.colon)) {
    parseLabeledStatement();
  } else {
    // This was an identifier, so we might want to handle flow/typescript-specific cases.
    parseIdentifierStatement(simpleName);
  }
}

/**
 * Determine if we're positioned at an `await using` declaration.
 *
 * Note that this can happen either in place of a regular variable declaration
 * or in a loop body, and in both places, there are similar-looking cases where
 * we need to return false.
 *
 * Examples returning true:
 * await using foo = bar();
 * for (await using a of b) {}
 *
 * Examples returning false:
 * await using
 * await using + 1
 * await using instanceof T
 * for (await using;;) {}
 *
 * For now, we early return if we don't see `await`, then do a simple
 * backtracking-based lookahead for the `using` and identifier tokens. In the
 * future, this could be optimized with a character-based approach.
 */
function startsAwaitUsing() {
  if (!_util.isContextual.call(void 0, _keywords.ContextualKeyword._await)) {
    return false;
  }
  const snapshot = _base.state.snapshot();
  // await
  _tokenizer.next.call(void 0, );
  if (!_util.isContextual.call(void 0, _keywords.ContextualKeyword._using) || _util.hasPrecedingLineBreak.call(void 0, )) {
    _base.state.restoreFromSnapshot(snapshot);
    return false;
  }
  // using
  _tokenizer.next.call(void 0, );
  if (!_tokenizer.match.call(void 0, _types.TokenType.name) || _util.hasPrecedingLineBreak.call(void 0, )) {
    _base.state.restoreFromSnapshot(snapshot);
    return false;
  }
  _base.state.restoreFromSnapshot(snapshot);
  return true;
}

 function parseDecorators() {
  while (_tokenizer.match.call(void 0, _types.TokenType.at)) {
    parseDecorator();
  }
} exports.parseDecorators = parseDecorators;

function parseDecorator() {
  _tokenizer.next.call(void 0, );
  if (_tokenizer.eat.call(void 0, _types.TokenType.parenL)) {
    _expression.parseExpression.call(void 0, );
    _util.expect.call(void 0, _types.TokenType.parenR);
  } else {
    _expression.parseIdentifier.call(void 0, );
    while (_tokenizer.eat.call(void 0, _types.TokenType.dot)) {
      _expression.parseIdentifier.call(void 0, );
    }
    parseMaybeDecoratorArguments();
  }
}

function parseMaybeDecoratorArguments() {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsParseMaybeDecoratorArguments.call(void 0, );
  } else {
    baseParseMaybeDecoratorArguments();
  }
}

 function baseParseMaybeDecoratorArguments() {
  if (_tokenizer.eat.call(void 0, _types.TokenType.parenL)) {
    _expression.parseCallExpressionArguments.call(void 0, );
  }
} exports.baseParseMaybeDecoratorArguments = baseParseMaybeDecoratorArguments;

function parseBreakContinueStatement() {
  _tokenizer.next.call(void 0, );
  if (!_util.isLineTerminator.call(void 0, )) {
    _expression.parseIdentifier.call(void 0, );
    _util.semicolon.call(void 0, );
  }
}

function parseDebuggerStatement() {
  _tokenizer.next.call(void 0, );
  _util.semicolon.call(void 0, );
}

function parseDoStatement() {
  _tokenizer.next.call(void 0, );
  parseStatement(false);
  _util.expect.call(void 0, _types.TokenType._while);
  _expression.parseParenExpression.call(void 0, );
  _tokenizer.eat.call(void 0, _types.TokenType.semi);
}

function parseForStatement() {
  _base.state.scopeDepth++;
  const startTokenIndex = _base.state.tokens.length;
  parseAmbiguousForStatement();
  const endTokenIndex = _base.state.tokens.length;
  _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, false));
  _base.state.scopeDepth--;
}

/**
 * Determine if this token is a `using` declaration (explicit resource
 * management) as part of a loop.
 * https://github.com/tc39/proposal-explicit-resource-management
 */
function isUsingInLoop() {
  if (!_util.isContextual.call(void 0, _keywords.ContextualKeyword._using)) {
    return false;
  }
  // This must be `for (using of`, where `using` is the name of the loop
  // variable.
  if (_util.isLookaheadContextual.call(void 0, _keywords.ContextualKeyword._of)) {
    return false;
  }
  return true;
}

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.
function parseAmbiguousForStatement() {
  _tokenizer.next.call(void 0, );

  let forAwait = false;
  if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._await)) {
    forAwait = true;
    _tokenizer.next.call(void 0, );
  }
  _util.expect.call(void 0, _types.TokenType.parenL);

  if (_tokenizer.match.call(void 0, _types.TokenType.semi)) {
    if (forAwait) {
      _util.unexpected.call(void 0, );
    }
    parseFor();
    return;
  }

  const isAwaitUsing = startsAwaitUsing();
  if (isAwaitUsing || _tokenizer.match.call(void 0, _types.TokenType._var) || _tokenizer.match.call(void 0, _types.TokenType._let) || _tokenizer.match.call(void 0, _types.TokenType._const) || isUsingInLoop()) {
    if (isAwaitUsing) {
      _util.expectContextual.call(void 0, _keywords.ContextualKeyword._await);
    }
    _tokenizer.next.call(void 0, );
    parseVar(true, _base.state.type !== _types.TokenType._var);
    if (_tokenizer.match.call(void 0, _types.TokenType._in) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._of)) {
      parseForIn(forAwait);
      return;
    }
    parseFor();
    return;
  }

  _expression.parseExpression.call(void 0, true);
  if (_tokenizer.match.call(void 0, _types.TokenType._in) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._of)) {
    parseForIn(forAwait);
    return;
  }
  if (forAwait) {
    _util.unexpected.call(void 0, );
  }
  parseFor();
}

function parseFunctionStatement() {
  const functionStart = _base.state.start;
  _tokenizer.next.call(void 0, );
  parseFunction(functionStart, true);
}

function parseIfStatement() {
  _tokenizer.next.call(void 0, );
  _expression.parseParenExpression.call(void 0, );
  parseStatement(false);
  if (_tokenizer.eat.call(void 0, _types.TokenType._else)) {
    parseStatement(false);
  }
}

function parseReturnStatement() {
  _tokenizer.next.call(void 0, );

  // In `return` (and `break`/`continue`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (!_util.isLineTerminator.call(void 0, )) {
    _expression.parseExpression.call(void 0, );
    _util.semicolon.call(void 0, );
  }
}

function parseSwitchStatement() {
  _tokenizer.next.call(void 0, );
  _expression.parseParenExpression.call(void 0, );
  _base.state.scopeDepth++;
  const startTokenIndex = _base.state.tokens.length;
  _util.expect.call(void 0, _types.TokenType.braceL);

  // Don't bother validation; just go through any sequence of cases, defaults, and statements.
  while (!_tokenizer.match.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
    if (_tokenizer.match.call(void 0, _types.TokenType._case) || _tokenizer.match.call(void 0, _types.TokenType._default)) {
      const isCase = _tokenizer.match.call(void 0, _types.TokenType._case);
      _tokenizer.next.call(void 0, );
      if (isCase) {
        _expression.parseExpression.call(void 0, );
      }
      _util.expect.call(void 0, _types.TokenType.colon);
    } else {
      parseStatement(true);
    }
  }
  _tokenizer.next.call(void 0, ); // Closing brace
  const endTokenIndex = _base.state.tokens.length;
  _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, false));
  _base.state.scopeDepth--;
}

function parseThrowStatement() {
  _tokenizer.next.call(void 0, );
  _expression.parseExpression.call(void 0, );
  _util.semicolon.call(void 0, );
}

function parseCatchClauseParam() {
  _lval.parseBindingAtom.call(void 0, true /* isBlockScope */);

  if (_base.isTypeScriptEnabled) {
    _typescript.tsTryParseTypeAnnotation.call(void 0, );
  }
}

function parseTryStatement() {
  _tokenizer.next.call(void 0, );

  parseBlock();

  if (_tokenizer.match.call(void 0, _types.TokenType._catch)) {
    _tokenizer.next.call(void 0, );
    let catchBindingStartTokenIndex = null;
    if (_tokenizer.match.call(void 0, _types.TokenType.parenL)) {
      _base.state.scopeDepth++;
      catchBindingStartTokenIndex = _base.state.tokens.length;
      _util.expect.call(void 0, _types.TokenType.parenL);
      parseCatchClauseParam();
      _util.expect.call(void 0, _types.TokenType.parenR);
    }
    parseBlock();
    if (catchBindingStartTokenIndex != null) {
      // We need a special scope for the catch binding which includes the binding itself and the
      // catch block.
      const endTokenIndex = _base.state.tokens.length;
      _base.state.scopes.push(new (0, _state.Scope)(catchBindingStartTokenIndex, endTokenIndex, false));
      _base.state.scopeDepth--;
    }
  }
  if (_tokenizer.eat.call(void 0, _types.TokenType._finally)) {
    parseBlock();
  }
}

 function parseVarStatement(isBlockScope) {
  _tokenizer.next.call(void 0, );
  parseVar(false, isBlockScope);
  _util.semicolon.call(void 0, );
} exports.parseVarStatement = parseVarStatement;

function parseWhileStatement() {
  _tokenizer.next.call(void 0, );
  _expression.parseParenExpression.call(void 0, );
  parseStatement(false);
}

function parseEmptyStatement() {
  _tokenizer.next.call(void 0, );
}

function parseLabeledStatement() {
  parseStatement(true);
}

/**
 * Parse a statement starting with an identifier of the given name. Subclasses match on the name
 * to handle statements like "declare".
 */
function parseIdentifierStatement(contextualKeyword) {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsParseIdentifierStatement.call(void 0, contextualKeyword);
  } else if (_base.isFlowEnabled) {
    _flow.flowParseIdentifierStatement.call(void 0, contextualKeyword);
  } else {
    _util.semicolon.call(void 0, );
  }
}

// Parse a semicolon-enclosed block of statements.
 function parseBlock(isFunctionScope = false, contextId = 0) {
  const startTokenIndex = _base.state.tokens.length;
  _base.state.scopeDepth++;
  _util.expect.call(void 0, _types.TokenType.braceL);
  if (contextId) {
    _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
  }
  parseBlockBody(_types.TokenType.braceR);
  if (contextId) {
    _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
  }
  const endTokenIndex = _base.state.tokens.length;
  _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, isFunctionScope));
  _base.state.scopeDepth--;
} exports.parseBlock = parseBlock;

 function parseBlockBody(end) {
  while (!_tokenizer.eat.call(void 0, end) && !_base.state.error) {
    parseStatement(true);
  }
} exports.parseBlockBody = parseBlockBody;

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

function parseFor() {
  _util.expect.call(void 0, _types.TokenType.semi);
  if (!_tokenizer.match.call(void 0, _types.TokenType.semi)) {
    _expression.parseExpression.call(void 0, );
  }
  _util.expect.call(void 0, _types.TokenType.semi);
  if (!_tokenizer.match.call(void 0, _types.TokenType.parenR)) {
    _expression.parseExpression.call(void 0, );
  }
  _util.expect.call(void 0, _types.TokenType.parenR);
  parseStatement(false);
}

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

function parseForIn(forAwait) {
  if (forAwait) {
    _util.eatContextual.call(void 0, _keywords.ContextualKeyword._of);
  } else {
    _tokenizer.next.call(void 0, );
  }
  _expression.parseExpression.call(void 0, );
  _util.expect.call(void 0, _types.TokenType.parenR);
  parseStatement(false);
}

// Parse a list of variable declarations.

function parseVar(isFor, isBlockScope) {
  while (true) {
    parseVarHead(isBlockScope);
    if (_tokenizer.eat.call(void 0, _types.TokenType.eq)) {
      const eqIndex = _base.state.tokens.length - 1;
      _expression.parseMaybeAssign.call(void 0, isFor);
      _base.state.tokens[eqIndex].rhsEndIndex = _base.state.tokens.length;
    }
    if (!_tokenizer.eat.call(void 0, _types.TokenType.comma)) {
      break;
    }
  }
}

function parseVarHead(isBlockScope) {
  _lval.parseBindingAtom.call(void 0, isBlockScope);
  if (_base.isTypeScriptEnabled) {
    _typescript.tsAfterParseVarHead.call(void 0, );
  } else if (_base.isFlowEnabled) {
    _flow.flowAfterParseVarHead.call(void 0, );
  }
}

// Parse a function declaration or literal (depending on the
// `isStatement` parameter).

 function parseFunction(
  functionStart,
  isStatement,
  optionalId = false,
) {
  if (_tokenizer.match.call(void 0, _types.TokenType.star)) {
    _tokenizer.next.call(void 0, );
  }

  if (isStatement && !optionalId && !_tokenizer.match.call(void 0, _types.TokenType.name) && !_tokenizer.match.call(void 0, _types.TokenType._yield)) {
    _util.unexpected.call(void 0, );
  }

  let nameScopeStartTokenIndex = null;

  if (_tokenizer.match.call(void 0, _types.TokenType.name)) {
    // Expression-style functions should limit their name's scope to the function body, so we make
    // a new function scope to enforce that.
    if (!isStatement) {
      nameScopeStartTokenIndex = _base.state.tokens.length;
      _base.state.scopeDepth++;
    }
    _lval.parseBindingIdentifier.call(void 0, false);
  }

  const startTokenIndex = _base.state.tokens.length;
  _base.state.scopeDepth++;
  parseFunctionParams();
  _expression.parseFunctionBodyAndFinish.call(void 0, functionStart);
  const endTokenIndex = _base.state.tokens.length;
  // In addition to the block scope of the function body, we need a separate function-style scope
  // that includes the params.
  _base.state.scopes.push(new (0, _state.Scope)(startTokenIndex, endTokenIndex, true));
  _base.state.scopeDepth--;
  if (nameScopeStartTokenIndex !== null) {
    _base.state.scopes.push(new (0, _state.Scope)(nameScopeStartTokenIndex, endTokenIndex, true));
    _base.state.scopeDepth--;
  }
} exports.parseFunction = parseFunction;

 function parseFunctionParams(
  allowModifiers = false,
  funcContextId = 0,
) {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsStartParseFunctionParams.call(void 0, );
  } else if (_base.isFlowEnabled) {
    _flow.flowStartParseFunctionParams.call(void 0, );
  }

  _util.expect.call(void 0, _types.TokenType.parenL);
  if (funcContextId) {
    _base.state.tokens[_base.state.tokens.length - 1].contextId = funcContextId;
  }
  _lval.parseBindingList.call(void 0, 
    _types.TokenType.parenR,
    false /* isBlockScope */,
    false /* allowEmpty */,
    allowModifiers,
    funcContextId,
  );
  if (funcContextId) {
    _base.state.tokens[_base.state.tokens.length - 1].contextId = funcContextId;
  }
} exports.parseFunctionParams = parseFunctionParams;

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).

 function parseClass(isStatement, optionalId = false) {
  // Put a context ID on the class keyword, the open-brace, and the close-brace, so that later
  // code can easily navigate to meaningful points on the class.
  const contextId = _base.getNextContextId.call(void 0, );

  _tokenizer.next.call(void 0, );
  _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
  _base.state.tokens[_base.state.tokens.length - 1].isExpression = !isStatement;
  // Like with functions, we declare a special "name scope" from the start of the name to the end
  // of the class, but only with expression-style classes, to represent the fact that the name is
  // available to the body of the class but not an outer declaration.
  let nameScopeStartTokenIndex = null;
  if (!isStatement) {
    nameScopeStartTokenIndex = _base.state.tokens.length;
    _base.state.scopeDepth++;
  }
  parseClassId(isStatement, optionalId);
  parseClassSuper();
  const openBraceIndex = _base.state.tokens.length;
  parseClassBody(contextId);
  if (_base.state.error) {
    return;
  }
  _base.state.tokens[openBraceIndex].contextId = contextId;
  _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
  if (nameScopeStartTokenIndex !== null) {
    const endTokenIndex = _base.state.tokens.length;
    _base.state.scopes.push(new (0, _state.Scope)(nameScopeStartTokenIndex, endTokenIndex, false));
    _base.state.scopeDepth--;
  }
} exports.parseClass = parseClass;

function isClassProperty() {
  return _tokenizer.match.call(void 0, _types.TokenType.eq) || _tokenizer.match.call(void 0, _types.TokenType.semi) || _tokenizer.match.call(void 0, _types.TokenType.braceR) || _tokenizer.match.call(void 0, _types.TokenType.bang) || _tokenizer.match.call(void 0, _types.TokenType.colon);
}

function isClassMethod() {
  return _tokenizer.match.call(void 0, _types.TokenType.parenL) || _tokenizer.match.call(void 0, _types.TokenType.lessThan);
}

function parseClassBody(classContextId) {
  _util.expect.call(void 0, _types.TokenType.braceL);

  while (!_tokenizer.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
    if (_tokenizer.eat.call(void 0, _types.TokenType.semi)) {
      continue;
    }

    if (_tokenizer.match.call(void 0, _types.TokenType.at)) {
      parseDecorator();
      continue;
    }
    const memberStart = _base.state.start;
    parseClassMember(memberStart, classContextId);
  }
}

function parseClassMember(memberStart, classContextId) {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsParseModifiers.call(void 0, [
      _keywords.ContextualKeyword._declare,
      _keywords.ContextualKeyword._public,
      _keywords.ContextualKeyword._protected,
      _keywords.ContextualKeyword._private,
      _keywords.ContextualKeyword._override,
    ]);
  }
  let isStatic = false;
  if (_tokenizer.match.call(void 0, _types.TokenType.name) && _base.state.contextualKeyword === _keywords.ContextualKeyword._static) {
    _expression.parseIdentifier.call(void 0, ); // eats 'static'
    if (isClassMethod()) {
      parseClassMethod(memberStart, /* isConstructor */ false);
      return;
    } else if (isClassProperty()) {
      parseClassProperty();
      return;
    }
    // otherwise something static
    _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._static;
    isStatic = true;

    if (_tokenizer.match.call(void 0, _types.TokenType.braceL)) {
      // This is a static block. Mark the word "static" with the class context ID for class element
      // detection and parse as a regular block.
      _base.state.tokens[_base.state.tokens.length - 1].contextId = classContextId;
      parseBlock();
      return;
    }
  }

  parseClassMemberWithIsStatic(memberStart, isStatic, classContextId);
}

function parseClassMemberWithIsStatic(
  memberStart,
  isStatic,
  classContextId,
) {
  if (_base.isTypeScriptEnabled) {
    if (_typescript.tsTryParseClassMemberWithIsStatic.call(void 0, isStatic)) {
      return;
    }
  }
  if (_tokenizer.eat.call(void 0, _types.TokenType.star)) {
    // a generator
    parseClassPropertyName(classContextId);
    parseClassMethod(memberStart, /* isConstructor */ false);
    return;
  }

  // Get the identifier name so we can tell if it's actually a keyword like "async", "get", or
  // "set".
  parseClassPropertyName(classContextId);
  let isConstructor = false;
  const token = _base.state.tokens[_base.state.tokens.length - 1];
  // We allow "constructor" as either an identifier or a string.
  if (token.contextualKeyword === _keywords.ContextualKeyword._constructor) {
    isConstructor = true;
  }
  parsePostMemberNameModifiers();

  if (isClassMethod()) {
    parseClassMethod(memberStart, isConstructor);
  } else if (isClassProperty()) {
    parseClassProperty();
  } else if (token.contextualKeyword === _keywords.ContextualKeyword._async && !_util.isLineTerminator.call(void 0, )) {
    _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._async;
    // an async method
    const isGenerator = _tokenizer.match.call(void 0, _types.TokenType.star);
    if (isGenerator) {
      _tokenizer.next.call(void 0, );
    }

    // The so-called parsed name would have been "async": get the real name.
    parseClassPropertyName(classContextId);
    parsePostMemberNameModifiers();
    parseClassMethod(memberStart, false /* isConstructor */);
  } else if (
    (token.contextualKeyword === _keywords.ContextualKeyword._get ||
      token.contextualKeyword === _keywords.ContextualKeyword._set) &&
    !(_util.isLineTerminator.call(void 0, ) && _tokenizer.match.call(void 0, _types.TokenType.star))
  ) {
    if (token.contextualKeyword === _keywords.ContextualKeyword._get) {
      _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._get;
    } else {
      _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._set;
    }
    // `get\n*` is an uninitialized property named 'get' followed by a generator.
    // a getter or setter
    // The so-called parsed name would have been "get/set": get the real name.
    parseClassPropertyName(classContextId);
    parseClassMethod(memberStart, /* isConstructor */ false);
  } else if (token.contextualKeyword === _keywords.ContextualKeyword._accessor && !_util.isLineTerminator.call(void 0, )) {
    parseClassPropertyName(classContextId);
    parseClassProperty();
  } else if (_util.isLineTerminator.call(void 0, )) {
    // an uninitialized class property (due to ASI, since we don't otherwise recognize the next token)
    parseClassProperty();
  } else {
    _util.unexpected.call(void 0, );
  }
}

function parseClassMethod(functionStart, isConstructor) {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsTryParseTypeParameters.call(void 0, );
  } else if (_base.isFlowEnabled) {
    if (_tokenizer.match.call(void 0, _types.TokenType.lessThan)) {
      _flow.flowParseTypeParameterDeclaration.call(void 0, );
    }
  }
  _expression.parseMethod.call(void 0, functionStart, isConstructor);
}

// Return the name of the class property, if it is a simple identifier.
 function parseClassPropertyName(classContextId) {
  _expression.parsePropertyName.call(void 0, classContextId);
} exports.parseClassPropertyName = parseClassPropertyName;

 function parsePostMemberNameModifiers() {
  if (_base.isTypeScriptEnabled) {
    const oldIsType = _tokenizer.pushTypeContext.call(void 0, 0);
    _tokenizer.eat.call(void 0, _types.TokenType.question);
    _tokenizer.popTypeContext.call(void 0, oldIsType);
  }
} exports.parsePostMemberNameModifiers = parsePostMemberNameModifiers;

 function parseClassProperty() {
  if (_base.isTypeScriptEnabled) {
    _tokenizer.eatTypeToken.call(void 0, _types.TokenType.bang);
    _typescript.tsTryParseTypeAnnotation.call(void 0, );
  } else if (_base.isFlowEnabled) {
    if (_tokenizer.match.call(void 0, _types.TokenType.colon)) {
      _flow.flowParseTypeAnnotation.call(void 0, );
    }
  }

  if (_tokenizer.match.call(void 0, _types.TokenType.eq)) {
    const equalsTokenIndex = _base.state.tokens.length;
    _tokenizer.next.call(void 0, );
    _expression.parseMaybeAssign.call(void 0, );
    _base.state.tokens[equalsTokenIndex].rhsEndIndex = _base.state.tokens.length;
  }
  _util.semicolon.call(void 0, );
} exports.parseClassProperty = parseClassProperty;

function parseClassId(isStatement, optionalId = false) {
  if (
    _base.isTypeScriptEnabled &&
    (!isStatement || optionalId) &&
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._implements)
  ) {
    return;
  }

  if (_tokenizer.match.call(void 0, _types.TokenType.name)) {
    _lval.parseBindingIdentifier.call(void 0, true);
  }

  if (_base.isTypeScriptEnabled) {
    _typescript.tsTryParseTypeParameters.call(void 0, );
  } else if (_base.isFlowEnabled) {
    if (_tokenizer.match.call(void 0, _types.TokenType.lessThan)) {
      _flow.flowParseTypeParameterDeclaration.call(void 0, );
    }
  }
}

// Returns true if there was a superclass.
function parseClassSuper() {
  let hasSuper = false;
  if (_tokenizer.eat.call(void 0, _types.TokenType._extends)) {
    _expression.parseExprSubscripts.call(void 0, );
    hasSuper = true;
  } else {
    hasSuper = false;
  }
  if (_base.isTypeScriptEnabled) {
    _typescript.tsAfterParseClassSuper.call(void 0, hasSuper);
  } else if (_base.isFlowEnabled) {
    _flow.flowAfterParseClassSuper.call(void 0, hasSuper);
  }
}

// Parses module export declaration.

 function parseExport() {
  const exportIndex = _base.state.tokens.length - 1;
  if (_base.isTypeScriptEnabled) {
    if (_typescript.tsTryParseExport.call(void 0, )) {
      return;
    }
  }
  // export * from '...'
  if (shouldParseExportStar()) {
    parseExportStar();
  } else if (isExportDefaultSpecifier()) {
    // export default from
    _expression.parseIdentifier.call(void 0, );
    if (_tokenizer.match.call(void 0, _types.TokenType.comma) && _tokenizer.lookaheadType.call(void 0, ) === _types.TokenType.star) {
      _util.expect.call(void 0, _types.TokenType.comma);
      _util.expect.call(void 0, _types.TokenType.star);
      _util.expectContextual.call(void 0, _keywords.ContextualKeyword._as);
      _expression.parseIdentifier.call(void 0, );
    } else {
      parseExportSpecifiersMaybe();
    }
    parseExportFrom();
  } else if (_tokenizer.eat.call(void 0, _types.TokenType._default)) {
    // export default ...
    parseExportDefaultExpression();
  } else if (shouldParseExportDeclaration()) {
    parseExportDeclaration();
  } else {
    // export { x, y as z } [from '...']
    parseExportSpecifiers();
    parseExportFrom();
  }
  _base.state.tokens[exportIndex].rhsEndIndex = _base.state.tokens.length;
} exports.parseExport = parseExport;

function parseExportDefaultExpression() {
  if (_base.isTypeScriptEnabled) {
    if (_typescript.tsTryParseExportDefaultExpression.call(void 0, )) {
      return;
    }
  }
  if (_base.isFlowEnabled) {
    if (_flow.flowTryParseExportDefaultExpression.call(void 0, )) {
      return;
    }
  }
  const functionStart = _base.state.start;
  if (_tokenizer.eat.call(void 0, _types.TokenType._function)) {
    parseFunction(functionStart, true, true);
  } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._async) && _tokenizer.lookaheadType.call(void 0, ) === _types.TokenType._function) {
    // async function declaration
    _util.eatContextual.call(void 0, _keywords.ContextualKeyword._async);
    _tokenizer.eat.call(void 0, _types.TokenType._function);
    parseFunction(functionStart, true, true);
  } else if (_tokenizer.match.call(void 0, _types.TokenType._class)) {
    parseClass(true, true);
  } else if (_tokenizer.match.call(void 0, _types.TokenType.at)) {
    parseDecorators();
    parseClass(true, true);
  } else {
    _expression.parseMaybeAssign.call(void 0, );
    _util.semicolon.call(void 0, );
  }
}

function parseExportDeclaration() {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsParseExportDeclaration.call(void 0, );
  } else if (_base.isFlowEnabled) {
    _flow.flowParseExportDeclaration.call(void 0, );
  } else {
    parseStatement(true);
  }
}

function isExportDefaultSpecifier() {
  if (_base.isTypeScriptEnabled && _typescript.tsIsDeclarationStart.call(void 0, )) {
    return false;
  } else if (_base.isFlowEnabled && _flow.flowShouldDisallowExportDefaultSpecifier.call(void 0, )) {
    return false;
  }
  if (_tokenizer.match.call(void 0, _types.TokenType.name)) {
    return _base.state.contextualKeyword !== _keywords.ContextualKeyword._async;
  }

  if (!_tokenizer.match.call(void 0, _types.TokenType._default)) {
    return false;
  }

  const _next = _tokenizer.nextTokenStart.call(void 0, );
  const lookahead = _tokenizer.lookaheadTypeAndKeyword.call(void 0, );
  const hasFrom =
    lookahead.type === _types.TokenType.name && lookahead.contextualKeyword === _keywords.ContextualKeyword._from;
  if (lookahead.type === _types.TokenType.comma) {
    return true;
  }
  // lookahead again when `export default from` is seen
  if (hasFrom) {
    const nextAfterFrom = _base.input.charCodeAt(_tokenizer.nextTokenStartSince.call(void 0, _next + 4));
    return nextAfterFrom === _charcodes.charCodes.quotationMark || nextAfterFrom === _charcodes.charCodes.apostrophe;
  }
  return false;
}

function parseExportSpecifiersMaybe() {
  if (_tokenizer.eat.call(void 0, _types.TokenType.comma)) {
    parseExportSpecifiers();
  }
}

 function parseExportFrom() {
  if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._from)) {
    _expression.parseExprAtom.call(void 0, );
    maybeParseImportAttributes();
  }
  _util.semicolon.call(void 0, );
} exports.parseExportFrom = parseExportFrom;

function shouldParseExportStar() {
  if (_base.isFlowEnabled) {
    return _flow.flowShouldParseExportStar.call(void 0, );
  } else {
    return _tokenizer.match.call(void 0, _types.TokenType.star);
  }
}

function parseExportStar() {
  if (_base.isFlowEnabled) {
    _flow.flowParseExportStar.call(void 0, );
  } else {
    baseParseExportStar();
  }
}

 function baseParseExportStar() {
  _util.expect.call(void 0, _types.TokenType.star);

  if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._as)) {
    parseExportNamespace();
  } else {
    parseExportFrom();
  }
} exports.baseParseExportStar = baseParseExportStar;

function parseExportNamespace() {
  _tokenizer.next.call(void 0, );
  _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._as;
  _expression.parseIdentifier.call(void 0, );
  parseExportSpecifiersMaybe();
  parseExportFrom();
}

function shouldParseExportDeclaration() {
  return (
    (_base.isTypeScriptEnabled && _typescript.tsIsDeclarationStart.call(void 0, )) ||
    (_base.isFlowEnabled && _flow.flowShouldParseExportDeclaration.call(void 0, )) ||
    _base.state.type === _types.TokenType._var ||
    _base.state.type === _types.TokenType._const ||
    _base.state.type === _types.TokenType._let ||
    _base.state.type === _types.TokenType._function ||
    _base.state.type === _types.TokenType._class ||
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._async) ||
    _tokenizer.match.call(void 0, _types.TokenType.at)
  );
}

// Parses a comma-separated list of module exports.
 function parseExportSpecifiers() {
  let first = true;

  // export { x, y as z } [from '...']
  _util.expect.call(void 0, _types.TokenType.braceL);

  while (!_tokenizer.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
    if (first) {
      first = false;
    } else {
      _util.expect.call(void 0, _types.TokenType.comma);
      if (_tokenizer.eat.call(void 0, _types.TokenType.braceR)) {
        break;
      }
    }
    parseExportSpecifier();
  }
} exports.parseExportSpecifiers = parseExportSpecifiers;

function parseExportSpecifier() {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsParseExportSpecifier.call(void 0, );
    return;
  }
  _expression.parseIdentifier.call(void 0, );
  _base.state.tokens[_base.state.tokens.length - 1].identifierRole = _tokenizer.IdentifierRole.ExportAccess;
  if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) {
    _expression.parseIdentifier.call(void 0, );
  }
}

/**
 * Starting at the `module` token in an import, determine if it was truly an
 * import reflection token or just looks like one.
 *
 * Returns true for:
 * import module foo from "foo";
 * import module from from "foo";
 *
 * Returns false for:
 * import module from "foo";
 * import module, {bar} from "foo";
 */
function isImportReflection() {
  const snapshot = _base.state.snapshot();
  _util.expectContextual.call(void 0, _keywords.ContextualKeyword._module);
  if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._from)) {
    if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._from)) {
      _base.state.restoreFromSnapshot(snapshot);
      return true;
    } else {
      _base.state.restoreFromSnapshot(snapshot);
      return false;
    }
  } else if (_tokenizer.match.call(void 0, _types.TokenType.comma)) {
    _base.state.restoreFromSnapshot(snapshot);
    return false;
  } else {
    _base.state.restoreFromSnapshot(snapshot);
    return true;
  }
}

/**
 * Eat the "module" token from the import reflection proposal.
 * https://github.com/tc39/proposal-import-reflection
 */
function parseMaybeImportReflection() {
  // isImportReflection does snapshot/restore, so only run it if we see the word
  // "module".
  if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._module) && isImportReflection()) {
    _tokenizer.next.call(void 0, );
  }
}

// Parses import declaration.

 function parseImport() {
  if (_base.isTypeScriptEnabled && _tokenizer.match.call(void 0, _types.TokenType.name) && _tokenizer.lookaheadType.call(void 0, ) === _types.TokenType.eq) {
    _typescript.tsParseImportEqualsDeclaration.call(void 0, );
    return;
  }
  if (_base.isTypeScriptEnabled && _util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
    const lookahead = _tokenizer.lookaheadTypeAndKeyword.call(void 0, );
    if (lookahead.type === _types.TokenType.name && lookahead.contextualKeyword !== _keywords.ContextualKeyword._from) {
      // One of these `import type` cases:
      // import type T = require('T');
      // import type A from 'A';
      _util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
      if (_tokenizer.lookaheadType.call(void 0, ) === _types.TokenType.eq) {
        _typescript.tsParseImportEqualsDeclaration.call(void 0, );
        return;
      }
      // If this is an `import type...from` statement, then we already ate the
      // type token, so proceed to the regular import parser.
    } else if (lookahead.type === _types.TokenType.star || lookahead.type === _types.TokenType.braceL) {
      // One of these `import type` cases, in which case we can eat the type token
      // and proceed as normal:
      // import type * as A from 'A';
      // import type {a} from 'A';
      _util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
    }
    // Otherwise, we are importing the name "type".
  }

  // import '...'
  if (_tokenizer.match.call(void 0, _types.TokenType.string)) {
    _expression.parseExprAtom.call(void 0, );
  } else {
    parseMaybeImportReflection();
    parseImportSpecifiers();
    _util.expectContextual.call(void 0, _keywords.ContextualKeyword._from);
    _expression.parseExprAtom.call(void 0, );
  }
  maybeParseImportAttributes();
  _util.semicolon.call(void 0, );
} exports.parseImport = parseImport;

// eslint-disable-next-line no-unused-vars
function shouldParseDefaultImport() {
  return _tokenizer.match.call(void 0, _types.TokenType.name);
}

function parseImportSpecifierLocal() {
  _lval.parseImportedIdentifier.call(void 0, );
}

// Parses a comma-separated list of module imports.
function parseImportSpecifiers() {
  if (_base.isFlowEnabled) {
    _flow.flowStartParseImportSpecifiers.call(void 0, );
  }

  let first = true;
  if (shouldParseDefaultImport()) {
    // import defaultObj, { x, y as z } from '...'
    parseImportSpecifierLocal();

    if (!_tokenizer.eat.call(void 0, _types.TokenType.comma)) return;
  }

  if (_tokenizer.match.call(void 0, _types.TokenType.star)) {
    _tokenizer.next.call(void 0, );
    _util.expectContextual.call(void 0, _keywords.ContextualKeyword._as);

    parseImportSpecifierLocal();

    return;
  }

  _util.expect.call(void 0, _types.TokenType.braceL);
  while (!_tokenizer.eat.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
    if (first) {
      first = false;
    } else {
      // Detect an attempt to deep destructure
      if (_tokenizer.eat.call(void 0, _types.TokenType.colon)) {
        _util.unexpected.call(void 0, 
          "ES2015 named imports do not destructure. Use another statement for destructuring after the import.",
        );
      }

      _util.expect.call(void 0, _types.TokenType.comma);
      if (_tokenizer.eat.call(void 0, _types.TokenType.braceR)) {
        break;
      }
    }

    parseImportSpecifier();
  }
}

function parseImportSpecifier() {
  if (_base.isTypeScriptEnabled) {
    _typescript.tsParseImportSpecifier.call(void 0, );
    return;
  }
  if (_base.isFlowEnabled) {
    _flow.flowParseImportSpecifier.call(void 0, );
    return;
  }
  _lval.parseImportedIdentifier.call(void 0, );
  if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._as)) {
    _base.state.tokens[_base.state.tokens.length - 1].identifierRole = _tokenizer.IdentifierRole.ImportAccess;
    _tokenizer.next.call(void 0, );
    _lval.parseImportedIdentifier.call(void 0, );
  }
}

/**
 * Parse import attributes like `with {type: "json"}`, or the legacy form
 * `assert {type: "json"}`.
 *
 * Import attributes technically have their own syntax, but are always parseable
 * as a plain JS object, so just do that for simplicity.
 */
function maybeParseImportAttributes() {
  if (_tokenizer.match.call(void 0, _types.TokenType._with) || (_util.isContextual.call(void 0, _keywords.ContextualKeyword._assert) && !_util.hasPrecedingLineBreak.call(void 0, ))) {
    _tokenizer.next.call(void 0, );
    _expression.parseObj.call(void 0, false, false);
  }
}
