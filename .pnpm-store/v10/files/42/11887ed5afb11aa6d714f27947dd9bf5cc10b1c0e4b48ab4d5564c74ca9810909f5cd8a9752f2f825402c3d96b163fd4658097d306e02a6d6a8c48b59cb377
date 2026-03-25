/* eslint max-len: 0 */

import {
  eat,
  lookaheadType,
  lookaheadTypeAndKeyword,
  match,
  next,
  popTypeContext,
  pushTypeContext,

} from "../tokenizer/index";
import {ContextualKeyword} from "../tokenizer/keywords";
import {TokenType, TokenType as tt} from "../tokenizer/types";
import {input, state} from "../traverser/base";
import {
  baseParseMaybeAssign,
  baseParseSubscript,
  baseParseSubscripts,
  parseArrow,
  parseArrowExpression,
  parseCallExpressionArguments,
  parseExprAtom,
  parseExpression,
  parseFunctionBody,
  parseIdentifier,
  parseLiteral,

} from "../traverser/expression";
import {
  baseParseExportStar,
  parseExport,
  parseExportFrom,
  parseExportSpecifiers,
  parseFunctionParams,
  parseImport,
  parseStatement,
} from "../traverser/statement";
import {
  canInsertSemicolon,
  eatContextual,
  expect,
  expectContextual,
  isContextual,
  isLookaheadContextual,
  semicolon,
  unexpected,
} from "../traverser/util";

function isMaybeDefaultImport(lookahead) {
  return (
    (lookahead.type === tt.name || !!(lookahead.type & TokenType.IS_KEYWORD)) &&
    lookahead.contextualKeyword !== ContextualKeyword._from
  );
}

function flowParseTypeInitialiser(tok) {
  const oldIsType = pushTypeContext(0);
  expect(tok || tt.colon);
  flowParseType();
  popTypeContext(oldIsType);
}

function flowParsePredicate() {
  expect(tt.modulo);
  expectContextual(ContextualKeyword._checks);
  if (eat(tt.parenL)) {
    parseExpression();
    expect(tt.parenR);
  }
}

function flowParseTypeAndPredicateInitialiser() {
  const oldIsType = pushTypeContext(0);
  expect(tt.colon);
  if (match(tt.modulo)) {
    flowParsePredicate();
  } else {
    flowParseType();
    if (match(tt.modulo)) {
      flowParsePredicate();
    }
  }
  popTypeContext(oldIsType);
}

function flowParseDeclareClass() {
  next();
  flowParseInterfaceish(/* isClass */ true);
}

function flowParseDeclareFunction() {
  next();
  parseIdentifier();

  if (match(tt.lessThan)) {
    flowParseTypeParameterDeclaration();
  }

  expect(tt.parenL);
  flowParseFunctionTypeParams();
  expect(tt.parenR);

  flowParseTypeAndPredicateInitialiser();

  semicolon();
}

function flowParseDeclare() {
  if (match(tt._class)) {
    flowParseDeclareClass();
  } else if (match(tt._function)) {
    flowParseDeclareFunction();
  } else if (match(tt._var)) {
    flowParseDeclareVariable();
  } else if (eatContextual(ContextualKeyword._module)) {
    if (eat(tt.dot)) {
      flowParseDeclareModuleExports();
    } else {
      flowParseDeclareModule();
    }
  } else if (isContextual(ContextualKeyword._type)) {
    flowParseDeclareTypeAlias();
  } else if (isContextual(ContextualKeyword._opaque)) {
    flowParseDeclareOpaqueType();
  } else if (isContextual(ContextualKeyword._interface)) {
    flowParseDeclareInterface();
  } else if (match(tt._export)) {
    flowParseDeclareExportDeclaration();
  } else {
    unexpected();
  }
}

function flowParseDeclareVariable() {
  next();
  flowParseTypeAnnotatableIdentifier();
  semicolon();
}

function flowParseDeclareModule() {
  if (match(tt.string)) {
    parseExprAtom();
  } else {
    parseIdentifier();
  }

  expect(tt.braceL);
  while (!match(tt.braceR) && !state.error) {
    if (match(tt._import)) {
      next();
      parseImport();
    } else {
      unexpected();
    }
  }
  expect(tt.braceR);
}

