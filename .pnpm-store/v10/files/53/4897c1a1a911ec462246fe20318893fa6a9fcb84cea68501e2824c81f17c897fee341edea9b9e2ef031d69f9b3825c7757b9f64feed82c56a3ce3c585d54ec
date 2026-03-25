

import {ContextualKeyword} from "../parser/tokenizer/keywords";
import {TokenType as tt} from "../parser/tokenizer/types";







































/**
 * Get information about the class fields for this class, given a token processor pointing to the
 * open-brace at the start of the class.
 */
export default function getClassInfo(
  rootTransformer,
  tokens,
  nameManager,
  disableESTransforms,
) {
  const snapshot = tokens.snapshot();

  const headerInfo = processClassHeader(tokens);

  let constructorInitializerStatements = [];
  const instanceInitializerNames = [];
  const staticInitializerNames = [];
  let constructorInsertPos = null;
  const fields = [];
  const rangesToRemove = [];

  const classContextId = tokens.currentToken().contextId;
  if (classContextId == null) {
    throw new Error("Expected non-null class context ID on class open-brace.");
  }

  tokens.nextToken();
  while (!tokens.matchesContextIdAndLabel(tt.braceR, classContextId)) {
    if (tokens.matchesContextual(ContextualKeyword._constructor) && !tokens.currentToken().isType) {
      ({constructorInitializerStatements, constructorInsertPos} = processConstructor(tokens));
    } else if (tokens.matches1(tt.semi)) {
      if (!disableESTransforms) {
        rangesToRemove.push({start: tokens.currentIndex(), end: tokens.currentIndex() + 1});
      }
      tokens.nextToken();
    } else if (tokens.currentToken().isType) {
      tokens.nextToken();
    } else {
      // Either a method or a field. Skip to the identifier part.
      const statementStartIndex = tokens.currentIndex();
      let isStatic = false;
      let isESPrivate = false;
      let isDeclareOrAbstract = false;
      while (isAccessModifier(tokens.currentToken())) {
        if (tokens.matches1(tt._static)) {
          isStatic = true;
        }
        if (tokens.matches1(tt.hash)) {
          isESPrivate = true;
        }
        if (tokens.matches1(tt._declare) || tokens.matches1(tt._abstract)) {
          isDeclareOrAbstract = true;
        }
        tokens.nextToken();
      }
      if (isStatic && tokens.matches1(tt.braceL)) {
        // This is a static block, so don't process it in any special way.
        skipToNextClassElement(tokens, classContextId);
        continue;
      }
      if (isESPrivate) {
        // Sucrase doesn't attempt to transpile private fields; just leave them as-is.
        skipToNextClassElement(tokens, classContextId);
        continue;
      }
      if (
        tokens.matchesContextual(ContextualKeyword._constructor) &&
        !tokens.currentToken().isType
      ) {
        ({constructorInitializerStatements, constructorInsertPos} = processConstructor(tokens));
        continue;
      }

      const nameStartIndex = tokens.currentIndex();
      skipFieldName(tokens);
      if (tokens.matches1(tt.lessThan) || tokens.matches1(tt.parenL)) {
        // This is a method, so nothing to process.
        skipToNextClassElement(tokens, classContextId);
        continue;
      }
      // There might be a type annotation that we need to skip.
      while (tokens.currentToken().isType) {
        tokens.nextToken();
      }
      if (tokens.matches1(tt.eq)) {
        const equalsIndex = tokens.currentIndex();
        // This is an initializer, so we need to wrap in an initializer method.
        const valueEnd = tokens.currentToken().rhsEndIndex;
        if (valueEnd == null) {
          throw new Error("Expected rhsEndIndex on class field assignment.");
        }
        tokens.nextToken();
        while (tokens.currentIndex() < valueEnd) {
          rootTransformer.processToken();
        }
        let initializerName;
        if (isStatic) {
          initializerName = nameManager.claimFreeName("__initStatic");
          staticInitializerNames.push(initializerName);
        } else {
          initializerName = nameManager.claimFreeName("__init");
          instanceInitializerNames.push(initializerName);
        }
        // Fields start at the name, so `static x = 1;` has a field range of `x = 1;`.
        fields.push({
          initializerName,
          equalsIndex,
          start: nameStartIndex,
          end: tokens.currentIndex(),
        });
      } else if (!disableESTransforms || isDeclareOrAbstract) {
        // This is a regular field declaration, like `x;`. With the class transform enabled, we just
        // remove the line so that no output is produced. With the class transform disabled, we
        // usually want to preserve the declaration (but still strip types), but if the `declare`
        // or `abstract` keyword is specified, we should remove the line to avoid initializing the
        // value to undefined.
        rangesToRemove.push({start: statementStartIndex, end: tokens.currentIndex()});
      }
    }
  }

  tokens.restoreToSnapshot(snapshot);
  if (disableESTransforms) {
    // With ES transforms disabled, we don't want to transform regular class
    // field declarations, and we don't need to do any additional tricks to
    // reference the constructor for static init, but we still need to transform
    // TypeScript field initializers defined as constructor parameters and we
    // still need to remove `declare` fields. For now, we run the same code
    // path but omit any field information, as if the class had no field
    // declarations. In the future, when we fully drop the class fields
    // transform, we can simplify this code significantly.
    return {
      headerInfo,
      constructorInitializerStatements,
      instanceInitializerNames: [],
      staticInitializerNames: [],
      constructorInsertPos,
      fields: [],
      rangesToRemove,
    };
  } else {
    return {
      headerInfo,
      constructorInitializerStatements,
      instanceInitializerNames,
      staticInitializerNames,
      constructorInsertPos,
      fields,
      rangesToRemove,
    };
  }
}

