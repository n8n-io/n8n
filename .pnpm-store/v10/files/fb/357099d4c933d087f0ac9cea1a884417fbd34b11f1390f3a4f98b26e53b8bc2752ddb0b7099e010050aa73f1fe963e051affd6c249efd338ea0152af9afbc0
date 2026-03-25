"use strict";Object.defineProperty(exports, "__esModule", {value: true});/* eslint max-len: 0 */










var _index = require('../tokenizer/index');
var _keywords = require('../tokenizer/keywords');
var _types = require('../tokenizer/types');
var _base = require('../traverser/base');













var _expression = require('../traverser/expression');








var _statement = require('../traverser/statement');









var _util = require('../traverser/util');

function isMaybeDefaultImport(lookahead) {
  return (
    (lookahead.type === _types.TokenType.name || !!(lookahead.type & _types.TokenType.IS_KEYWORD)) &&
    lookahead.contextualKeyword !== _keywords.ContextualKeyword._from
  );
}

function flowParseTypeInitialiser(tok) {
  const oldIsType = _index.pushTypeContext.call(void 0, 0);
  _util.expect.call(void 0, tok || _types.TokenType.colon);
  flowParseType();
  _index.popTypeContext.call(void 0, oldIsType);
}

function flowParsePredicate() {
  _util.expect.call(void 0, _types.TokenType.modulo);
  _util.expectContextual.call(void 0, _keywords.ContextualKeyword._checks);
  if (_index.eat.call(void 0, _types.TokenType.parenL)) {
    _expression.parseExpression.call(void 0, );
    _util.expect.call(void 0, _types.TokenType.parenR);
  }
}

function flowParseTypeAndPredicateInitialiser() {
  const oldIsType = _index.pushTypeContext.call(void 0, 0);
  _util.expect.call(void 0, _types.TokenType.colon);
  if (_index.match.call(void 0, _types.TokenType.modulo)) {
    flowParsePredicate();
  } else {
    flowParseType();
    if (_index.match.call(void 0, _types.TokenType.modulo)) {
      flowParsePredicate();
    }
  }
  _index.popTypeContext.call(void 0, oldIsType);
}

function flowParseDeclareClass() {
  _index.next.call(void 0, );
  flowParseInterfaceish(/* isClass */ true);
}

function flowParseDeclareFunction() {
  _index.next.call(void 0, );
  _expression.parseIdentifier.call(void 0, );

  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    flowParseTypeParameterDeclaration();
  }

  _util.expect.call(void 0, _types.TokenType.parenL);
  flowParseFunctionTypeParams();
  _util.expect.call(void 0, _types.TokenType.parenR);

  flowParseTypeAndPredicateInitialiser();

  _util.semicolon.call(void 0, );
}

function flowParseDeclare() {
  if (_index.match.call(void 0, _types.TokenType._class)) {
    flowParseDeclareClass();
  } else if (_index.match.call(void 0, _types.TokenType._function)) {
    flowParseDeclareFunction();
  } else if (_index.match.call(void 0, _types.TokenType._var)) {
    flowParseDeclareVariable();
  } else if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._module)) {
    if (_index.eat.call(void 0, _types.TokenType.dot)) {
      flowParseDeclareModuleExports();
    } else {
      flowParseDeclareModule();
    }
  } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
    flowParseDeclareTypeAlias();
  } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque)) {
    flowParseDeclareOpaqueType();
  } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) {
    flowParseDeclareInterface();
  } else if (_index.match.call(void 0, _types.TokenType._export)) {
    flowParseDeclareExportDeclaration();
  } else {
    _util.unexpected.call(void 0, );
  }
}

function flowParseDeclareVariable() {
  _index.next.call(void 0, );
  flowParseTypeAnnotatableIdentifier();
  _util.semicolon.call(void 0, );
}

function flowParseDeclareModule() {
  if (_index.match.call(void 0, _types.TokenType.string)) {
    _expression.parseExprAtom.call(void 0, );
  } else {
    _expression.parseIdentifier.call(void 0, );
  }

  _util.expect.call(void 0, _types.TokenType.braceL);
  while (!_index.match.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
    if (_index.match.call(void 0, _types.TokenType._import)) {
      _index.next.call(void 0, );
      _statement.parseImport.call(void 0, );
    } else {
      _util.unexpected.call(void 0, );
    }
  }
  _util.expect.call(void 0, _types.TokenType.braceR);
}

