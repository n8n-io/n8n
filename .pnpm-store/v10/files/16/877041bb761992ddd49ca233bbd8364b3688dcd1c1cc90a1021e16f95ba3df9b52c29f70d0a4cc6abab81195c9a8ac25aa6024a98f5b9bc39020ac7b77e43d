'use strict';

const parser = require('@babel/parser');

module.exports = class NodeSourceWalk {
  // We use global state to stop the recursive traversal of the AST
  #shouldStop = false;

  /**
   * @param  {Object} options - Options to configure parser
   * @param  {Object} options.parser - An object with a parse method that returns an AST
   */
  constructor(options = {}) {
    this.parser = options.parser || parser;

    if (options.parser) {
      // We don't want to send that down to the actual parser
      delete options.parser;
    }

    this.options = {
      plugins: [
        'jsx',
        'flow',
        'asyncGenerators',
        'classProperties',
        'doExpressions',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'functionBind',
        'functionSent',
        'nullishCoalescingOperator',
        'objectRestSpread',
        [
          'decorators', {
            decoratorsBeforeExport: true
          }
        ],
        'optionalChaining'
      ],
      allowHashBang: true,
      sourceType: 'module',
      ...options
    };
  }

  /**
   * @param  {String} src
   * @param  {Object} [options] - Parser options
   * @return {Object} The AST of the given src
   */
  parse(src, options = this.options) {
    // Keep around for consumers of parse that supply their own options
    if (options.allowHashBang === undefined) {
      options.allowHashBang = true;
    }

    return this.parser.parse(src, options);
  }

  /**
   * Adapted from substack/node-detective
   * Executes callback on a non-array AST node
   */
  traverse(node, callback) {
    if (this.#shouldStop) return;

    if (Array.isArray(node)) {
      for (const key of node) {
        if (isObject(key)) {
          // Mark that the node has been visited
          key.parent = node;
          this.traverse(key, callback);
        }
      }
    } else if (isObject(node)) {
      callback(node);

      for (const [key, value] of Object.entries(node)) {
        // Avoid visited nodes
        if (key === 'parent' || !value) continue;

        if (isObject(value)) {
          value.parent = node;
        }

        this.traverse(value, callback);
      }
    }
  }

  /**
   * Executes the passed callback for every traversed node of
   * the passed in src's ast
   *
   * @param {String|Object} src - The source code or AST to traverse
   * @param {Function} callback - Called for every node
   */
  walk(src, callback) {
    this.#shouldStop = false;

    const ast = isObject(src) ? src : this.parse(src);

    this.traverse(ast, callback);
  }

  moonwalk(node, callback) {
    this.#shouldStop = false;

    if (!isObject(node)) throw new Error('node must be an object');

    this.#reverseTraverse(node, callback);
  }

  /**
   * Halts further traversal of the AST
   */
  stopWalking() {
    this.#shouldStop = true;
  }

  #reverseTraverse(node, callback) {
    if (this.#shouldStop || !node.parent) return;

    if (Array.isArray(node.parent)) {
      for (const parent of node.parent) {
        callback(parent);
      }
    } else {
      callback(node.parent);
    }

    this.#reverseTraverse(node.parent, callback);
  }
};

function isObject(value) {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}