function flowParseDeclareExportDeclaration() {
  expect(tt._export);

  if (eat(tt._default)) {
    if (match(tt._function) || match(tt._class)) {
      // declare export default class ...
      // declare export default function ...
      flowParseDeclare();
    } else {
      // declare export default [type];
      flowParseType();
      semicolon();
    }
  } else if (
    match(tt._var) || // declare export var ...
    match(tt._function) || // declare export function ...
    match(tt._class) || // declare export class ...
    isContextual(ContextualKeyword._opaque) // declare export opaque ..
  ) {
    flowParseDeclare();
  } else if (
    match(tt.star) || // declare export * from ''
    match(tt.braceL) || // declare export {} ...
    isContextual(ContextualKeyword._interface) || // declare export interface ...
    isContextual(ContextualKeyword._type) || // declare export type ...
    isContextual(ContextualKeyword._opaque) // declare export opaque type ...
  ) {
    parseExport();
  } else {
    unexpected();
  }
}

function flowParseDeclareModuleExports() {
  expectContextual(ContextualKeyword._exports);
  flowParseTypeAnnotation();
  semicolon();
}

function flowParseDeclareTypeAlias() {
  next();
  flowParseTypeAlias();
}

function flowParseDeclareOpaqueType() {
  next();
  flowParseOpaqueType(true);
}

function flowParseDeclareInterface() {
  next();
  flowParseInterfaceish();
}

// Interfaces

function flowParseInterfaceish(isClass = false) {
  flowParseRestrictedIdentifier();

  if (match(tt.lessThan)) {
    flowParseTypeParameterDeclaration();
  }

  if (eat(tt._extends)) {
    do {
      flowParseInterfaceExtends();
    } while (!isClass && eat(tt.comma));
  }

  if (isContextual(ContextualKeyword._mixins)) {
    next();
    do {
      flowParseInterfaceExtends();
    } while (eat(tt.comma));
  }

  if (isContextual(ContextualKeyword._implements)) {
    next();
    do {
      flowParseInterfaceExtends();
    } while (eat(tt.comma));
  }

  flowParseObjectType(isClass, false, isClass);
}

function flowParseInterfaceExtends() {
  flowParseQualifiedTypeIdentifier(false);
  if (match(tt.lessThan)) {
    flowParseTypeParameterInstantiation();
  }
}

function flowParseInterface() {
  flowParseInterfaceish();
}

function flowParseRestrictedIdentifier() {
  parseIdentifier();
}

function flowParseTypeAlias() {
  flowParseRestrictedIdentifier();

  if (match(tt.lessThan)) {
    flowParseTypeParameterDeclaration();
  }

  flowParseTypeInitialiser(tt.eq);
  semicolon();
}

function flowParseOpaqueType(declare) {
  expectContextual(ContextualKeyword._type);
  flowParseRestrictedIdentifier();

  if (match(tt.lessThan)) {
    flowParseTypeParameterDeclaration();
  }

  // Parse the supertype
  if (match(tt.colon)) {
    flowParseTypeInitialiser(tt.colon);
  }

  if (!declare) {
    flowParseTypeInitialiser(tt.eq);
  }
  semicolon();
}

function flowParseTypeParameter() {
  flowParseVariance();
  flowParseTypeAnnotatableIdentifier();

  if (eat(tt.eq)) {
    flowParseType();
  }
}

export function flowParseTypeParameterDeclaration() {
  const oldIsType = pushTypeContext(0);
  // istanbul ignore else: this condition is already checked at all call sites
  if (match(tt.lessThan) || match(tt.typeParameterStart)) {
    next();
  } else {
    unexpected();
  }

  do {
    flowParseTypeParameter();
    if (!match(tt.greaterThan)) {
      expect(tt.comma);
    }
  } while (!match(tt.greaterThan) && !state.error);
  expect(tt.greaterThan);
  popTypeContext(oldIsType);
}

function flowParseTypeParameterInstantiation() {
  const oldIsType = pushTypeContext(0);
  expect(tt.lessThan);
  while (!match(tt.greaterThan) && !state.error) {
    flowParseType();
    if (!match(tt.greaterThan)) {
      expect(tt.comma);
    }
  }
  expect(tt.greaterThan);
  popTypeContext(oldIsType);
}