function flowParseDeclareExportDeclaration() {
  _util.expect.call(void 0, _types.TokenType._export);

  if (_index.eat.call(void 0, _types.TokenType._default)) {
    if (_index.match.call(void 0, _types.TokenType._function) || _index.match.call(void 0, _types.TokenType._class)) {
      // declare export default class ...
      // declare export default function ...
      flowParseDeclare();
    } else {
      // declare export default [type];
      flowParseType();
      _util.semicolon.call(void 0, );
    }
  } else if (
    _index.match.call(void 0, _types.TokenType._var) || // declare export var ...
    _index.match.call(void 0, _types.TokenType._function) || // declare export function ...
    _index.match.call(void 0, _types.TokenType._class) || // declare export class ...
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque) // declare export opaque ..
  ) {
    flowParseDeclare();
  } else if (
    _index.match.call(void 0, _types.TokenType.star) || // declare export * from ''
    _index.match.call(void 0, _types.TokenType.braceL) || // declare export {} ...
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._interface) || // declare export interface ...
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._type) || // declare export type ...
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque) // declare export opaque type ...
  ) {
    _statement.parseExport.call(void 0, );
  } else {
    _util.unexpected.call(void 0, );
  }
}

function flowParseDeclareModuleExports() {
  _util.expectContextual.call(void 0, _keywords.ContextualKeyword._exports);
  flowParseTypeAnnotation();
  _util.semicolon.call(void 0, );
}

function flowParseDeclareTypeAlias() {
  _index.next.call(void 0, );
  flowParseTypeAlias();
}

function flowParseDeclareOpaqueType() {
  _index.next.call(void 0, );
  flowParseOpaqueType(true);
}

function flowParseDeclareInterface() {
  _index.next.call(void 0, );
  flowParseInterfaceish();
}

// Interfaces

function flowParseInterfaceish(isClass = false) {
  flowParseRestrictedIdentifier();

  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    flowParseTypeParameterDeclaration();
  }

  if (_index.eat.call(void 0, _types.TokenType._extends)) {
    do {
      flowParseInterfaceExtends();
    } while (!isClass && _index.eat.call(void 0, _types.TokenType.comma));
  }

  if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._mixins)) {
    _index.next.call(void 0, );
    do {
      flowParseInterfaceExtends();
    } while (_index.eat.call(void 0, _types.TokenType.comma));
  }

  if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._implements)) {
    _index.next.call(void 0, );
    do {
      flowParseInterfaceExtends();
    } while (_index.eat.call(void 0, _types.TokenType.comma));
  }

  flowParseObjectType(isClass, false, isClass);
}

function flowParseInterfaceExtends() {
  flowParseQualifiedTypeIdentifier(false);
  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    flowParseTypeParameterInstantiation();
  }
}

function flowParseInterface() {
  flowParseInterfaceish();
}

function flowParseRestrictedIdentifier() {
  _expression.parseIdentifier.call(void 0, );
}

function flowParseTypeAlias() {
  flowParseRestrictedIdentifier();

  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    flowParseTypeParameterDeclaration();
  }

  flowParseTypeInitialiser(_types.TokenType.eq);
  _util.semicolon.call(void 0, );
}

function flowParseOpaqueType(declare) {
  _util.expectContextual.call(void 0, _keywords.ContextualKeyword._type);
  flowParseRestrictedIdentifier();

  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    flowParseTypeParameterDeclaration();
  }

  // Parse the supertype
  if (_index.match.call(void 0, _types.TokenType.colon)) {
    flowParseTypeInitialiser(_types.TokenType.colon);
  }

  if (!declare) {
    flowParseTypeInitialiser(_types.TokenType.eq);
  }
  _util.semicolon.call(void 0, );
}

function flowParseTypeParameter() {
  flowParseVariance();
  flowParseTypeAnnotatableIdentifier();

  if (_index.eat.call(void 0, _types.TokenType.eq)) {
    flowParseType();
  }
}

 function flowParseTypeParameterDeclaration() {
  const oldIsType = _index.pushTypeContext.call(void 0, 0);
  // istanbul ignore else: this condition is already checked at all call sites
  if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.typeParameterStart)) {
    _index.next.call(void 0, );
  } else {
    _util.unexpected.call(void 0, );
  }

  do {
    flowParseTypeParameter();
    if (!_index.match.call(void 0, _types.TokenType.greaterThan)) {
      _util.expect.call(void 0, _types.TokenType.comma);
    }
  } while (!_index.match.call(void 0, _types.TokenType.greaterThan) && !_base.state.error);
  _util.expect.call(void 0, _types.TokenType.greaterThan);
  _index.popTypeContext.call(void 0, oldIsType);
} exports.flowParseTypeParameterDeclaration = flowParseTypeParameterDeclaration;

function flowParseTypeParameterInstantiation() {
  const oldIsType = _index.pushTypeContext.call(void 0, 0);
  _util.expect.call(void 0, _types.TokenType.lessThan);
  while (!_index.match.call(void 0, _types.TokenType.greaterThan) && !_base.state.error) {
    flowParseType();
    if (!_index.match.call(void 0, _types.TokenType.greaterThan)) {
      _util.expect.call(void 0, _types.TokenType.comma);
    }
  }
  _util.expect.call(void 0, _types.TokenType.greaterThan);
  _index.popTypeContext.call(void 0, oldIsType);
}

