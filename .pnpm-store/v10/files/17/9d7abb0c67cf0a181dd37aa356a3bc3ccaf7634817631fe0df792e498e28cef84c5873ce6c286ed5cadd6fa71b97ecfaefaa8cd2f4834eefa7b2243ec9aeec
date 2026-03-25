'use strict';
/*
  Module Dependencies
*/
var DomUtils = require('htmlparser2').DomUtils;
var parseWithHtmlparser2 = require('./parsers/htmlparser2').parse;
var parseWithParse5 = require('./parsers/parse5').parse;
var Document = require('domhandler').Document;

/*
  Parser
*/
exports = module.exports = function parse(content, options, isDocument) {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(content)) {
    content = content.toString();
  }

  if (typeof content === 'string') {
    return options.xmlMode || options._useHtmlParser2
      ? parseWithHtmlparser2(content, options)
      : parseWithParse5(content, options, isDocument);
  }

  if (
    typeof content === 'object' &&
    content != null &&
    content.type === 'root'
  ) {
    // If `content` is already a root, just return it
    return content;
  }

  // Add conent to new root element
  var root = new Document(content);

  // Update the DOM using the root
  exports.update(content, root);

  return root;
};

/**
 * Update the dom structure, for one changed layer.
 *
 * @param {Node[] | Node} arr - The new children.
 * @param {NodeWithChildren} parent - The new parent.
 * @returns {Node} The parent node.
 */
exports.update = function (arr, parent) {
  // normalize
  if (!Array.isArray(arr)) arr = [arr];

  // Update parent
  if (parent) {
    parent.children = arr;
  } else {
    parent = null;
  }

  // Update neighbors
  for (var i = 0; i < arr.length; i++) {
    var node = arr[i];

    // Cleanly remove existing nodes from their previous structures.
    if (node.parent && node.parent.children !== arr) {
      DomUtils.removeElement(node);
    }

    if (parent) {
      node.prev = arr[i - 1] || null;
      node.next = arr[i + 1] || null;
    } else {
      node.prev = node.next = null;
    }

    node.parent = parent;
  }

  return parent;
};