function flowParseInterfaceType() {
  expectContextual(ContextualKeyword._interface);
  if (eat(tt._extends)) {
    do {
      flowParseInterfaceExtends();
    } while (eat(tt.comma));
  }
  flowParseObjectType(false, false, false);
}

function flowParseObjectPropertyKey() {
  if (match(tt.num) || match(tt.string)) {
    parseExprAtom();
  } else {
    parseIdentifier();
  }
}

function flowParseObjectTypeIndexer() {
  // Note: bracketL has already been consumed
  if (lookaheadType() === tt.colon) {
    flowParseObjectPropertyKey();
    flowParseTypeInitialiser();
  } else {
    flowParseType();
  }
  expect(tt.bracketR);
  flowParseTypeInitialiser();
}

function flowParseObjectTypeInternalSlot() {
  // Note: both bracketL have already been consumed
  flowParseObjectPropertyKey();
  expect(tt.bracketR);
  expect(tt.bracketR);
  if (match(tt.lessThan) || match(tt.parenL)) {
    flowParseObjectTypeMethodish();
  } else {
    eat(tt.question);
    flowParseTypeInitialiser();
  }
}

function flowParseObjectTypeMethodish() {
  if (match(tt.lessThan)) {
    flowParseTypeParameterDeclaration();
  }

  expect(tt.parenL);
  while (!match(tt.parenR) && !match(tt.ellipsis) && !state.error) {
    flowParseFunctionTypeParam();
    if (!match(tt.parenR)) {
      expect(tt.comma);
    }
  }

  if (eat(tt.ellipsis)) {
    flowParseFunctionTypeParam();
  }
  expect(tt.parenR);
  flowParseTypeInitialiser();
}

function flowParseObjectTypeCallProperty() {
  flowParseObjectTypeMethodish();
}

function flowParseObjectType(allowStatic, allowExact, allowProto) {
  let endDelim;
  if (allowExact && match(tt.braceBarL)) {
    expect(tt.braceBarL);
    endDelim = tt.braceBarR;
  } else {
    expect(tt.braceL);
    endDelim = tt.braceR;
  }

  while (!match(endDelim) && !state.error) {
    if (allowProto && isContextual(ContextualKeyword._proto)) {
      const lookahead = lookaheadType();
      if (lookahead !== tt.colon && lookahead !== tt.question) {
        next();
        allowStatic = false;
      }
    }
    if (allowStatic && isContextual(ContextualKeyword._static)) {
      const lookahead = lookaheadType();
      if (lookahead !== tt.colon && lookahead !== tt.question) {
        next();
      }
    }

    flowParseVariance();

    if (eat(tt.bracketL)) {
      if (eat(tt.bracketL)) {
        flowParseObjectTypeInternalSlot();
      } else {
        flowParseObjectTypeIndexer();
      }
    } else if (match(tt.parenL) || match(tt.lessThan)) {
      flowParseObjectTypeCallProperty();
    } else {
      if (isContextual(ContextualKeyword._get) || isContextual(ContextualKeyword._set)) {
        const lookahead = lookaheadType();
        if (lookahead === tt.name || lookahead === tt.string || lookahead === tt.num) {
          next();
        }
      }

      flowParseObjectTypeProperty();
    }

    flowObjectTypeSemicolon();
  }

  expect(endDelim);
}

function flowParseObjectTypeProperty() {
  if (match(tt.ellipsis)) {
    expect(tt.ellipsis);
    if (!eat(tt.comma)) {
      eat(tt.semi);
    }
    // Explicit inexact object syntax.
    if (match(tt.braceR)) {
      return;
    }
    flowParseType();
  } else {
    flowParseObjectPropertyKey();
    if (match(tt.lessThan) || match(tt.parenL)) {
      // This is a method property
      flowParseObjectTypeMethodish();
    } else {
      eat(tt.question);
      flowParseTypeInitialiser();
    }
  }
}

function flowObjectTypeSemicolon() {
  if (!eat(tt.semi) && !eat(tt.comma) && !match(tt.braceR) && !match(tt.braceBarR)) {
    unexpected();
  }
}

function flowParseQualifiedTypeIdentifier(initialIdAlreadyParsed) {
  if (!initialIdAlreadyParsed) {
    parseIdentifier();
  }
  while (eat(tt.dot)) {
    parseIdentifier();
  }
}