function flowParseInterfaceType() {
  _util.expectContextual.call(void 0, _keywords.ContextualKeyword._interface);
  if (_index.eat.call(void 0, _types.TokenType._extends)) {
    do {
      flowParseInterfaceExtends();
    } while (_index.eat.call(void 0, _types.TokenType.comma));
  }
  flowParseObjectType(false, false, false);
}

function flowParseObjectPropertyKey() {
  if (_index.match.call(void 0, _types.TokenType.num) || _index.match.call(void 0, _types.TokenType.string)) {
    _expression.parseExprAtom.call(void 0, );
  } else {
    _expression.parseIdentifier.call(void 0, );
  }
}

function flowParseObjectTypeIndexer() {
  // Note: bracketL has already been consumed
  if (_index.lookaheadType.call(void 0, ) === _types.TokenType.colon) {
    flowParseObjectPropertyKey();
    flowParseTypeInitialiser();
  } else {
    flowParseType();
  }
  _util.expect.call(void 0, _types.TokenType.bracketR);
  flowParseTypeInitialiser();
}

function flowParseObjectTypeInternalSlot() {
  // Note: both bracketL have already been consumed
  flowParseObjectPropertyKey();
  _util.expect.call(void 0, _types.TokenType.bracketR);
  _util.expect.call(void 0, _types.TokenType.bracketR);
  if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.parenL)) {
    flowParseObjectTypeMethodish();
  } else {
    _index.eat.call(void 0, _types.TokenType.question);
    flowParseTypeInitialiser();
  }
}

function flowParseObjectTypeMethodish() {
  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    flowParseTypeParameterDeclaration();
  }

  _util.expect.call(void 0, _types.TokenType.parenL);
  while (!_index.match.call(void 0, _types.TokenType.parenR) && !_index.match.call(void 0, _types.TokenType.ellipsis) && !_base.state.error) {
    flowParseFunctionTypeParam();
    if (!_index.match.call(void 0, _types.TokenType.parenR)) {
      _util.expect.call(void 0, _types.TokenType.comma);
    }
  }

  if (_index.eat.call(void 0, _types.TokenType.ellipsis)) {
    flowParseFunctionTypeParam();
  }
  _util.expect.call(void 0, _types.TokenType.parenR);
  flowParseTypeInitialiser();
}

function flowParseObjectTypeCallProperty() {
  flowParseObjectTypeMethodish();
}

function flowParseObjectType(allowStatic, allowExact, allowProto) {
  let endDelim;
  if (allowExact && _index.match.call(void 0, _types.TokenType.braceBarL)) {
    _util.expect.call(void 0, _types.TokenType.braceBarL);
    endDelim = _types.TokenType.braceBarR;
  } else {
    _util.expect.call(void 0, _types.TokenType.braceL);
    endDelim = _types.TokenType.braceR;
  }

  while (!_index.match.call(void 0, endDelim) && !_base.state.error) {
    if (allowProto && _util.isContextual.call(void 0, _keywords.ContextualKeyword._proto)) {
      const lookahead = _index.lookaheadType.call(void 0, );
      if (lookahead !== _types.TokenType.colon && lookahead !== _types.TokenType.question) {
        _index.next.call(void 0, );
        allowStatic = false;
      }
    }
    if (allowStatic && _util.isContextual.call(void 0, _keywords.ContextualKeyword._static)) {
      const lookahead = _index.lookaheadType.call(void 0, );
      if (lookahead !== _types.TokenType.colon && lookahead !== _types.TokenType.question) {
        _index.next.call(void 0, );
      }
    }

    flowParseVariance();

    if (_index.eat.call(void 0, _types.TokenType.bracketL)) {
      if (_index.eat.call(void 0, _types.TokenType.bracketL)) {
        flowParseObjectTypeInternalSlot();
      } else {
        flowParseObjectTypeIndexer();
      }
    } else if (_index.match.call(void 0, _types.TokenType.parenL) || _index.match.call(void 0, _types.TokenType.lessThan)) {
      flowParseObjectTypeCallProperty();
    } else {
      if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._get) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._set)) {
        const lookahead = _index.lookaheadType.call(void 0, );
        if (lookahead === _types.TokenType.name || lookahead === _types.TokenType.string || lookahead === _types.TokenType.num) {
          _index.next.call(void 0, );
        }
      }

      flowParseObjectTypeProperty();
    }

    flowObjectTypeSemicolon();
  }

  _util.expect.call(void 0, endDelim);
}

function flowParseObjectTypeProperty() {
  if (_index.match.call(void 0, _types.TokenType.ellipsis)) {
    _util.expect.call(void 0, _types.TokenType.ellipsis);
    if (!_index.eat.call(void 0, _types.TokenType.comma)) {
      _index.eat.call(void 0, _types.TokenType.semi);
    }
    // Explicit inexact object syntax.
    if (_index.match.call(void 0, _types.TokenType.braceR)) {
      return;
    }
    flowParseType();
  } else {
    flowParseObjectPropertyKey();
    if (_index.match.call(void 0, _types.TokenType.lessThan) || _index.match.call(void 0, _types.TokenType.parenL)) {
      // This is a method property
      flowParseObjectTypeMethodish();
    } else {
      _index.eat.call(void 0, _types.TokenType.question);
      flowParseTypeInitialiser();
    }
  }
}

