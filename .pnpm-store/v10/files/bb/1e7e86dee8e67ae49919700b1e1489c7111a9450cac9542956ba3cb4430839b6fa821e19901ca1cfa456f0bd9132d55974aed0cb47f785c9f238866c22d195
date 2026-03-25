# JSBI — pure-JavaScript BigInts [![Build status](https://github.com/GoogleChromeLabs/jsbi/actions/workflows/main.yml/badge.svg)](https://github.com/GoogleChromeLabs/jsbi/actions/workflows/main.yml) [![jsbi on npm](https://img.shields.io/npm/v/jsbi)](https://www.npmjs.com/package/jsbi)

JSBI is a pure-JavaScript implementation of [the ECMAScript BigInt proposal](https://tc39.es/proposal-bigint/), which officially became a part of the JavaScript language in ES2020.

## Installation

```sh
npm install jsbi --save
```

## Usage

```js
import JSBI from './jsbi.mjs';

const max = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
console.log(String(max));
// → '9007199254740991'
const other = JSBI.BigInt('2');
const result = JSBI.add(max, other);
console.log(String(result));
// → '9007199254740993'
```

Note: explicitly call `toString` on any `JSBI` instances when `console.log()`ing them to see their numeric representation (e.g. `String(max)` or `max.toString()`). Without it (e.g. `console.log(max)`), you’ll instead see the object that represents the value.

Use [babel-plugin-transform-jsbi-to-bigint](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) to transpile JSBI code into native BigInt code.

Refer to the detailed instructions below for more information.

## Why?

[Native BigInts are already shipping](https://v8.dev/features/bigint) in modern browsers (at the time of this writing, Google Chrome 67+, Opera 54+, Firefox 68+, Edge 79+, Safari 14+) and Node.js (v10.4+), but some users are still running older browsers — which means you can't use them yet if you want your code to run everywhere.

To use BigInts in code that you want to run *everywhere*, you need a library. But there’s a difficulty: the BigInt proposal changes the behavior of operators (like `+`, `>=`, etc.) to work on BigInts. These changes are impossible to polyfill directly; and they are also making it infeasible (in most cases) to transpile BigInt code to fallback code using Babel or similar tools. The reason is that such a transpilation would have to replace every single operator in the program with a call to some function that performs type checks on its inputs, which would incur an unacceptable performance penalty.

The solution is to do it the other way round: write code using a library’s syntax, and [transpile it to native BigInt code](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) when available. JSBI is designed for exactly this purpose: it provides a BigInt “polyfill” implementation that behaves exactly like the upcoming native BigInts, but with a syntax that you can ship on all browsers, today.

Its advantages over other, existing big-integer libraries are:

- it behaves exactly like native BigInts do where they are available, so to eventually migrate to those, you can [mechanically](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) update your code’s syntax; no re-thinking of its logic will be required.
- strong focus on performance. On average, JSBI is performance-competitive with the native implementation that Google Chrome is currently shipping. (Note: we expect this statement to gradually become outdated as browsers invest in additional optimizations.)

## How?

Except for mechanical differences in syntax, you use JSBI-BigInts just [like you would use native BigInts](https://developers.google.com/web/updates/2018/05/bigint). Some things even look the same, after you replace `BigInt` with `JSBI.BigInt`:

| Operation            | native BigInts          | JSBI                     |
| -------------------- | ----------------------- | ------------------------ |
| Creation from String | `a = BigInt('456')`     | `a = JSBI.BigInt('456')` |
| Creation from Number | `a = BigInt(789)`       | `a = JSBI.BigInt(789)`   |
| Conversion to String | `a.toString(radix)`     | `a.toString(radix)`      |
| Conversion to Number | `Number(a)`             | `JSBI.toNumber(a)`       |
| Truncation           | `BigInt.asIntN(64, a)`  | `JSBI.asIntN(64, a)`     |
|                      | `BigInt.asUintN(64, a)` | `JSBI.asUintN(64, a)`    |
| Type check           | `typeof a === 'bigint'` | `a instanceof JSBI`      |

Most operators are replaced by static functions:

| Operation                   | native BigInts | JSBI                              |
| --------------------------- | -------------- | --------------------------------- |
| Addition                    | `c = a + b`    | `c = JSBI.add(a, b)`              |
| Subtraction                 | `c = a - b`    | `c = JSBI.subtract(a, b)`         |
| Multiplication              | `c = a * b`    | `c = JSBI.multiply(a, b)`         |
| Division                    | `c = a / b`    | `c = JSBI.divide(a, b)`           |
| Remainder                   | `c = a % b`    | `c = JSBI.remainder(a, b)`        |
| Exponentiation              | `c = a ** b`   | `c = JSBI.exponentiate(a, b)`     |
| Negation                    | `b = -a`       | `b = JSBI.unaryMinus(a)`          |
| Bitwise negation            | `b = ~a`       | `b = JSBI.bitwiseNot(a)`          |
| Left shifting               | `c = a << b`   | `c = JSBI.leftShift(a, b)`        |
| Right shifting              | `c = a >> b`   | `c = JSBI.signedRightShift(a, b)` |
| Bitwise “and”               | `c = a & b`    | `c = JSBI.bitwiseAnd(a, b)`       |
| Bitwise “or”                | `c = a \| b`   | `c = JSBI.bitwiseOr(a, b)`        |
| Bitwise “xor”               | `c = a ^ b`    | `c = JSBI.bitwiseXor(a, b)`       |
| Comparison to other BigInts | `a === b`      | `JSBI.equal(a, b)`                |
|                             | `a !== b`      | `JSBI.notEqual(a, b)`             |
|                             | `a < b`        | `JSBI.lessThan(a, b)`             |
|                             | `a <= b`       | `JSBI.lessThanOrEqual(a, b)`      |
|                             | `a > b`        | `JSBI.greaterThan(a, b)`          |
|                             | `a >= b`       | `JSBI.greaterThanOrEqual(a, b)`   |

The functions above operate only on BigInts. (They don’t perform type checks in the current implementation, because such checks are a waste of time when we assume that you know what you’re doing. Don’t try to call them with other inputs, or you’ll get “interesting” failures!)

Some operations are particularly interesting when you give them inputs of mixed types, e.g. comparing a BigInt to a Number, or concatenating a string with a BigInt. They are implemented as static functions named after the respective native operators:

| Operation                       | native BigInts | JSBI             |
| ------------------------------- | -------------- | ---------------- |
| Abstract equality comparison    | `x == y`       | `JSBI.EQ(x, y)`  |
| Generic “not equal”             | `x != y`       | `JSBI.NE(x, y)`  |
| Generic “less than”             | `x < y`        | `JSBI.LT(x, y)`  |
| Generic “less than or equal”    | `x <= y`       | `JSBI.LE(x, y)`  |
| Generic “greater than”          | `x > y`        | `JSBI.GT(x, y)`  |
| Generic “greater than or equal” | `x >= y`       | `JSBI.GE(x, y)`  |
| Generic addition                | `x + y`        | `JSBI.ADD(x, y)` |

The variable names `x` and `y` here indicate that the variables can refer to anything, for example: `JSBI.GT(101.5, BigInt('100'))` or `str = JSBI.ADD('result: ', BigInt('0x2A'))`.

Unfortunately, there are also a few things that are not supported at all:

| Unsupported operation | native BigInts | JSBI                                 |
| --------------------- | -------------- | ------------------------------------ |
| literals              | `a = 123n;`    | N/A ☹                                |
| increment             | `a++`          | N/A ☹                                |
|                       | `a + 1n`       | `JSBI.add(a, JSBI.BigInt('1'))`      |
| decrement             | `a--`          | N/A ☹                                |
|                       | `a - 1n`       | `JSBI.subtract(a, JSBI.BigInt('1'))` |

It is impossible to replicate the exact behavior of the native `++` and `--` operators in a polyfill/library. Since JSBI is intended to be transpiled away eventually, it doesn’t provide a similar-but-different alternative. You can use `JSBI.add()` and `JSBI.subtract()` instead.

Since version 4.2.0, polyfills for `DataView` operations are included (where `dv` is a `DataView`, `i` is an index, `le` is an optional boolean indicating little endian mode, and `x` is a `BigInt` or a `JSBI` instance, respectively):

| native BigInts/DataViews    | JSBI                                      |
|-----------------------------|-------------------------------------------|
| `dv.getBigInt64(i, le)`     | `JSBI.DataViewGetBigInt64(dv, i, le)`     |
| `dv.setBigInt64(i, x, le)`  | `JSBI.DataViewSetBigInt64(dv, i, x, le)`  |
| `dv.getBigUint64(i, le)`    | `JSBI.DataViewGetBigUint64(dv, i, le)`    |
| `dv.setBigUint64(i, x, le)` | `JSBI.DataViewSetBigUint64(dv, i, x, le)` |

## When?

Now! The JSBI library is ready for use today.

Once BigInts are natively supported everywhere, use [babel-plugin-transform-jsbi-to-bigint](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) to transpile your JSBI code into native BigInt code once and for all.

View [our issue tracker](https://github.com/GoogleChromeLabs/jsbi/issues) to learn more about out our future plans for JSBI, and please join the discussion!

A more vague future plan is to use the JSBI library (or an extension to it) as a staging ground for additional BigInt-related functionality. The official proposal is intentionally somewhat minimal, and leaves further “library functions” for follow-up proposals. Examples are a combined `exp`+`mod` function, and bit manipulation functions.

## Development

1. Clone this repository and `cd` into the local directory.

1. Use the Node.js version specified in `.nvmrc`:

     ```sh
     nvm use
     ```

1. Install development dependencies:

    ```sh
    npm install
    ```

1. Run the tests:

    ```sh
    npm test
    ```

    See `npm run` for the list of commands.

## For maintainers

### How to publish a new release

1. On the `main` branch, bump the version number in `package.json`:

    ```sh
    npm version patch -m 'Release v%s'
    ```

    Instead of `patch`, use `minor` or `major` [as needed](https://semver.org/).

    Note that this produces a Git commit + tag.

1. Push the release commit and tag:

    ```sh
    git push && git push --tags
    ```

    Our CI then automatically publishes the new release to npm.