function flowParseGenericType() {
  flowParseQualifiedTypeIdentifier(true);
  if (match(tt.lessThan)) {
    flowParseTypeParameterInstantiation();
  }
}

function flowParseTypeofType() {
  expect(tt._typeof);
  flowParsePrimaryType();
}

function flowParseTupleType() {
  expect(tt.bracketL);
  // We allow trailing commas
  while (state.pos < input.length && !match(tt.bracketR)) {
    flowParseType();
    if (match(tt.bracketR)) {
      break;
    }
    expect(tt.comma);
  }
  expect(tt.bracketR);
}

function flowParseFunctionTypeParam() {
  const lookahead = lookaheadType();
  if (lookahead === tt.colon || lookahead === tt.question) {
    parseIdentifier();
    eat(tt.question);
    flowParseTypeInitialiser();
  } else {
    flowParseType();
  }
}

function flowParseFunctionTypeParams() {
  while (!match(tt.parenR) && !match(tt.ellipsis) && !state.error) {
    flowParseFunctionTypeParam();
    if (!match(tt.parenR)) {
      expect(tt.comma);
    }
  }
  if (eat(tt.ellipsis)) {
    flowParseFunctionTypeParam();
  }
}

// The parsing of types roughly parallels the parsing of expressions, and
// primary types are kind of like primary expressions...they're the
// primitives with which other types are constructed.
function flowParsePrimaryType() {
  let isGroupedType = false;
  const oldNoAnonFunctionType = state.noAnonFunctionType;

  switch (state.type) {
    case tt.name: {
      if (isContextual(ContextualKeyword._interface)) {
        flowParseInterfaceType();
        return;
      }
      parseIdentifier();
      flowParseGenericType();
      return;
    }

    case tt.braceL:
      flowParseObjectType(false, false, false);
      return;

    case tt.braceBarL:
      flowParseObjectType(false, true, false);
      return;

    case tt.bracketL:
      flowParseTupleType();
      return;

    case tt.lessThan:
      flowParseTypeParameterDeclaration();
      expect(tt.parenL);
      flowParseFunctionTypeParams();
      expect(tt.parenR);
      expect(tt.arrow);
      flowParseType();
      return;

    case tt.parenL:
      next();

      // Check to see if this is actually a grouped type
      if (!match(tt.parenR) && !match(tt.ellipsis)) {
        if (match(tt.name)) {
          const token = lookaheadType();
          isGroupedType = token !== tt.question && token !== tt.colon;
        } else {
          isGroupedType = true;
        }
      }

      if (isGroupedType) {
        state.noAnonFunctionType = false;
        flowParseType();
        state.noAnonFunctionType = oldNoAnonFunctionType;

        // A `,` or a `) =>` means this is an anonymous function type
        if (
          state.noAnonFunctionType ||
          !(match(tt.comma) || (match(tt.parenR) && lookaheadType() === tt.arrow))
        ) {
          expect(tt.parenR);
          return;
        } else {
          // Eat a comma if there is one
          eat(tt.comma);
        }
      }

      flowParseFunctionTypeParams();

      expect(tt.parenR);
      expect(tt.arrow);
      flowParseType();
      return;

    case tt.minus:
      next();
      parseLiteral();
      return;

    case tt.string:
    case tt.num:
    case tt._true:
    case tt._false:
    case tt._null:
    case tt._this:
    case tt._void:
    case tt.star:
      next();
      return;

    default:
      if (state.type === tt._typeof) {
        flowParseTypeofType();
        return;
      } else if (state.type & TokenType.IS_KEYWORD) {
        next();
        state.tokens[state.tokens.length - 1].type = tt.name;
        return;
      }
  }

  unexpected();
}

function flowParsePostfixType() {
  flowParsePrimaryType();
  while (!canInsertSemicolon() && (match(tt.bracketL) || match(tt.questionDot))) {
    eat(tt.questionDot);
    expect(tt.bracketL);
    if (eat(tt.bracketR)) {
      // Array type
    } else {
      // Indexed access type
      flowParseType();
      expect(tt.bracketR);
    }
  }
}

function flowParsePrefixType() {
  if (eat(tt.question)) {
    flowParsePrefixType();
  } else {
    flowParsePostfixType();
  }
}

function flowParseAnonFunctionWithoutParens() {
  flowParsePrefixType();
  if (!state.noAnonFunctionType && eat(tt.arrow)) {
    flowParseType();
  }
}