/**
 * Move the token processor to the next method/field in the class.
 *
 * To do that, we seek forward to the next start of a class name (either an open
 * bracket or an identifier, or the closing curly brace), then seek backward to
 * include any access modifiers.
 */
function skipToNextClassElement(tokens, classContextId) {
  tokens.nextToken();
  while (tokens.currentToken().contextId !== classContextId) {
    tokens.nextToken();
  }
  while (isAccessModifier(tokens.tokenAtRelativeIndex(-1))) {
    tokens.previousToken();
  }
}

function processClassHeader(tokens) {
  const classToken = tokens.currentToken();
  const contextId = classToken.contextId;
  if (contextId == null) {
    throw new Error("Expected context ID on class token.");
  }
  const isExpression = classToken.isExpression;
  if (isExpression == null) {
    throw new Error("Expected isExpression on class token.");
  }
  let className = null;
  let hasSuperclass = false;
  tokens.nextToken();
  if (tokens.matches1(tt.name)) {
    className = tokens.identifierName();
  }
  while (!tokens.matchesContextIdAndLabel(tt.braceL, contextId)) {
    // If this has a superclass, there will always be an `extends` token. If it doesn't have a
    // superclass, only type parameters and `implements` clauses can show up here, all of which
    // consist only of type tokens. A declaration like `class A<B extends C> {` should *not* count
    // as having a superclass.
    if (tokens.matches1(tt._extends) && !tokens.currentToken().isType) {
      hasSuperclass = true;
    }
    tokens.nextToken();
  }
  return {isExpression, className, hasSuperclass};
}

/**
 * Extract useful information out of a constructor, starting at the "constructor" name.
 */
function processConstructor(tokens)


 {
  const constructorInitializerStatements = [];

  tokens.nextToken();
  const constructorContextId = tokens.currentToken().contextId;
  if (constructorContextId == null) {
    throw new Error("Expected context ID on open-paren starting constructor params.");
  }
  // Advance through parameters looking for access modifiers.
  while (!tokens.matchesContextIdAndLabel(tt.parenR, constructorContextId)) {
    if (tokens.currentToken().contextId === constructorContextId) {
      // Current token is an open paren or comma just before a param, so check
      // that param for access modifiers.
      tokens.nextToken();
      if (isAccessModifier(tokens.currentToken())) {
        tokens.nextToken();
        while (isAccessModifier(tokens.currentToken())) {
          tokens.nextToken();
        }
        const token = tokens.currentToken();
        if (token.type !== tt.name) {
          throw new Error("Expected identifier after access modifiers in constructor arg.");
        }
        const name = tokens.identifierNameForToken(token);
        constructorInitializerStatements.push(`this.${name} = ${name}`);
      }
    } else {
      tokens.nextToken();
    }
  }
  // )
  tokens.nextToken();
  // Constructor type annotations are invalid, but skip them anyway since
  // they're easy to skip.
  while (tokens.currentToken().isType) {
    tokens.nextToken();
  }
  let constructorInsertPos = tokens.currentIndex();

  // Advance through body looking for a super call.
  let foundSuperCall = false;
  while (!tokens.matchesContextIdAndLabel(tt.braceR, constructorContextId)) {
    if (!foundSuperCall && tokens.matches2(tt._super, tt.parenL)) {
      tokens.nextToken();
      const superCallContextId = tokens.currentToken().contextId;
      if (superCallContextId == null) {
        throw new Error("Expected a context ID on the super call");
      }
      while (!tokens.matchesContextIdAndLabel(tt.parenR, superCallContextId)) {
        tokens.nextToken();
      }
      constructorInsertPos = tokens.currentIndex();
      foundSuperCall = true;
    }
    tokens.nextToken();
  }
  // }
  tokens.nextToken();

  return {constructorInitializerStatements, constructorInsertPos};
}

/**
 * Determine if this is any token that can go before the name in a method/field.
 */
function isAccessModifier(token) {
  return [
    tt._async,
    tt._get,
    tt._set,
    tt.plus,
    tt.minus,
    tt._readonly,
    tt._static,
    tt._public,
    tt._private,
    tt._protected,
    tt._override,
    tt._abstract,
    tt.star,
    tt._declare,
    tt.hash,
  ].includes(token.type);
}

/**
 * The next token or set of tokens is either an identifier or an expression in square brackets, for
 * a method or field name.
 */
function skipFieldName(tokens) {
  if (tokens.matches1(tt.bracketL)) {
    const startToken = tokens.currentToken();
    const classContextId = startToken.contextId;
    if (classContextId == null) {
      throw new Error("Expected class context ID on computed name open bracket.");
    }
    while (!tokens.matchesContextIdAndLabel(tt.bracketR, classContextId)) {
      tokens.nextToken();
    }
    tokens.nextToken();
  } else {
    tokens.nextToken();
  }
}