function flowObjectTypeSemicolon() {
  if (!_index.eat.call(void 0, _types.TokenType.semi) && !_index.eat.call(void 0, _types.TokenType.comma) && !_index.match.call(void 0, _types.TokenType.braceR) && !_index.match.call(void 0, _types.TokenType.braceBarR)) {
    _util.unexpected.call(void 0, );
  }
}

function flowParseQualifiedTypeIdentifier(initialIdAlreadyParsed) {
  if (!initialIdAlreadyParsed) {
    _expression.parseIdentifier.call(void 0, );
  }
  while (_index.eat.call(void 0, _types.TokenType.dot)) {
    _expression.parseIdentifier.call(void 0, );
  }
}

function flowParseGenericType() {
  flowParseQualifiedTypeIdentifier(true);
  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    flowParseTypeParameterInstantiation();
  }
}

function flowParseTypeofType() {
  _util.expect.call(void 0, _types.TokenType._typeof);
  flowParsePrimaryType();
}

function flowParseTupleType() {
  _util.expect.call(void 0, _types.TokenType.bracketL);
  // We allow trailing commas
  while (_base.state.pos < _base.input.length && !_index.match.call(void 0, _types.TokenType.bracketR)) {
    flowParseType();
    if (_index.match.call(void 0, _types.TokenType.bracketR)) {
      break;
    }
    _util.expect.call(void 0, _types.TokenType.comma);
  }
  _util.expect.call(void 0, _types.TokenType.bracketR);
}

function flowParseFunctionTypeParam() {
  const lookahead = _index.lookaheadType.call(void 0, );
  if (lookahead === _types.TokenType.colon || lookahead === _types.TokenType.question) {
    _expression.parseIdentifier.call(void 0, );
    _index.eat.call(void 0, _types.TokenType.question);
    flowParseTypeInitialiser();
  } else {
    flowParseType();
  }
}

function flowParseFunctionTypeParams() {
  while (!_index.match.call(void 0, _types.TokenType.parenR) && !_index.match.call(void 0, _types.TokenType.ellipsis) && !_base.state.error) {
    flowParseFunctionTypeParam();
    if (!_index.match.call(void 0, _types.TokenType.parenR)) {
      _util.expect.call(void 0, _types.TokenType.comma);
    }
  }
  if (_index.eat.call(void 0, _types.TokenType.ellipsis)) {
    flowParseFunctionTypeParam();
  }
}

// The parsing of types roughly parallels the parsing of expressions, and
// primary types are kind of like primary expressions...they're the
// primitives with which other types are constructed.
function flowParsePrimaryType() {
  let isGroupedType = false;
  const oldNoAnonFunctionType = _base.state.noAnonFunctionType;

  switch (_base.state.type) {
    case _types.TokenType.name: {
      if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) {
        flowParseInterfaceType();
        return;
      }
      _expression.parseIdentifier.call(void 0, );
      flowParseGenericType();
      return;
    }

    case _types.TokenType.braceL:
      flowParseObjectType(false, false, false);
      return;

    case _types.TokenType.braceBarL:
      flowParseObjectType(false, true, false);
      return;

    case _types.TokenType.bracketL:
      flowParseTupleType();
      return;

    case _types.TokenType.lessThan:
      flowParseTypeParameterDeclaration();
      _util.expect.call(void 0, _types.TokenType.parenL);
      flowParseFunctionTypeParams();
      _util.expect.call(void 0, _types.TokenType.parenR);
      _util.expect.call(void 0, _types.TokenType.arrow);
      flowParseType();
      return;

    case _types.TokenType.parenL:
      _index.next.call(void 0, );

      // Check to see if this is actually a grouped type
      if (!_index.match.call(void 0, _types.TokenType.parenR) && !_index.match.call(void 0, _types.TokenType.ellipsis)) {
        if (_index.match.call(void 0, _types.TokenType.name)) {
          const token = _index.lookaheadType.call(void 0, );
          isGroupedType = token !== _types.TokenType.question && token !== _types.TokenType.colon;
        } else {
          isGroupedType = true;
        }
      }

      if (isGroupedType) {
        _base.state.noAnonFunctionType = false;
        flowParseType();
        _base.state.noAnonFunctionType = oldNoAnonFunctionType;

        // A `,` or a `) =>` means this is an anonymous function type
        if (
          _base.state.noAnonFunctionType ||
          !(_index.match.call(void 0, _types.TokenType.comma) || (_index.match.call(void 0, _types.TokenType.parenR) && _index.lookaheadType.call(void 0, ) === _types.TokenType.arrow))
        ) {
          _util.expect.call(void 0, _types.TokenType.parenR);
          return;
        } else {
          // Eat a comma if there is one
          _index.eat.call(void 0, _types.TokenType.comma);
        }
      }

      flowParseFunctionTypeParams();

      _util.expect.call(void 0, _types.TokenType.parenR);
      _util.expect.call(void 0, _types.TokenType.arrow);
      flowParseType();
      return;

    case _types.TokenType.minus:
      _index.next.call(void 0, );
      _expression.parseLiteral.call(void 0, );
      return;

    case _types.TokenType.string:
    case _types.TokenType.num:
    case _types.TokenType._true:
    case _types.TokenType._false:
    case _types.TokenType._null:
    case _types.TokenType._this:
    case _types.TokenType._void:
    case _types.TokenType.star:
      _index.next.call(void 0, );
      return;

    default:
      if (_base.state.type === _types.TokenType._typeof) {
        flowParseTypeofType();
        return;
      } else if (_base.state.type & _types.TokenType.IS_KEYWORD) {
        _index.next.call(void 0, );
        _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType.name;
        return;
      }
  }

  _util.unexpected.call(void 0, );
}

