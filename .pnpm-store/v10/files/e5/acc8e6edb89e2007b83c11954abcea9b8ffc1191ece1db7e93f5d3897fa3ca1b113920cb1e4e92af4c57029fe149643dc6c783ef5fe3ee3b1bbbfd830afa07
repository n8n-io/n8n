"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _flow = require('../plugins/flow');
var _typescript = require('../plugins/typescript');







var _index = require('../tokenizer/index');
var _keywords = require('../tokenizer/keywords');
var _types = require('../tokenizer/types');
var _base = require('./base');
var _expression = require('./expression');
var _util = require('./util');

 function parseSpread() {
  _index.next.call(void 0, );
  _expression.parseMaybeAssign.call(void 0, false);
} exports.parseSpread = parseSpread;

 function parseRest(isBlockScope) {
  _index.next.call(void 0, );
  parseBindingAtom(isBlockScope);
} exports.parseRest = parseRest;

 function parseBindingIdentifier(isBlockScope) {
  _expression.parseIdentifier.call(void 0, );
  markPriorBindingIdentifier(isBlockScope);
} exports.parseBindingIdentifier = parseBindingIdentifier;

 function parseImportedIdentifier() {
  _expression.parseIdentifier.call(void 0, );
  _base.state.tokens[_base.state.tokens.length - 1].identifierRole = _index.IdentifierRole.ImportDeclaration;
} exports.parseImportedIdentifier = parseImportedIdentifier;

 function markPriorBindingIdentifier(isBlockScope) {
  let identifierRole;
  if (_base.state.scopeDepth === 0) {
    identifierRole = _index.IdentifierRole.TopLevelDeclaration;
  } else if (isBlockScope) {
    identifierRole = _index.IdentifierRole.BlockScopedDeclaration;
  } else {
    identifierRole = _index.IdentifierRole.FunctionScopedDeclaration;
  }
  _base.state.tokens[_base.state.tokens.length - 1].identifierRole = identifierRole;
} exports.markPriorBindingIdentifier = markPriorBindingIdentifier;

// Parses lvalue (assignable) atom.
 function parseBindingAtom(isBlockScope) {
  switch (_base.state.type) {
    case _types.TokenType._this: {
      // In TypeScript, "this" may be the name of a parameter, so allow it.
      const oldIsType = _index.pushTypeContext.call(void 0, 0);
      _index.next.call(void 0, );
      _index.popTypeContext.call(void 0, oldIsType);
      return;
    }

    case _types.TokenType._yield:
    case _types.TokenType.name: {
      _base.state.type = _types.TokenType.name;
      parseBindingIdentifier(isBlockScope);
      return;
    }

    case _types.TokenType.bracketL: {
      _index.next.call(void 0, );
      parseBindingList(_types.TokenType.bracketR, isBlockScope, true /* allowEmpty */);
      return;
    }

    case _types.TokenType.braceL:
      _expression.parseObj.call(void 0, true, isBlockScope);
      return;

    default:
      _util.unexpected.call(void 0, );
  }
} exports.parseBindingAtom = parseBindingAtom;

 function parseBindingList(
  close,
  isBlockScope,
  allowEmpty = false,
  allowModifiers = false,
  contextId = 0,
) {
  let first = true;

  let hasRemovedComma = false;
  const firstItemTokenIndex = _base.state.tokens.length;

  while (!_index.eat.call(void 0, close) && !_base.state.error) {
    if (first) {
      first = false;
    } else {
      _util.expect.call(void 0, _types.TokenType.comma);
      _base.state.tokens[_base.state.tokens.length - 1].contextId = contextId;
      // After a "this" type in TypeScript, we need to set the following comma (if any) to also be
      // a type token so that it will be removed.
      if (!hasRemovedComma && _base.state.tokens[firstItemTokenIndex].isType) {
        _base.state.tokens[_base.state.tokens.length - 1].isType = true;
        hasRemovedComma = true;
      }
    }
    if (allowEmpty && _index.match.call(void 0, _types.TokenType.comma)) {
      // Empty item; nothing further to parse for this item.
    } else if (_index.eat.call(void 0, close)) {
      break;
    } else if (_index.match.call(void 0, _types.TokenType.ellipsis)) {
      parseRest(isBlockScope);
      parseAssignableListItemTypes();
      // Support rest element trailing commas allowed by TypeScript <2.9.
      _index.eat.call(void 0, _types.TokenType.comma);
      _util.expect.call(void 0, close);
      break;
    } else {
      parseAssignableListItem(allowModifiers, isBlockScope);
    }
  }
} exports.parseBindingList = parseBindingList;

function parseAssignableListItem(allowModifiers, isBlockScope) {
  if (allowModifiers) {
    _typescript.tsParseModifiers.call(void 0, [
      _keywords.ContextualKeyword._public,
      _keywords.ContextualKeyword._protected,
      _keywords.ContextualKeyword._private,
      _keywords.ContextualKeyword._readonly,
      _keywords.ContextualKeyword._override,
    ]);
  }

  parseMaybeDefault(isBlockScope);
  parseAssignableListItemTypes();
  parseMaybeDefault(isBlockScope, true /* leftAlreadyParsed */);
}

function parseAssignableListItemTypes() {
  if (_base.isFlowEnabled) {
    _flow.flowParseAssignableListItemTypes.call(void 0, );
  } else if (_base.isTypeScriptEnabled) {
    _typescript.tsParseAssignableListItemTypes.call(void 0, );
  }
}

// Parses assignment pattern around given atom if possible.
 function parseMaybeDefault(isBlockScope, leftAlreadyParsed = false) {
  if (!leftAlreadyParsed) {
    parseBindingAtom(isBlockScope);
  }
  if (!_index.eat.call(void 0, _types.TokenType.eq)) {
    return;
  }
  const eqIndex = _base.state.tokens.length - 1;
  _expression.parseMaybeAssign.call(void 0, );
  _base.state.tokens[eqIndex].rhsEndIndex = _base.state.tokens.length;
} exports.parseMaybeDefault = parseMaybeDefault;
