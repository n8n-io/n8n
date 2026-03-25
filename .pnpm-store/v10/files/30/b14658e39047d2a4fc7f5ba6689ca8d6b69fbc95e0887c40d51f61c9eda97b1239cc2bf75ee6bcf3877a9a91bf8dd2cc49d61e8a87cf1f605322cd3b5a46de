'use strict';

const Walker = require('node-source-walk');
const types = require('ast-module-types');
const escodegen = require('escodegen');
const getModuleType = require('get-amd-module-type');

/**
 * @param  {String} src - the string content or AST of an AMD module
 * @param  {Object} [options]
 * @param  {Object} [options.skipLazyLoaded] - whether or not to omit inner (non-REM) required dependencies
 * @return {String[]} List of partials/dependencies referenced in the given file
 */
module.exports = function(src, options = {}) {
  if (src === undefined) throw new Error('src not given');
  if (src === '') return [];

  const walker = new Walker();
  let dependencies = [];

  walker.walk(src, node => {
    if (!types.isTopLevelRequire(node) && !types.isDefineAMD(node) && !types.isRequire(node)) {
      return;
    }

    const type = getModuleType.fromAST(node);

    if (!types.isTopLevelRequire(node) && types.isRequire(node) && type !== 'rem' && options.skipLazyLoaded) {
      return;
    }

    dependencies = [...dependencies, ...getDependencies(node, type, options)];
  });

  // Avoid duplicates
  return [...new Set(dependencies)];
};

/**
 * @param   {Object} node - AST node
 * @param   {String} type - sniffed type of the module
 * @param   {Object} options - detective configuration
 * @returns {String[]} A list of file dependencies or an empty list if the type is unsupported
 */
function getDependencies(node, type, options) {
  // Note: No need to handle nodeps since there won't be any dependencies
  switch (type) {
    case 'named': {
      const args = node.arguments || [];
      return [
        ...getElementValues(args[1]),
        ...(options.skipLazyLoaded ? [] : getLazyLoadedDeps(node))
      ];
    }

    case 'deps':
    case 'driver': {
      const args = node.arguments || [];
      return [
        ...getElementValues(args[0]),
        ...(options.skipLazyLoaded ? [] : getLazyLoadedDeps(node))
      ];
    }

    case 'factory':
    case 'rem': {
      // REM inner requires aren't really "lazy loaded", but the form is the same
      return getLazyLoadedDeps(node);
    }

    default:
      // nothing
  }

  return [];
}

/**
 * Looks for dynamic module loading
 *
 * @param  {AST} node
 * @return {String[]} List of dynamically required dependencies
 */
function getLazyLoadedDeps(node) {
  // Use logic from node-detective to find require calls
  const walker = new Walker();
  let dependencies = [];

  walker.traverse(node, innerNode => {
    if (types.isRequire(innerNode)) {
      const requireArgs = innerNode.arguments;

      if (requireArgs.length === 0) return;

      // Either require('x') or require(['x'])
      const deps = requireArgs[0];

      dependencies = deps.type === 'ArrayExpression' ?
        [...dependencies, ...getElementValues(deps)] :
        [...dependencies, getEvaluatedValue(deps)];
    }
  });

  return dependencies;
}

/**
 * @param {Object} nodeArguments
 * @returns {String[]} the literal values from the passed array
 */
function getElementValues(nodeArguments) {
  const elements = nodeArguments.elements || [];

  return elements.map(element => getEvaluatedValue(element)).filter(Boolean);
}

/**
 * @param {AST} node
 * @returns {String} the statement represented by AST node
 */
function getEvaluatedValue(node) {
  if (['Literal', 'StringLiteral'].includes(node.type)) return node.value;
  if (node.type === 'CallExpression') return '';

  return escodegen.generate(node);
}
