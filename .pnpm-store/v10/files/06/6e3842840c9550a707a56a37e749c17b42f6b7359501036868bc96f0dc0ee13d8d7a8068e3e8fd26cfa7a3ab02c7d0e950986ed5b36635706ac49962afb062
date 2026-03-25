// @flow

function last(...a: Array<number>): number {
  return a[a.length - 1]
}

function negation(a: number): number {
  return -a
}

function addition(a: number, b: number): number {
  return a + b
}

function subtraction(a: number, b: number): number {
  return a - b
}

function multiplication(a: number, b: number): number {
  return a * b
}

function division(a: number, b: number): number {
  return a / b
}

function max(...a: Array<number>): number {
  return Math.max(...a)
}

function min(...a: Array<number>): number {
  return Math.min(...a)
}

function comma(...a: Array<number | string>): Array<number | string> {
  return Array.of(...a)
}

const defaultSymbols = {
  symbols: {
    '*': {
      infix: {
        symbol: '*',
        f: multiplication,
        notation: 'infix',
        precedence: 4,
        rightToLeft: 0,
        argCount: 2,
      },
      symbol: '*',
      regSymbol: '\\*',
    },
    '/': {
      infix: {
        symbol: '/',
        f: division,
        notation: 'infix',
        precedence: 4,
        rightToLeft: 0,
        argCount: 2,
      },
      symbol: '/',
      regSymbol: '/',
    },
    '+': {
      infix: {
        symbol: '+',
        f: addition,
        notation: 'infix',
        precedence: 2,
        rightToLeft: 0,
        argCount: 2,
      },
      prefix: {
        symbol: '+',
        f: last,
        notation: 'prefix',
        precedence: 3,
        rightToLeft: 0,
        argCount: 1,
      },
      symbol: '+',
      regSymbol: '\\+',
    },
    '-': {
      infix: {
        symbol: '-',
        f: subtraction,
        notation: 'infix',
        precedence: 2,
        rightToLeft: 0,
        argCount: 2,
      },
      prefix: {
        symbol: '-',
        f: negation,
        notation: 'prefix',
        precedence: 3,
        rightToLeft: 0,
        argCount: 1,
      },
      symbol: '-',
      regSymbol: '-',
    },
    ',': {
      infix: {
        symbol: ',',
        f: comma,
        notation: 'infix',
        precedence: 1,
        rightToLeft: 0,
        argCount: 2,
      },
      symbol: ',',
      regSymbol: ',',
    },
    '(': {
      prefix: {
        symbol: '(',
        f: last,
        notation: 'prefix',
        precedence: 0,
        rightToLeft: 0,
        argCount: 1,
      },
      symbol: '(',
      regSymbol: '\\(',
    },
    ')': {
      postfix: {
        symbol: ')',
        f: undefined,
        notation: 'postfix',
        precedence: 0,
        rightToLeft: 0,
        argCount: 1,
      },
      symbol: ')',
      regSymbol: '\\)',
    },
    min: {
      func: {
        symbol: 'min',
        f: min,
        notation: 'func',
        precedence: 0,
        rightToLeft: 0,
        argCount: 1,
      },
      symbol: 'min',
      regSymbol: 'min\\b',
    },
    max: {
      func: {
        symbol: 'max',
        f: max,
        notation: 'func',
        precedence: 0,
        rightToLeft: 0,
        argCount: 1,
      },
      symbol: 'max',
      regSymbol: 'max\\b',
    },
  },
}

export default defaultSymbols