function flowParseIntersectionType() {
  eat(tt.bitwiseAND);
  flowParseAnonFunctionWithoutParens();
  while (eat(tt.bitwiseAND)) {
    flowParseAnonFunctionWithoutParens();
  }
}

function flowParseUnionType() {
  eat(tt.bitwiseOR);
  flowParseIntersectionType();
  while (eat(tt.bitwiseOR)) {
    flowParseIntersectionType();
  }
}

function flowParseType() {
  flowParseUnionType();
}

export function flowParseTypeAnnotation() {
  flowParseTypeInitialiser();
}

function flowParseTypeAnnotatableIdentifier() {
  parseIdentifier();
  if (match(tt.colon)) {
    flowParseTypeAnnotation();
  }
}

export function flowParseVariance() {
  if (match(tt.plus) || match(tt.minus)) {
    next();
    state.tokens[state.tokens.length - 1].isType = true;
  }
}

// ==================================
// Overrides
// ==================================

export function flowParseFunctionBodyAndFinish(funcContextId) {
  // For arrow functions, `parseArrow` handles the return type itself.
  if (match(tt.colon)) {
    flowParseTypeAndPredicateInitialiser();
  }

  parseFunctionBody(false, funcContextId);
}

export function flowParseSubscript(
  startTokenIndex,
  noCalls,
  stopState,
) {
  if (match(tt.questionDot) && lookaheadType() === tt.lessThan) {
    if (noCalls) {
      stopState.stop = true;
      return;
    }
    next();
    flowParseTypeParameterInstantiation();
    expect(tt.parenL);
    parseCallExpressionArguments();
    return;
  } else if (!noCalls && match(tt.lessThan)) {
    const snapshot = state.snapshot();
    flowParseTypeParameterInstantiation();
    expect(tt.parenL);
    parseCallExpressionArguments();
    if (state.error) {
      state.restoreFromSnapshot(snapshot);
    } else {
      return;
    }
  }
  baseParseSubscript(startTokenIndex, noCalls, stopState);
}

export function flowStartParseNewArguments() {
  if (match(tt.lessThan)) {
    const snapshot = state.snapshot();
    flowParseTypeParameterInstantiation();
    if (state.error) {
      state.restoreFromSnapshot(snapshot);
    }
  }
}

// interfaces
export function flowTryParseStatement() {
  if (match(tt.name) && state.contextualKeyword === ContextualKeyword._interface) {
    const oldIsType = pushTypeContext(0);
    next();
    flowParseInterface();
    popTypeContext(oldIsType);
    return true;
  } else if (isContextual(ContextualKeyword._enum)) {
    flowParseEnumDeclaration();
    return true;
  }
  return false;
}

export function flowTryParseExportDefaultExpression() {
  if (isContextual(ContextualKeyword._enum)) {
    flowParseEnumDeclaration();
    return true;
  }
  return false;
}

// declares, interfaces and type aliases
export function flowParseIdentifierStatement(contextualKeyword) {
  if (contextualKeyword === ContextualKeyword._declare) {
    if (
      match(tt._class) ||
      match(tt.name) ||
      match(tt._function) ||
      match(tt._var) ||
      match(tt._export)
    ) {
      const oldIsType = pushTypeContext(1);
      flowParseDeclare();
      popTypeContext(oldIsType);
    }
  } else if (match(tt.name)) {
    if (contextualKeyword === ContextualKeyword._interface) {
      const oldIsType = pushTypeContext(1);
      flowParseInterface();
      popTypeContext(oldIsType);
    } else if (contextualKeyword === ContextualKeyword._type) {
      const oldIsType = pushTypeContext(1);
      flowParseTypeAlias();
      popTypeContext(oldIsType);
    } else if (contextualKeyword === ContextualKeyword._opaque) {
      const oldIsType = pushTypeContext(1);
      flowParseOpaqueType(false);
      popTypeContext(oldIsType);
    }
  }
  semicolon();
}

// export type
export function flowShouldParseExportDeclaration() {
  return (
    isContextual(ContextualKeyword._type) ||
    isContextual(ContextualKeyword._interface) ||
    isContextual(ContextualKeyword._opaque) ||
    isContextual(ContextualKeyword._enum)
  );
}

