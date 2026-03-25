"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TokenContext = void 0;
exports.isLastChild = isLastChild;
exports.needsParens = needsParens;
exports.needsWhitespace = needsWhitespace;
exports.needsWhitespaceAfter = needsWhitespaceAfter;
exports.needsWhitespaceBefore = needsWhitespaceBefore;
var whitespace = require("./whitespace.js");
var parens = require("./parentheses.js");
var _t = require("@babel/types");
const {
  FLIPPED_ALIAS_KEYS,
  VISITOR_KEYS,
  isCallExpression,
  isDecorator,
  isExpressionStatement,
  isMemberExpression,
  isNewExpression,
  isParenthesizedExpression
} = _t;
const TokenContext = exports.TokenContext = {
  normal: 0,
  expressionStatement: 1,
  arrowBody: 2,
  exportDefault: 4,
  arrowFlowReturnType: 8,
  forInitHead: 16,
  forInHead: 32,
  forOfHead: 64,
  forInOrInitHeadAccumulate: 128,
  forInOrInitHeadAccumulatePassThroughMask: 128
};
function expandAliases(obj) {
  const map = new Map();
  function add(type, func) {
    const fn = map.get(type);
    map.set(type, fn ? function (node, parent, stack, getRawIdentifier) {
      var _fn;
      return (_fn = fn(node, parent, stack, getRawIdentifier)) != null ? _fn : func(node, parent, stack, getRawIdentifier);
    } : func);
  }
  for (const type of Object.keys(obj)) {
    const aliases = FLIPPED_ALIAS_KEYS[type];
    if (aliases) {
      for (const alias of aliases) {
        add(alias, obj[type]);
      }
    } else {
      add(type, obj[type]);
    }
  }
  return map;
}
const expandedParens = expandAliases(parens);
const expandedWhitespaceNodes = expandAliases(whitespace.nodes);
function isOrHasCallExpression(node) {
  if (isCallExpression(node)) {
    return true;
  }
  return isMemberExpression(node) && isOrHasCallExpression(node.object);
}
function needsWhitespace(node, parent, type) {
  var _expandedWhitespaceNo;
  if (!node) return false;
  if (isExpressionStatement(node)) {
    node = node.expression;
  }
  const flag = (_expandedWhitespaceNo = expandedWhitespaceNodes.get(node.type)) == null ? void 0 : _expandedWhitespaceNo(node, parent);
  if (typeof flag === "number") {
    return (flag & type) !== 0;
  }
  return false;
}
function needsWhitespaceBefore(node, parent) {
  return needsWhitespace(node, parent, 1);
}
function needsWhitespaceAfter(node, parent) {
  return needsWhitespace(node, parent, 2);
}
function needsParens(node, parent, tokenContext, getRawIdentifier) {
  var _expandedParens$get;
  if (!parent) return false;
  if (isNewExpression(parent) && parent.callee === node) {
    if (isOrHasCallExpression(node)) return true;
  }
  if (isDecorator(parent)) {
    return !isDecoratorMemberExpression(node) && !(isCallExpression(node) && isDecoratorMemberExpression(node.callee)) && !isParenthesizedExpression(node);
  }
  return ((_expandedParens$get = expandedParens.get(node.type)) == null ? void 0 : _expandedParens$get(node, parent, tokenContext, getRawIdentifier)) || false;
}
function isDecoratorMemberExpression(node) {
  switch (node.type) {
    case "Identifier":
      return true;
    case "MemberExpression":
      return !node.computed && node.property.type === "Identifier" && isDecoratorMemberExpression(node.object);
    default:
      return false;
  }
}
function isLastChild(parent, child) {
  const visitorKeys = VISITOR_KEYS[parent.type];
  for (let i = visitorKeys.length - 1; i >= 0; i--) {
    const val = parent[visitorKeys[i]];
    if (val === child) {
      return true;
    } else if (Array.isArray(val)) {
      let j = val.length - 1;
      while (j >= 0 && val[j] === null) j--;
      return j >= 0 && val[j] === child;
    } else if (val) {
      return false;
    }
  }
  return false;
}

//# sourceMappingURL=index.js.map