function flowParsePostfixType() {
  flowParsePrimaryType();
  while (!_util.canInsertSemicolon.call(void 0, ) && (_index.match.call(void 0, _types.TokenType.bracketL) || _index.match.call(void 0, _types.TokenType.questionDot))) {
    _index.eat.call(void 0, _types.TokenType.questionDot);
    _util.expect.call(void 0, _types.TokenType.bracketL);
    if (_index.eat.call(void 0, _types.TokenType.bracketR)) {
      // Array type
    } else {
      // Indexed access type
      flowParseType();
      _util.expect.call(void 0, _types.TokenType.bracketR);
    }
  }
}

function flowParsePrefixType() {
  if (_index.eat.call(void 0, _types.TokenType.question)) {
    flowParsePrefixType();
  } else {
    flowParsePostfixType();
  }
}

function flowParseAnonFunctionWithoutParens() {
  flowParsePrefixType();
  if (!_base.state.noAnonFunctionType && _index.eat.call(void 0, _types.TokenType.arrow)) {
    flowParseType();
  }
}

function flowParseIntersectionType() {
  _index.eat.call(void 0, _types.TokenType.bitwiseAND);
  flowParseAnonFunctionWithoutParens();
  while (_index.eat.call(void 0, _types.TokenType.bitwiseAND)) {
    flowParseAnonFunctionWithoutParens();
  }
}

function flowParseUnionType() {
  _index.eat.call(void 0, _types.TokenType.bitwiseOR);
  flowParseIntersectionType();
  while (_index.eat.call(void 0, _types.TokenType.bitwiseOR)) {
    flowParseIntersectionType();
  }
}

function flowParseType() {
  flowParseUnionType();
}

 function flowParseTypeAnnotation() {
  flowParseTypeInitialiser();
} exports.flowParseTypeAnnotation = flowParseTypeAnnotation;

function flowParseTypeAnnotatableIdentifier() {
  _expression.parseIdentifier.call(void 0, );
  if (_index.match.call(void 0, _types.TokenType.colon)) {
    flowParseTypeAnnotation();
  }
}

 function flowParseVariance() {
  if (_index.match.call(void 0, _types.TokenType.plus) || _index.match.call(void 0, _types.TokenType.minus)) {
    _index.next.call(void 0, );
    _base.state.tokens[_base.state.tokens.length - 1].isType = true;
  }
} exports.flowParseVariance = flowParseVariance;

// ==================================
// Overrides
// ==================================

 function flowParseFunctionBodyAndFinish(funcContextId) {
  // For arrow functions, `parseArrow` handles the return type itself.
  if (_index.match.call(void 0, _types.TokenType.colon)) {
    flowParseTypeAndPredicateInitialiser();
  }

  _expression.parseFunctionBody.call(void 0, false, funcContextId);
} exports.flowParseFunctionBodyAndFinish = flowParseFunctionBodyAndFinish;

 function flowParseSubscript(
  startTokenIndex,
  noCalls,
  stopState,
) {
  if (_index.match.call(void 0, _types.TokenType.questionDot) && _index.lookaheadType.call(void 0, ) === _types.TokenType.lessThan) {
    if (noCalls) {
      stopState.stop = true;
      return;
    }
    _index.next.call(void 0, );
    flowParseTypeParameterInstantiation();
    _util.expect.call(void 0, _types.TokenType.parenL);
    _expression.parseCallExpressionArguments.call(void 0, );
    return;
  } else if (!noCalls && _index.match.call(void 0, _types.TokenType.lessThan)) {
    const snapshot = _base.state.snapshot();
    flowParseTypeParameterInstantiation();
    _util.expect.call(void 0, _types.TokenType.parenL);
    _expression.parseCallExpressionArguments.call(void 0, );
    if (_base.state.error) {
      _base.state.restoreFromSnapshot(snapshot);
    } else {
      return;
    }
  }
  _expression.baseParseSubscript.call(void 0, startTokenIndex, noCalls, stopState);
} exports.flowParseSubscript = flowParseSubscript;

 function flowStartParseNewArguments() {
  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    const snapshot = _base.state.snapshot();
    flowParseTypeParameterInstantiation();
    if (_base.state.error) {
      _base.state.restoreFromSnapshot(snapshot);
    }
  }
} exports.flowStartParseNewArguments = flowStartParseNewArguments;