export function flowShouldDisallowExportDefaultSpecifier() {
  return (
    match(tt.name) &&
    (state.contextualKeyword === ContextualKeyword._type ||
      state.contextualKeyword === ContextualKeyword._interface ||
      state.contextualKeyword === ContextualKeyword._opaque ||
      state.contextualKeyword === ContextualKeyword._enum)
  );
}

export function flowParseExportDeclaration() {
  if (isContextual(ContextualKeyword._type)) {
    const oldIsType = pushTypeContext(1);
    next();

    if (match(tt.braceL)) {
      // export type { foo, bar };
      parseExportSpecifiers();
      parseExportFrom();
    } else {
      // export type Foo = Bar;
      flowParseTypeAlias();
    }
    popTypeContext(oldIsType);
  } else if (isContextual(ContextualKeyword._opaque)) {
    const oldIsType = pushTypeContext(1);
    next();
    // export opaque type Foo = Bar;
    flowParseOpaqueType(false);
    popTypeContext(oldIsType);
  } else if (isContextual(ContextualKeyword._interface)) {
    const oldIsType = pushTypeContext(1);
    next();
    flowParseInterface();
    popTypeContext(oldIsType);
  } else {
    parseStatement(true);
  }
}

export function flowShouldParseExportStar() {
  return match(tt.star) || (isContextual(ContextualKeyword._type) && lookaheadType() === tt.star);
}

export function flowParseExportStar() {
  if (eatContextual(ContextualKeyword._type)) {
    const oldIsType = pushTypeContext(2);
    baseParseExportStar();
    popTypeContext(oldIsType);
  } else {
    baseParseExportStar();
  }
}

// parse a the super class type parameters and implements
export function flowAfterParseClassSuper(hasSuper) {
  if (hasSuper && match(tt.lessThan)) {
    flowParseTypeParameterInstantiation();
  }
  if (isContextual(ContextualKeyword._implements)) {
    const oldIsType = pushTypeContext(0);
    next();
    state.tokens[state.tokens.length - 1].type = tt._implements;
    do {
      flowParseRestrictedIdentifier();
      if (match(tt.lessThan)) {
        flowParseTypeParameterInstantiation();
      }
    } while (eat(tt.comma));
    popTypeContext(oldIsType);
  }
}

// parse type parameters for object method shorthand
export function flowStartParseObjPropValue() {
  // method shorthand
  if (match(tt.lessThan)) {
    flowParseTypeParameterDeclaration();
    if (!match(tt.parenL)) unexpected();
  }
}

export function flowParseAssignableListItemTypes() {
  const oldIsType = pushTypeContext(0);
  eat(tt.question);
  if (match(tt.colon)) {
    flowParseTypeAnnotation();
  }
  popTypeContext(oldIsType);
}

// parse typeof and type imports
export function flowStartParseImportSpecifiers() {
  if (match(tt._typeof) || isContextual(ContextualKeyword._type)) {
    const lh = lookaheadTypeAndKeyword();
    if (isMaybeDefaultImport(lh) || lh.type === tt.braceL || lh.type === tt.star) {
      next();
    }
  }
}

// parse import-type/typeof shorthand
export function flowParseImportSpecifier() {
  const isTypeKeyword =
    state.contextualKeyword === ContextualKeyword._type || state.type === tt._typeof;
  if (isTypeKeyword) {
    next();
  } else {
    parseIdentifier();
  }

  if (isContextual(ContextualKeyword._as) && !isLookaheadContextual(ContextualKeyword._as)) {
    parseIdentifier();
    if (isTypeKeyword && !match(tt.name) && !(state.type & TokenType.IS_KEYWORD)) {
      // `import {type as ,` or `import {type as }`
    } else {
      // `import {type as foo`
      parseIdentifier();
    }
  } else {
    if (isTypeKeyword && (match(tt.name) || !!(state.type & TokenType.IS_KEYWORD))) {
      // `import {type foo`
      parseIdentifier();
    }
    if (eatContextual(ContextualKeyword._as)) {
      parseIdentifier();
    }
  }
}

// parse function type parameters - function foo<T>() {}
export function flowStartParseFunctionParams() {
  // Originally this checked if the method is a getter/setter, but if it was, we'd crash soon
  // anyway, so don't try to propagate that information.
  if (match(tt.lessThan)) {
    const oldIsType = pushTypeContext(0);
    flowParseTypeParameterDeclaration();
    popTypeContext(oldIsType);
  }
}

