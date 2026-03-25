"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArrowFunctionExpression = ArrowFunctionExpression;
exports.FunctionDeclaration = exports.FunctionExpression = FunctionExpression;
exports._functionHead = _functionHead;
exports._methodHead = _methodHead;
exports._param = _param;
exports._parameters = _parameters;
exports._params = _params;
exports._predicate = _predicate;
exports._shouldPrintArrowParamsParens = _shouldPrintArrowParamsParens;
var _t = require("@babel/types");
var _index = require("../node/index.js");
const {
  isIdentifier
} = _t;
function _params(node, idNode, parentNode) {
  this.print(node.typeParameters);
  const nameInfo = _getFuncIdName.call(this, idNode, parentNode);
  if (nameInfo) {
    this.sourceIdentifierName(nameInfo.name, nameInfo.pos);
  }
  this.tokenChar(40);
  this._parameters(node.params, ")");
  const noLineTerminator = node.type === "ArrowFunctionExpression";
  this.print(node.returnType, noLineTerminator);
  this._noLineTerminator = noLineTerminator;
}
function _parameters(parameters, endToken) {
  const exit = this.enterDelimited();
  const trailingComma = this.shouldPrintTrailingComma(endToken);
  const paramLength = parameters.length;
  for (let i = 0; i < paramLength; i++) {
    this._param(parameters[i]);
    if (trailingComma || i < paramLength - 1) {
      this.token(",", null, i);
      this.space();
    }
  }
  this.token(endToken);
  exit();
}
function _param(parameter) {
  this.printJoin(parameter.decorators);
  this.print(parameter);
  if (parameter.optional) {
    this.tokenChar(63);
  }
  this.print(parameter.typeAnnotation);
}
function _methodHead(node) {
  const kind = node.kind;
  const key = node.key;
  if (kind === "get" || kind === "set") {
    this.word(kind);
    this.space();
  }
  if (node.async) {
    this.word("async", true);
    this.space();
  }
  if (kind === "method" || kind === "init") {
    if (node.generator) {
      this.tokenChar(42);
    }
  }
  if (node.computed) {
    this.tokenChar(91);
    this.print(key);
    this.tokenChar(93);
  } else {
    this.print(key);
  }
  if (node.optional) {
    this.tokenChar(63);
  }
  this._params(node, node.computed && node.key.type !== "StringLiteral" ? undefined : node.key, undefined);
}
function _predicate(node, noLineTerminatorAfter) {
  if (node.predicate) {
    if (!node.returnType) {
      this.tokenChar(58);
    }
    this.space();
    this.print(node.predicate, noLineTerminatorAfter);
  }
}
function _functionHead(node, parent) {
  if (node.async) {
    this.word("async");
    if (!this.format.preserveFormat) {
      this._endsWithInnerRaw = false;
    }
    this.space();
  }
  this.word("function");
  if (node.generator) {
    if (!this.format.preserveFormat) {
      this._endsWithInnerRaw = false;
    }
    this.tokenChar(42);
  }
  this.space();
  if (node.id) {
    this.print(node.id);
  }
  this._params(node, node.id, parent);
  if (node.type !== "TSDeclareFunction") {
    this._predicate(node);
  }
}
function FunctionExpression(node, parent) {
  this._functionHead(node, parent);
  this.space();
  this.print(node.body);
}
function ArrowFunctionExpression(node, parent) {
  if (node.async) {
    this.word("async", true);
    this.space();
  }
  if (this._shouldPrintArrowParamsParens(node)) {
    this._params(node, undefined, parent);
  } else {
    this.print(node.params[0], true);
  }
  this._predicate(node, true);
  this.space();
  this.printInnerComments();
  this.token("=>");
  this.space();
  this.tokenContext |= _index.TokenContext.arrowBody;
  this.print(node.body);
}
function _shouldPrintArrowParamsParens(node) {
  var _firstParam$leadingCo, _firstParam$trailingC;
  if (node.params.length !== 1) return true;
  if (node.typeParameters || node.returnType || node.predicate) {
    return true;
  }
  const firstParam = node.params[0];
  if (!isIdentifier(firstParam) || firstParam.typeAnnotation || firstParam.optional || (_firstParam$leadingCo = firstParam.leadingComments) != null && _firstParam$leadingCo.length || (_firstParam$trailingC = firstParam.trailingComments) != null && _firstParam$trailingC.length) {
    return true;
  }
  if (this.tokenMap) {
    if (node.loc == null) return true;
    if (this.tokenMap.findMatching(node, "(") !== null) return true;
    const arrowToken = this.tokenMap.findMatching(node, "=>");
    if ((arrowToken == null ? void 0 : arrowToken.loc) == null) return true;
    return arrowToken.loc.start.line !== node.loc.start.line;
  }
  if (this.format.retainLines) return true;
  return false;
}
function _getFuncIdName(idNode, parent) {
  let id = idNode;
  if (!id && parent) {
    const parentType = parent.type;
    if (parentType === "VariableDeclarator") {
      id = parent.id;
    } else if (parentType === "AssignmentExpression" || parentType === "AssignmentPattern") {
      id = parent.left;
    } else if (parentType === "ObjectProperty" || parentType === "ClassProperty") {
      if (!parent.computed || parent.key.type === "StringLiteral") {
        id = parent.key;
      }
    } else if (parentType === "ClassPrivateProperty" || parentType === "ClassAccessorProperty") {
      id = parent.key;
    }
  }
  if (!id) return;
  let nameInfo;
  if (id.type === "Identifier") {
    var _id$loc, _id$loc2;
    nameInfo = {
      pos: (_id$loc = id.loc) == null ? void 0 : _id$loc.start,
      name: ((_id$loc2 = id.loc) == null ? void 0 : _id$loc2.identifierName) || id.name
    };
  } else if (id.type === "PrivateName") {
    var _id$loc3;
    nameInfo = {
      pos: (_id$loc3 = id.loc) == null ? void 0 : _id$loc3.start,
      name: "#" + id.id.name
    };
  } else if (id.type === "StringLiteral") {
    var _id$loc4;
    nameInfo = {
      pos: (_id$loc4 = id.loc) == null ? void 0 : _id$loc4.start,
      name: id.value
    };
  }
  return nameInfo;
}

//# sourceMappingURL=methods.js.map