// interfaces
 function flowTryParseStatement() {
  if (_index.match.call(void 0, _types.TokenType.name) && _base.state.contextualKeyword === _keywords.ContextualKeyword._interface) {
    const oldIsType = _index.pushTypeContext.call(void 0, 0);
    _index.next.call(void 0, );
    flowParseInterface();
    _index.popTypeContext.call(void 0, oldIsType);
    return true;
  } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._enum)) {
    flowParseEnumDeclaration();
    return true;
  }
  return false;
} exports.flowTryParseStatement = flowTryParseStatement;

 function flowTryParseExportDefaultExpression() {
  if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._enum)) {
    flowParseEnumDeclaration();
    return true;
  }
  return false;
} exports.flowTryParseExportDefaultExpression = flowTryParseExportDefaultExpression;

// declares, interfaces and type aliases
 function flowParseIdentifierStatement(contextualKeyword) {
  if (contextualKeyword === _keywords.ContextualKeyword._declare) {
    if (
      _index.match.call(void 0, _types.TokenType._class) ||
      _index.match.call(void 0, _types.TokenType.name) ||
      _index.match.call(void 0, _types.TokenType._function) ||
      _index.match.call(void 0, _types.TokenType._var) ||
      _index.match.call(void 0, _types.TokenType._export)
    ) {
      const oldIsType = _index.pushTypeContext.call(void 0, 1);
      flowParseDeclare();
      _index.popTypeContext.call(void 0, oldIsType);
    }
  } else if (_index.match.call(void 0, _types.TokenType.name)) {
    if (contextualKeyword === _keywords.ContextualKeyword._interface) {
      const oldIsType = _index.pushTypeContext.call(void 0, 1);
      flowParseInterface();
      _index.popTypeContext.call(void 0, oldIsType);
    } else if (contextualKeyword === _keywords.ContextualKeyword._type) {
      const oldIsType = _index.pushTypeContext.call(void 0, 1);
      flowParseTypeAlias();
      _index.popTypeContext.call(void 0, oldIsType);
    } else if (contextualKeyword === _keywords.ContextualKeyword._opaque) {
      const oldIsType = _index.pushTypeContext.call(void 0, 1);
      flowParseOpaqueType(false);
      _index.popTypeContext.call(void 0, oldIsType);
    }
  }
  _util.semicolon.call(void 0, );
} exports.flowParseIdentifierStatement = flowParseIdentifierStatement;

// export type
 function flowShouldParseExportDeclaration() {
  return (
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._type) ||
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._interface) ||
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque) ||
    _util.isContextual.call(void 0, _keywords.ContextualKeyword._enum)
  );
} exports.flowShouldParseExportDeclaration = flowShouldParseExportDeclaration;

 function flowShouldDisallowExportDefaultSpecifier() {
  return (
    _index.match.call(void 0, _types.TokenType.name) &&
    (_base.state.contextualKeyword === _keywords.ContextualKeyword._type ||
      _base.state.contextualKeyword === _keywords.ContextualKeyword._interface ||
      _base.state.contextualKeyword === _keywords.ContextualKeyword._opaque ||
      _base.state.contextualKeyword === _keywords.ContextualKeyword._enum)
  );
} exports.flowShouldDisallowExportDefaultSpecifier = flowShouldDisallowExportDefaultSpecifier;

 function flowParseExportDeclaration() {
  if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
    const oldIsType = _index.pushTypeContext.call(void 0, 1);
    _index.next.call(void 0, );

    if (_index.match.call(void 0, _types.TokenType.braceL)) {
      // export type { foo, bar };
      _statement.parseExportSpecifiers.call(void 0, );
      _statement.parseExportFrom.call(void 0, );
    } else {
      // export type Foo = Bar;
      flowParseTypeAlias();
    }
    _index.popTypeContext.call(void 0, oldIsType);
  } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._opaque)) {
    const oldIsType = _index.pushTypeContext.call(void 0, 1);
    _index.next.call(void 0, );
    // export opaque type Foo = Bar;
    flowParseOpaqueType(false);
    _index.popTypeContext.call(void 0, oldIsType);
  } else if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._interface)) {
    const oldIsType = _index.pushTypeContext.call(void 0, 1);
    _index.next.call(void 0, );
    flowParseInterface();
    _index.popTypeContext.call(void 0, oldIsType);
  } else {
    _statement.parseStatement.call(void 0, true);
  }
} exports.flowParseExportDeclaration = flowParseExportDeclaration;

 function flowShouldParseExportStar() {
  return _index.match.call(void 0, _types.TokenType.star) || (_util.isContextual.call(void 0, _keywords.ContextualKeyword._type) && _index.lookaheadType.call(void 0, ) === _types.TokenType.star);
} exports.flowShouldParseExportStar = flowShouldParseExportStar;

 function flowParseExportStar() {
  if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._type)) {
    const oldIsType = _index.pushTypeContext.call(void 0, 2);
    _statement.baseParseExportStar.call(void 0, );
    _index.popTypeContext.call(void 0, oldIsType);
  } else {
    _statement.baseParseExportStar.call(void 0, );
  }
} exports.flowParseExportStar = flowParseExportStar;

