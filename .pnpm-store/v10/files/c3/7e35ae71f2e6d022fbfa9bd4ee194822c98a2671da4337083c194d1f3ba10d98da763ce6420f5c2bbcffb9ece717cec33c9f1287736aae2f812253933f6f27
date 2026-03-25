import {flowParseAssignableListItemTypes} from "../plugins/flow";
import {tsParseAssignableListItemTypes, tsParseModifiers} from "../plugins/typescript";
import {
  eat,
  IdentifierRole,
  match,
  next,
  popTypeContext,
  pushTypeContext,
} from "../tokenizer/index";
import {ContextualKeyword} from "../tokenizer/keywords";
import {TokenType, TokenType as tt} from "../tokenizer/types";
import {isFlowEnabled, isTypeScriptEnabled, state} from "./base";
import {parseIdentifier, parseMaybeAssign, parseObj} from "./expression";
import {expect, unexpected} from "./util";

export function parseSpread() {
  next();
  parseMaybeAssign(false);
}

export function parseRest(isBlockScope) {
  next();
  parseBindingAtom(isBlockScope);
}

export function parseBindingIdentifier(isBlockScope) {
  parseIdentifier();
  markPriorBindingIdentifier(isBlockScope);
}

export function parseImportedIdentifier() {
  parseIdentifier();
  state.tokens[state.tokens.length - 1].identifierRole = IdentifierRole.ImportDeclaration;
}

export function markPriorBindingIdentifier(isBlockScope) {
  let identifierRole;
  if (state.scopeDepth === 0) {
    identifierRole = IdentifierRole.TopLevelDeclaration;
  } else if (isBlockScope) {
    identifierRole = IdentifierRole.BlockScopedDeclaration;
  } else {
    identifierRole = IdentifierRole.FunctionScopedDeclaration;
  }
  state.tokens[state.tokens.length - 1].identifierRole = identifierRole;
}

// Parses lvalue (assignable) atom.
export function parseBindingAtom(isBlockScope) {
  switch (state.type) {
    case tt._this: {
      // In TypeScript, "this" may be the name of a parameter, so allow it.
      const oldIsType = pushTypeContext(0);
      next();
      popTypeContext(oldIsType);
      return;
    }

    case tt._yield:
    case tt.name: {
      state.type = tt.name;
      parseBindingIdentifier(isBlockScope);
      return;
    }

    case tt.bracketL: {
      next();
      parseBindingList(tt.bracketR, isBlockScope, true /* allowEmpty */);
      return;
    }

    case tt.braceL:
      parseObj(true, isBlockScope);
      return;

    default:
      unexpected();
  }
}

export function parseBindingList(
  close,
  isBlockScope,
  allowEmpty = false,
  allowModifiers = false,
  contextId = 0,
) {
  let first = true;

  let hasRemovedComma = false;
  const firstItemTokenIndex = state.tokens.length;

  while (!eat(close) && !state.error) {
    if (first) {
      first = false;
    } else {
      expect(tt.comma);
      state.tokens[state.tokens.length - 1].contextId = contextId;
      // After a "this" type in TypeScript, we need to set the following comma (if any) to also be
      // a type token so that it will be removed.
      if (!hasRemovedComma && state.tokens[firstItemTokenIndex].isType) {
        state.tokens[state.tokens.length - 1].isType = true;
        hasRemovedComma = true;
      }
    }
    if (allowEmpty && match(tt.comma)) {
      // Empty item; nothing further to parse for this item.
    } else if (eat(close)) {
      break;
    } else if (match(tt.ellipsis)) {
      parseRest(isBlockScope);
      parseAssignableListItemTypes();
      // Support rest element trailing commas allowed by TypeScript <2.9.
      eat(TokenType.comma);
      expect(close);
      break;
    } else {
      parseAssignableListItem(allowModifiers, isBlockScope);
    }
  }
}

function parseAssignableListItem(allowModifiers, isBlockScope) {
  if (allowModifiers) {
    tsParseModifiers([
      ContextualKeyword._public,
      ContextualKeyword._protected,
      ContextualKeyword._private,
      ContextualKeyword._readonly,
      ContextualKeyword._override,
    ]);
  }

  parseMaybeDefault(isBlockScope);
  parseAssignableListItemTypes();
  parseMaybeDefault(isBlockScope, true /* leftAlreadyParsed */);
}

function parseAssignableListItemTypes() {
  if (isFlowEnabled) {
    flowParseAssignableListItemTypes();
  } else if (isTypeScriptEnabled) {
    tsParseAssignableListItemTypes();
  }
}

// Parses assignment pattern around given atom if possible.
export function parseMaybeDefault(isBlockScope, leftAlreadyParsed = false) {
  if (!leftAlreadyParsed) {
    parseBindingAtom(isBlockScope);
  }
  if (!eat(tt.eq)) {
    return;
  }
  const eqIndex = state.tokens.length - 1;
  parseMaybeAssign();
  state.tokens[eqIndex].rhsEndIndex = state.tokens.length;
}
