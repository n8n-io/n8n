"use strict";

// Add an empty line before a node. Mutates the node.
module.exports = function addEmptyLineBefore(
  node /*: postcss$node*/,
  newline /*: '\n' | '\r\n'*/
) /*: postcss$node*/ {
  if (!/\r?\n/.test(node.raws.before)) {
    node.raws.before = newline.repeat(2) + node.raws.before;
  } else {
    node.raws.before = node.raws.before.replace(/(\r?\n)/, `${newline}$1`);
  }

  return node;
};
