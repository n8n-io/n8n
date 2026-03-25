/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * Helper `gen` function calls node type handler.
 */

function gen(node) {
  return node ? generator[node.type](node) : '';
}

/**
 * AST handler.
 */
var generator = {
  RegExp: function RegExp(node) {
    return '/' + gen(node.body) + '/' + node.flags;
  },
  Alternative: function Alternative(node) {
    return (node.expressions || []).map(gen).join('');
  },
  Disjunction: function Disjunction(node) {
    return gen(node.left) + '|' + gen(node.right);
  },
  Group: function Group(node) {
    var expression = gen(node.expression);

    if (node.capturing) {
      // A named group.
      if (node.name) {
        return '(?<' + (node.nameRaw || node.name) + '>' + expression + ')';
      }

      return '(' + expression + ')';
    }

    return '(?:' + expression + ')';
  },
  Backreference: function Backreference(node) {
    switch (node.kind) {
      case 'number':
        return '\\' + node.reference;
      case 'name':
        return '\\k<' + (node.referenceRaw || node.reference) + '>';
      default:
        throw new TypeError('Unknown Backreference kind: ' + node.kind);
    }
  },
  Assertion: function Assertion(node) {
    switch (node.kind) {
      case '^':
      case '$':
      case '\\b':
      case '\\B':
        return node.kind;

      case 'Lookahead':
        {
          var assertion = gen(node.assertion);

          if (node.negative) {
            return '(?!' + assertion + ')';
          }

          return '(?=' + assertion + ')';
        }

      case 'Lookbehind':
        {
          var _assertion = gen(node.assertion);

          if (node.negative) {
            return '(?<!' + _assertion + ')';
          }

          return '(?<=' + _assertion + ')';
        }

      default:
        throw new TypeError('Unknown Assertion kind: ' + node.kind);
    }
  },
  CharacterClass: function CharacterClass(node) {
    var expressions = node.expressions.map(gen).join('');

    if (node.negative) {
      return '[^' + expressions + ']';
    }

    return '[' + expressions + ']';
  },
  ClassRange: function ClassRange(node) {
    return gen(node.from) + '-' + gen(node.to);
  },
  Repetition: function Repetition(node) {
    return '' + gen(node.expression) + gen(node.quantifier);
  },
  Quantifier: function Quantifier(node) {
    var quantifier = void 0;
    var greedy = node.greedy ? '' : '?';

    switch (node.kind) {
      case '+':
      case '?':
      case '*':
        quantifier = node.kind;
        break;
      case 'Range':
        // Exact: {1}
        if (node.from === node.to) {
          quantifier = '{' + node.from + '}';
        }
        // Open: {1,}
        else if (!node.to) {
            quantifier = '{' + node.from + ',}';
          }
          // Closed: {1,3}
          else {
              quantifier = '{' + node.from + ',' + node.to + '}';
            }
        break;
      default:
        throw new TypeError('Unknown Quantifier kind: ' + node.kind);
    }

    return '' + quantifier + greedy;
  },
  Char: function Char(node) {
    var value = node.value;

    switch (node.kind) {
      case 'simple':
        {
          if (node.escaped) {
            return '\\' + value;
          }
          return value;
        }

      case 'hex':
      case 'unicode':
      case 'oct':
      case 'decimal':
      case 'control':
      case 'meta':
        return value;

      default:
        throw new TypeError('Unknown Char kind: ' + node.kind);
    }
  },
  UnicodeProperty: function UnicodeProperty(node) {
    var escapeChar = node.negative ? 'P' : 'p';
    var namePart = void 0;

    if (!node.shorthand && !node.binary) {
      namePart = node.name + '=';
    } else {
      namePart = '';
    }

    return '\\' + escapeChar + '{' + namePart + node.value + '}';
  }
};

module.exports = {
  /**
   * Generates a regexp string from an AST.
   *
   * @param Object ast - an AST node
   */
  generate: gen
};