// parse a the super class type parameters and implements
 function flowAfterParseClassSuper(hasSuper) {
  if (hasSuper && _index.match.call(void 0, _types.TokenType.lessThan)) {
    flowParseTypeParameterInstantiation();
  }
  if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._implements)) {
    const oldIsType = _index.pushTypeContext.call(void 0, 0);
    _index.next.call(void 0, );
    _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._implements;
    do {
      flowParseRestrictedIdentifier();
      if (_index.match.call(void 0, _types.TokenType.lessThan)) {
        flowParseTypeParameterInstantiation();
      }
    } while (_index.eat.call(void 0, _types.TokenType.comma));
    _index.popTypeContext.call(void 0, oldIsType);
  }
} exports.flowAfterParseClassSuper = flowAfterParseClassSuper;

// parse type parameters for object method shorthand
 function flowStartParseObjPropValue() {
  // method shorthand
  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    flowParseTypeParameterDeclaration();
    if (!_index.match.call(void 0, _types.TokenType.parenL)) _util.unexpected.call(void 0, );
  }
} exports.flowStartParseObjPropValue = flowStartParseObjPropValue;

 function flowParseAssignableListItemTypes() {
  const oldIsType = _index.pushTypeContext.call(void 0, 0);
  _index.eat.call(void 0, _types.TokenType.question);
  if (_index.match.call(void 0, _types.TokenType.colon)) {
    flowParseTypeAnnotation();
  }
  _index.popTypeContext.call(void 0, oldIsType);
} exports.flowParseAssignableListItemTypes = flowParseAssignableListItemTypes;

// parse typeof and type imports
 function flowStartParseImportSpecifiers() {
  if (_index.match.call(void 0, _types.TokenType._typeof) || _util.isContextual.call(void 0, _keywords.ContextualKeyword._type)) {
    const lh = _index.lookaheadTypeAndKeyword.call(void 0, );
    if (isMaybeDefaultImport(lh) || lh.type === _types.TokenType.braceL || lh.type === _types.TokenType.star) {
      _index.next.call(void 0, );
    }
  }
} exports.flowStartParseImportSpecifiers = flowStartParseImportSpecifiers;

// parse import-type/typeof shorthand
 function flowParseImportSpecifier() {
  const isTypeKeyword =
    _base.state.contextualKeyword === _keywords.ContextualKeyword._type || _base.state.type === _types.TokenType._typeof;
  if (isTypeKeyword) {
    _index.next.call(void 0, );
  } else {
    _expression.parseIdentifier.call(void 0, );
  }

  if (_util.isContextual.call(void 0, _keywords.ContextualKeyword._as) && !_util.isLookaheadContextual.call(void 0, _keywords.ContextualKeyword._as)) {
    _expression.parseIdentifier.call(void 0, );
    if (isTypeKeyword && !_index.match.call(void 0, _types.TokenType.name) && !(_base.state.type & _types.TokenType.IS_KEYWORD)) {
      // `import {type as ,` or `import {type as }`
    } else {
      // `import {type as foo`
      _expression.parseIdentifier.call(void 0, );
    }
  } else {
    if (isTypeKeyword && (_index.match.call(void 0, _types.TokenType.name) || !!(_base.state.type & _types.TokenType.IS_KEYWORD))) {
      // `import {type foo`
      _expression.parseIdentifier.call(void 0, );
    }
    if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._as)) {
      _expression.parseIdentifier.call(void 0, );
    }
  }
} exports.flowParseImportSpecifier = flowParseImportSpecifier;

// parse function type parameters - function foo<T>() {}
 function flowStartParseFunctionParams() {
  // Originally this checked if the method is a getter/setter, but if it was, we'd crash soon
  // anyway, so don't try to propagate that information.
  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    const oldIsType = _index.pushTypeContext.call(void 0, 0);
    flowParseTypeParameterDeclaration();
    _index.popTypeContext.call(void 0, oldIsType);
  }
} exports.flowStartParseFunctionParams = flowStartParseFunctionParams;

// parse flow type annotations on variable declarator heads - let foo: string = bar
 function flowAfterParseVarHead() {
  if (_index.match.call(void 0, _types.TokenType.colon)) {
    flowParseTypeAnnotation();
  }
} exports.flowAfterParseVarHead = flowAfterParseVarHead;

