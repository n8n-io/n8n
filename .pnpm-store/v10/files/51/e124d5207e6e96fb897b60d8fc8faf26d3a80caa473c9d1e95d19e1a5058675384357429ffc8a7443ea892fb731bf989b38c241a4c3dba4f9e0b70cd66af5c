"use strict";

exports.__esModule = true;
exports["default"] = void 0;

function factorial(a) {
  if (a % 1 || !(+a >= 0)) return NaN;
  if (a > 170) return Infinity;else if (a === 0) return 1;else {
    return a * factorial(a - 1);
  }
}

function power(a, b) {
  return Math.pow(a, b);
}

function sqrt(a) {
  return Math.sqrt(a);
}

var exponentialSymbols = {
  symbols: {
    '!': {
      postfix: {
        symbol: '!',
        f: factorial,
        notation: 'postfix',
        precedence: 6,
        rightToLeft: 0,
        argCount: 1
      },
      symbol: '!',
      regSymbol: '!'
    },
    '^': {
      infix: {
        symbol: '^',
        f: power,
        notation: 'infix',
        precedence: 5,
        rightToLeft: 1,
        argCount: 2
      },
      symbol: '^',
      regSymbol: '\\^'
    },
    sqrt: {
      func: {
        symbol: 'sqrt',
        f: sqrt,
        notation: 'func',
        precedence: 0,
        rightToLeft: 0,
        argCount: 1
      },
      symbol: 'sqrt',
      regSymbol: 'sqrt\\b'
    }
  }
};
var _default = exponentialSymbols;
exports["default"] = _default;
module.exports = exports.default;