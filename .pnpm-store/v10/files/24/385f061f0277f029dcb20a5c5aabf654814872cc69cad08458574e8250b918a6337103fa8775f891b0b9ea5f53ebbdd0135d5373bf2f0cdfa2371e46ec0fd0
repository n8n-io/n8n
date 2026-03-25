'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var helperPluginUtils = require('@babel/helper-plugin-utils');
var core = require('@babel/core');

function needsWrapping(node) {
  if (core.types.isLiteral(node) && !core.types.isTemplateLiteral(node)) {
    return false;
  }
  if (core.types.isCallExpression(node) || core.types.isOptionalCallExpression(node) || core.types.isNewExpression(node)) {
    return needsWrapping(node.callee) || node.arguments.some(needsWrapping);
  }
  if (core.types.isTemplateLiteral(node)) {
    return node.expressions.some(needsWrapping);
  }
  if (core.types.isTaggedTemplateExpression(node)) {
    return needsWrapping(node.tag) || needsWrapping(node.quasi);
  }
  if (core.types.isArrayExpression(node)) {
    return node.elements.some(needsWrapping);
  }
  if (core.types.isObjectExpression(node)) {
    return node.properties.some(prop => {
      if (core.types.isObjectProperty(prop)) {
        return needsWrapping(prop.value) || prop.computed && needsWrapping(prop.key);
      }
      if (core.types.isObjectMethod(prop)) {
        return false;
      }
      return false;
    });
  }
  if (core.types.isMemberExpression(node) || core.types.isOptionalMemberExpression(node)) {
    return needsWrapping(node.object) || node.computed && needsWrapping(node.property);
  }
  if (core.types.isFunctionExpression(node) || core.types.isArrowFunctionExpression(node) || core.types.isClassExpression(node)) {
    return false;
  }
  if (core.types.isThisExpression(node)) {
    return false;
  }
  if (core.types.isSequenceExpression(node)) {
    return node.expressions.some(needsWrapping);
  }
  return true;
}
function wrapInitializer(path) {
  const {
    value
  } = path.node;
  if (value && needsWrapping(value)) {
    path.node.value = core.types.callExpression(core.types.arrowFunctionExpression([], value), []);
  }
}
var index = helperPluginUtils.declare(api => {
  api.assertVersion("^7.16.0");
  return {
    name: "plugin-bugfix-safari-class-field-initializer-scope",
    visitor: {
      ClassProperty(path) {
        wrapInitializer(path);
      },
      ClassPrivateProperty(path) {
        wrapInitializer(path);
      }
    }
  };
});

exports.default = index;
//# sourceMappingURL=index.js.map