// parse the return type of an async arrow function - let foo = (async (): number => {});
 function flowStartParseAsyncArrowFromCallExpression() {
  if (_index.match.call(void 0, _types.TokenType.colon)) {
    const oldNoAnonFunctionType = _base.state.noAnonFunctionType;
    _base.state.noAnonFunctionType = true;
    flowParseTypeAnnotation();
    _base.state.noAnonFunctionType = oldNoAnonFunctionType;
  }
} exports.flowStartParseAsyncArrowFromCallExpression = flowStartParseAsyncArrowFromCallExpression;

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
 function flowParseMaybeAssign(noIn, isWithinParens) {
  if (_index.match.call(void 0, _types.TokenType.lessThan)) {
    const snapshot = _base.state.snapshot();
    let wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
    if (_base.state.error) {
      _base.state.restoreFromSnapshot(snapshot);
      _base.state.type = _types.TokenType.typeParameterStart;
    } else {
      return wasArrow;
    }

    const oldIsType = _index.pushTypeContext.call(void 0, 0);
    flowParseTypeParameterDeclaration();
    _index.popTypeContext.call(void 0, oldIsType);
    wasArrow = _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
    if (wasArrow) {
      return true;
    }
    _util.unexpected.call(void 0, );
  }

  return _expression.baseParseMaybeAssign.call(void 0, noIn, isWithinParens);
} exports.flowParseMaybeAssign = flowParseMaybeAssign;

// handle return types for arrow functions
 function flowParseArrow() {
  if (_index.match.call(void 0, _types.TokenType.colon)) {
    const oldIsType = _index.pushTypeContext.call(void 0, 0);
    const snapshot = _base.state.snapshot();

    const oldNoAnonFunctionType = _base.state.noAnonFunctionType;
    _base.state.noAnonFunctionType = true;
    flowParseTypeAndPredicateInitialiser();
    _base.state.noAnonFunctionType = oldNoAnonFunctionType;

    if (_util.canInsertSemicolon.call(void 0, )) _util.unexpected.call(void 0, );
    if (!_index.match.call(void 0, _types.TokenType.arrow)) _util.unexpected.call(void 0, );

    if (_base.state.error) {
      _base.state.restoreFromSnapshot(snapshot);
    }
    _index.popTypeContext.call(void 0, oldIsType);
  }
  return _index.eat.call(void 0, _types.TokenType.arrow);
} exports.flowParseArrow = flowParseArrow;

 function flowParseSubscripts(startTokenIndex, noCalls = false) {
  if (
    _base.state.tokens[_base.state.tokens.length - 1].contextualKeyword === _keywords.ContextualKeyword._async &&
    _index.match.call(void 0, _types.TokenType.lessThan)
  ) {
    const snapshot = _base.state.snapshot();
    const wasArrow = parseAsyncArrowWithTypeParameters();
    if (wasArrow && !_base.state.error) {
      return;
    }
    _base.state.restoreFromSnapshot(snapshot);
  }

  _expression.baseParseSubscripts.call(void 0, startTokenIndex, noCalls);
} exports.flowParseSubscripts = flowParseSubscripts;

// Returns true if there was an arrow function here.
function parseAsyncArrowWithTypeParameters() {
  _base.state.scopeDepth++;
  const startTokenIndex = _base.state.tokens.length;
  _statement.parseFunctionParams.call(void 0, );
  if (!_expression.parseArrow.call(void 0, )) {
    return false;
  }
  _expression.parseArrowExpression.call(void 0, startTokenIndex);
  return true;
}

function flowParseEnumDeclaration() {
  _util.expectContextual.call(void 0, _keywords.ContextualKeyword._enum);
  _base.state.tokens[_base.state.tokens.length - 1].type = _types.TokenType._enum;
  _expression.parseIdentifier.call(void 0, );
  flowParseEnumBody();
}

function flowParseEnumBody() {
  if (_util.eatContextual.call(void 0, _keywords.ContextualKeyword._of)) {
    _index.next.call(void 0, );
  }
  _util.expect.call(void 0, _types.TokenType.braceL);
  flowParseEnumMembers();
  _util.expect.call(void 0, _types.TokenType.braceR);
}

function flowParseEnumMembers() {
  while (!_index.match.call(void 0, _types.TokenType.braceR) && !_base.state.error) {
    if (_index.eat.call(void 0, _types.TokenType.ellipsis)) {
      break;
    }
    flowParseEnumMember();
    if (!_index.match.call(void 0, _types.TokenType.braceR)) {
      _util.expect.call(void 0, _types.TokenType.comma);
    }
  }
}

function flowParseEnumMember() {
  _expression.parseIdentifier.call(void 0, );
  if (_index.eat.call(void 0, _types.TokenType.eq)) {
    // Flow enum values are always just one token (a string, number, or boolean literal).
    _index.next.call(void 0, );
  }
}
