"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.nodes = void 0;
var _t = require("@babel/types");
const {
  FLIPPED_ALIAS_KEYS,
  isArrayExpression,
  isAssignmentExpression,
  isBinary,
  isBlockStatement,
  isCallExpression,
  isFunction,
  isIdentifier,
  isLiteral,
  isMemberExpression,
  isObjectExpression,
  isOptionalCallExpression,
  isOptionalMemberExpression,
  isStringLiteral
} = _t;
function crawlInternal(node, state) {
  if (!node) return state;
  if (isMemberExpression(node) || isOptionalMemberExpression(node)) {
    crawlInternal(node.object, state);
    if (node.computed) crawlInternal(node.property, state);
  } else if (isBinary(node) || isAssignmentExpression(node)) {
    crawlInternal(node.left, state);
    crawlInternal(node.right, state);
  } else if (isCallExpression(node) || isOptionalCallExpression(node)) {
    state.hasCall = true;
    crawlInternal(node.callee, state);
  } else if (isFunction(node)) {
    state.hasFunction = true;
  } else if (isIdentifier(node)) {
    state.hasHelper = state.hasHelper || node.callee && isHelper(node.callee);
  }
  return state;
}
function crawl(node) {
  return crawlInternal(node, {
    hasCall: false,
    hasFunction: false,
    hasHelper: false
  });
}
function isHelper(node) {
  if (!node) return false;
  if (isMemberExpression(node)) {
    return isHelper(node.object) || isHelper(node.property);
  } else if (isIdentifier(node)) {
    return node.name === "require" || node.name.charCodeAt(0) === 95;
  } else if (isCallExpression(node)) {
    return isHelper(node.callee);
  } else if (isBinary(node) || isAssignmentExpression(node)) {
    return isIdentifier(node.left) && isHelper(node.left) || isHelper(node.right);
  } else {
    return false;
  }
}
function isType(node) {
  return isLiteral(node) || isObjectExpression(node) || isArrayExpression(node) || isIdentifier(node) || isMemberExpression(node);
}
const nodes = exports.nodes = {
  AssignmentExpression(node) {
    const state = crawl(node.right);
    if (state.hasCall && state.hasHelper || state.hasFunction) {
      return state.hasFunction ? 1 | 2 : 2;
    }
  },
  SwitchCase(node, parent) {
    return (!!node.consequent.length || parent.cases[0] === node ? 1 : 0) | (!node.consequent.length && parent.cases[parent.cases.length - 1] === node ? 2 : 0);
  },
  LogicalExpression(node) {
    if (isFunction(node.left) || isFunction(node.right)) {
      return 2;
    }
  },
  Literal(node) {
    if (isStringLiteral(node) && node.value === "use strict") {
      return 2;
    }
  },
  CallExpression(node) {
    if (isFunction(node.callee) || isHelper(node)) {
      return 1 | 2;
    }
  },
  OptionalCallExpression(node) {
    if (isFunction(node.callee)) {
      return 1 | 2;
    }
  },
  VariableDeclaration(node) {
    for (let i = 0; i < node.declarations.length; i++) {
      const declar = node.declarations[i];
      let enabled = isHelper(declar.id) && !isType(declar.init);
      if (!enabled && declar.init) {
        const state = crawl(declar.init);
        enabled = isHelper(declar.init) && state.hasCall || state.hasFunction;
      }
      if (enabled) {
        return 1 | 2;
      }
    }
  },
  IfStatement(node) {
    if (isBlockStatement(node.consequent)) {
      return 1 | 2;
    }
  }
};
nodes.ObjectProperty = nodes.ObjectTypeProperty = nodes.ObjectMethod = function (node, parent) {
  if (parent.properties[0] === node) {
    return 1;
  }
};
nodes.ObjectTypeCallProperty = function (node, parent) {
  var _parent$properties;
  if (parent.callProperties[0] === node && !((_parent$properties = parent.properties) != null && _parent$properties.length)) {
    return 1;
  }
};
nodes.ObjectTypeIndexer = function (node, parent) {
  var _parent$properties2, _parent$callPropertie;
  if (parent.indexers[0] === node && !((_parent$properties2 = parent.properties) != null && _parent$properties2.length) && !((_parent$callPropertie = parent.callProperties) != null && _parent$callPropertie.length)) {
    return 1;
  }
};
nodes.ObjectTypeInternalSlot = function (node, parent) {
  var _parent$properties3, _parent$callPropertie2, _parent$indexers;
  if (parent.internalSlots[0] === node && !((_parent$properties3 = parent.properties) != null && _parent$properties3.length) && !((_parent$callPropertie2 = parent.callProperties) != null && _parent$callPropertie2.length) && !((_parent$indexers = parent.indexers) != null && _parent$indexers.length)) {
    return 1;
  }
};
[["Function", true], ["Class", true], ["Loop", true], ["LabeledStatement", true], ["SwitchStatement", true], ["TryStatement", true]].forEach(function ([type, amounts]) {
  [type].concat(FLIPPED_ALIAS_KEYS[type] || []).forEach(function (type) {
    const ret = amounts ? 1 | 2 : 0;
    nodes[type] = () => ret;
  });
});

//# sourceMappingURL=whitespace.js.map
