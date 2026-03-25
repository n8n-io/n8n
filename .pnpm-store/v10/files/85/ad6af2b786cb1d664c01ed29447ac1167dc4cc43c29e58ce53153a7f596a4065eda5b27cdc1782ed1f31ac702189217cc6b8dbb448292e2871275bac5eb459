'use strict';

const { debuglog } = require('util');
const Walker = require('node-source-walk');
const sass = require('gonzales-pe');

const debug = debuglog('detective-scss');

/**
 * Extract the @import statements from a given scss file's content
 *
 * @param  {String} content
 * @param  {Object} options
 * @param  {Boolean} options.url - detect any url() references to images, fonts, etc.
 * @return {String[]}
 */
module.exports = function detective(content, options = {}) {
  if (content === undefined) throw new Error('content not given');
  if (typeof content !== 'string') throw new Error('content is not a string');

  let ast = {};

  try {
    debug('content: %s', content);
    ast = sass.parse(content, { syntax: 'scss' });
  } catch (error) {
    debug('parse error: %s', error.message);
  }

  detective.ast = ast;

  const walker = new Walker();
  let dependencies = [];

  walker.walk(ast, node => {
    if (isImportStatement(node)) {
      dependencies = [...dependencies, ...extractDependencies(node, ['string', 'ident'])];
      return;
    }

    if (options?.url && node.type === 'uri') {
      dependencies = [...dependencies, ...extractDependencies(node, ['string', 'ident', 'raw'])];
    }
  });

  return dependencies;
};

function isImportStatement(node) {
  if (!node || node.type !== 'atrule') return false;
  if (node.content.length === 0 || node.content[0].type !== 'atkeyword') return false;

  const atKeyword = node.content[0];

  if (atKeyword.content.length === 0) return false;

  return ['ident', 'import'].includes(atKeyword.content[0].type);
}

function extractDependencies(importStatementNode, innerNodeTypes) {
  return importStatementNode.content
    .filter(innerNode => innerNodeTypes.includes(innerNode.type))
    .map(identifierNode => identifierNode.content.replaceAll(/["']/g, ''));
}
