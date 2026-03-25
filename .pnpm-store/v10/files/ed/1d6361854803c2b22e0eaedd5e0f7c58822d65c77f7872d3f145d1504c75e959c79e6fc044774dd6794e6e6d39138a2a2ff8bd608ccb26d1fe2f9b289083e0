'use strict';

const types = require('ast-module-types');
const Walker = require('node-source-walk');

/**
 * @param  {String|Object} content - A file's string content or its AST
 * @return {String[]} The file's dependencies
 */
module.exports = function(content) {
  const walker = new Walker();
  const dependencies = [];

  walker.walk(content, node => {
    if (!types.isRequire(node) || !node.arguments || node.arguments.length === 0) {
      return;
    }

    if (types.isPlainRequire(node)) {
      const result = extractDependencyFromRequire(node);
      if (result) {
        dependencies.push(result);
      }
    } else if (types.isMainScopedRequire(node)) {
      dependencies.push(extractDependencyFromMainRequire(node));
    }
  });

  return dependencies;
};

function extractDependencyFromRequire(node) {
  if (node.arguments[0].type === 'Literal' || node.arguments[0].type === 'StringLiteral') {
    return node.arguments[0].value;
  }

  if (node.arguments[0].type === 'TemplateLiteral') {
    return node.arguments[0].quasis[0].value.raw;
  }
}

function extractDependencyFromMainRequire(node) {
  return node.arguments[0].value;
}
