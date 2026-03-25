/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to replace single char character classes with
 * just that character.
 *
 * [\d] -> \d, [^\w] -> \W
 */

module.exports = {
  CharacterClass: function CharacterClass(path) {
    var node = path.node;


    if (node.expressions.length !== 1 || !hasAppropriateSiblings(path) || !isAppropriateChar(node.expressions[0])) {
      return;
    }

    var _node$expressions$ = node.expressions[0],
        value = _node$expressions$.value,
        kind = _node$expressions$.kind,
        escaped = _node$expressions$.escaped;


    if (node.negative) {
      // For negative can extract only meta chars like [^\w] -> \W
      // cannot do for [^a] -> a (wrong).
      if (!isMeta(value)) {
        return;
      }

      value = getInverseMeta(value);
    }

    path.replace({
      type: 'Char',
      value: value,
      kind: kind,
      escaped: escaped || shouldEscape(value)
    });
  }
};

function isAppropriateChar(node) {
  return node.type === 'Char' &&
  // We don't extract [\b] (backspace) since \b has different
  // semantics (word boundary).
  node.value !== '\\b';
}

function isMeta(value) {
  return (/^\\[dwsDWS]$/.test(value)
  );
}

function getInverseMeta(value) {
  return (/[dws]/.test(value) ? value.toUpperCase() : value.toLowerCase()
  );
}

function hasAppropriateSiblings(path) {
  var parent = path.parent,
      index = path.index;


  if (parent.type !== 'Alternative') {
    return true;
  }

  var previousNode = parent.expressions[index - 1];
  if (previousNode == null) {
    return true;
  }

  // Don't optimized \1[0] to \10
  if (previousNode.type === 'Backreference' && previousNode.kind === 'number') {
    return false;
  }

  // Don't optimized \2[0] to \20
  if (previousNode.type === 'Char' && previousNode.kind === 'decimal') {
    return false;
  }

  return true;
}

// Note: \{ and \} are always preserved to avoid `a[{]2[}]` turning
// into `a{2}`.
function shouldEscape(value) {
  return (/[*[()+?$./{}|]/.test(value)
  );
}