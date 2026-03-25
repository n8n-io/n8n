"use strict";Object.defineProperty(exports, "__esModule", {value: true});



var _tokenizer = require('./parser/tokenizer');

var _types = require('./parser/tokenizer/types');


/**
 * Traverse the given tokens and modify them if necessary to indicate that some names shadow global
 * variables.
 */
 function identifyShadowedGlobals(
  tokens,
  scopes,
  globalNames,
) {
  if (!hasShadowedGlobals(tokens, globalNames)) {
    return;
  }
  markShadowedGlobals(tokens, scopes, globalNames);
} exports.default = identifyShadowedGlobals;

/**
 * We can do a fast up-front check to see if there are any declarations to global names. If not,
 * then there's no point in computing scope assignments.
 */
// Exported for testing.
 function hasShadowedGlobals(tokens, globalNames) {
  for (const token of tokens.tokens) {
    if (
      token.type === _types.TokenType.name &&
      !token.isType &&
      _tokenizer.isNonTopLevelDeclaration.call(void 0, token) &&
      globalNames.has(tokens.identifierNameForToken(token))
    ) {
      return true;
    }
  }
  return false;
} exports.hasShadowedGlobals = hasShadowedGlobals;

function markShadowedGlobals(
  tokens,
  scopes,
  globalNames,
) {
  const scopeStack = [];
  let scopeIndex = scopes.length - 1;
  // Scopes were generated at completion time, so they're sorted by end index, so we can maintain a
  // good stack by going backwards through them.
  for (let i = tokens.tokens.length - 1; ; i--) {
    while (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].startTokenIndex === i + 1) {
      scopeStack.pop();
    }
    while (scopeIndex >= 0 && scopes[scopeIndex].endTokenIndex === i + 1) {
      scopeStack.push(scopes[scopeIndex]);
      scopeIndex--;
    }
    // Process scopes after the last iteration so we can make sure we pop all of them.
    if (i < 0) {
      break;
    }

    const token = tokens.tokens[i];
    const name = tokens.identifierNameForToken(token);
    if (scopeStack.length > 1 && !token.isType && token.type === _types.TokenType.name && globalNames.has(name)) {
      if (_tokenizer.isBlockScopedDeclaration.call(void 0, token)) {
        markShadowedForScope(scopeStack[scopeStack.length - 1], tokens, name);
      } else if (_tokenizer.isFunctionScopedDeclaration.call(void 0, token)) {
        let stackIndex = scopeStack.length - 1;
        while (stackIndex > 0 && !scopeStack[stackIndex].isFunctionScope) {
          stackIndex--;
        }
        if (stackIndex < 0) {
          throw new Error("Did not find parent function scope.");
        }
        markShadowedForScope(scopeStack[stackIndex], tokens, name);
      }
    }
  }
  if (scopeStack.length > 0) {
    throw new Error("Expected empty scope stack after processing file.");
  }
}

function markShadowedForScope(scope, tokens, name) {
  for (let i = scope.startTokenIndex; i < scope.endTokenIndex; i++) {
    const token = tokens.tokens[i];
    if (
      (token.type === _types.TokenType.name || token.type === _types.TokenType.jsxName) &&
      tokens.identifierNameForToken(token) === name
    ) {
      token.shadowsGlobal = true;
    }
  }
}