// parse flow type annotations on variable declarator heads - let foo: string = bar
export function flowAfterParseVarHead() {
  if (match(tt.colon)) {
    flowParseTypeAnnotation();
  }
}

// parse the return type of an async arrow function - let foo = (async (): number => {});
export function flowStartParseAsyncArrowFromCallExpression() {
  if (match(tt.colon)) {
    const oldNoAnonFunctionType = state.noAnonFunctionType;
    state.noAnonFunctionType = true;
    flowParseTypeAnnotation();
    state.noAnonFunctionType = oldNoAnonFunctionType;
  }
}

// We need to support type parameter declarations for arrow functions. This
// is tricky. There are three situations we need to handle
//
// 1. This is either JSX or an arrow function. We'll try JSX first. If that
//    fails, we'll try an arrow function. If that fails, we'll throw the JSX
//    error.
// 2. This is an arrow function. We'll parse the type parameter declaration,
//    parse the rest, make sure the rest is an arrow function, and go from
//    there
// 3. This is neither. Just call the super method
export function flowParseMaybeAssign(noIn, isWithinParens) {
  if (match(tt.lessThan)) {
    const snapshot = state.snapshot();
    let wasArrow = baseParseMaybeAssign(noIn, isWithinParens);
    if (state.error) {
      state.restoreFromSnapshot(snapshot);
      state.type = tt.typeParameterStart;
    } else {
      return wasArrow;
    }

    const oldIsType = pushTypeContext(0);
    flowParseTypeParameterDeclaration();
    popTypeContext(oldIsType);
    wasArrow = baseParseMaybeAssign(noIn, isWithinParens);
    if (wasArrow) {
      return true;
    }
    unexpected();
  }

  return baseParseMaybeAssign(noIn, isWithinParens);
}

// handle return types for arrow functions
export function flowParseArrow() {
  if (match(tt.colon)) {
    const oldIsType = pushTypeContext(0);
    const snapshot = state.snapshot();

    const oldNoAnonFunctionType = state.noAnonFunctionType;
    state.noAnonFunctionType = true;
    flowParseTypeAndPredicateInitialiser();
    state.noAnonFunctionType = oldNoAnonFunctionType;

    if (canInsertSemicolon()) unexpected();
    if (!match(tt.arrow)) unexpected();

    if (state.error) {
      state.restoreFromSnapshot(snapshot);
    }
    popTypeContext(oldIsType);
  }
  return eat(tt.arrow);
}

export function flowParseSubscripts(startTokenIndex, noCalls = false) {
  if (
    state.tokens[state.tokens.length - 1].contextualKeyword === ContextualKeyword._async &&
    match(tt.lessThan)
  ) {
    const snapshot = state.snapshot();
    const wasArrow = parseAsyncArrowWithTypeParameters();
    if (wasArrow && !state.error) {
      return;
    }
    state.restoreFromSnapshot(snapshot);
  }

  baseParseSubscripts(startTokenIndex, noCalls);
}

// Returns true if there was an arrow function here.
function parseAsyncArrowWithTypeParameters() {
  state.scopeDepth++;
  const startTokenIndex = state.tokens.length;
  parseFunctionParams();
  if (!parseArrow()) {
    return false;
  }
  parseArrowExpression(startTokenIndex);
  return true;
}

function flowParseEnumDeclaration() {
  expectContextual(ContextualKeyword._enum);
  state.tokens[state.tokens.length - 1].type = tt._enum;
  parseIdentifier();
  flowParseEnumBody();
}

function flowParseEnumBody() {
  if (eatContextual(ContextualKeyword._of)) {
    next();
  }
  expect(tt.braceL);
  flowParseEnumMembers();
  expect(tt.braceR);
}

function flowParseEnumMembers() {
  while (!match(tt.braceR) && !state.error) {
    if (eat(tt.ellipsis)) {
      break;
    }
    flowParseEnumMember();
    if (!match(tt.braceR)) {
      expect(tt.comma);
    }
  }
}

function flowParseEnumMember() {
  parseIdentifier();
  if (eat(tt.eq)) {
    // Flow enum values are always just one token (a string, number, or boolean literal).
    next();
  }
}
