<div align="center">
  <h1>jest-each</h1>
  Jest Parameterised Testing
</div>

<hr />

[![version](https://img.shields.io/npm/v/jest-each.svg?style=flat-square)](https://www.npmjs.com/package/jest-each) [![downloads](https://img.shields.io/npm/dm/jest-each.svg?style=flat-square)](http://npm-stat.com/charts.html?package=jest-each&from=2017-03-21) [![MIT License](https://img.shields.io/npm/l/jest-each.svg?style=flat-square)](https://github.com/jestjs/jest/blob/main/LICENSE)

A parameterised testing library for [Jest](https://jestjs.io/) inspired by [mocha-each](https://github.com/ryym/mocha-each).

jest-each allows you to provide multiple arguments to your `test`/`describe` which results in the test/suite being run once per row of parameters.

## Features

- `.test` to runs multiple tests with parameterised data
  - Also under the alias: `.it`
- `.test.only` to only run the parameterised tests
  - Also under the aliases: `.it.only` or `.fit`
- `.test.skip` to skip the parameterised tests
  - Also under the aliases: `.it.skip` or `.xit` or `.xtest`
- `.test.concurrent`
  - Also under the alias: `.it.concurrent`
- `.test.concurrent.only`
  - Also under the alias: `.it.concurrent.only`
- `.test.concurrent.skip`
  - Also under the alias: `.it.concurrent.skip`
- `.describe` to runs test suites with parameterised data
- `.describe.only` to only run the parameterised suite of tests
  - Also under the aliases: `.fdescribe`
- `.describe.skip` to skip the parameterised suite of tests
  - Also under the aliases: `.xdescribe`
- Asynchronous tests with `done`
- Unique test titles with [`printf` formatting](https://nodejs.org/api/util.html#util_util_format_format_args):
  - `%p` - [pretty-format](https://www.npmjs.com/package/pretty-format).
  - `%s`- String.
  - `%d`- Number.
  - `%i` - Integer.
  - `%f` - Floating point value.
  - `%j` - JSON.
  - `%o` - Object.
  - `%#` - Index of the test case.
  - `%%` - single percent sign ('%'). This does not consume an argument.
- Unique test titles by injecting properties of test case object
- 🖖 Spock like data tables with [Tagged Template Literals](#tagged-template-literal-of-rows)

---

- [Demo](#demo)
- [Installation](#installation)
- [Importing](#importing)
- APIs
  - [Array of Rows](#array-of-rows)
    - [Usage](#usage)
  - [Tagged Template Literal of rows](#tagged-template-literal-of-rows)
    - [Usage](#usage-1)

## Demo

#### Tests without jest-each

![Current jest tests](assets/default-demo.gif)

#### Tests can be re-written with jest-each to:

**`.test`**

![Current jest tests](assets/test-demo.gif)

**`.test` with Tagged Template Literals**

![Current jest tests](assets/tagged-template-literal.gif)

**`.describe`**

![Current jest tests](assets/describe-demo.gif)

## Installation

`npm i --save-dev jest-each`

`yarn add -D jest-each`

## Importing

jest-each is a default export so it can be imported with whatever name you like.

```js
// es6
import each from 'jest-each';
```

```js
// es5
const each = require('jest-each').default;
```

## Array of rows

### API

#### `each([parameters]).test(name, testFn)`

##### `each`:

- parameters: `Array` of Arrays with the arguments that are passed into the `testFn` for each row
  - _Note_ If you pass in a 1D array of primitives, internally it will be mapped to a table i.e. `[1, 2, 3] -> [[1], [2], [3]]`

##### `.test`:

- name: `String` the title of the `test`.
  - Generate unique test titles by positionally injecting parameters with [`printf` formatting](https://nodejs.org/api/util.html#util_util_format_format_args):
    - `%p` - [pretty-format](https://www.npmjs.com/package/pretty-format).
    - `%s`- String.
    - `%d`- Number.
    - `%i` - Integer.
    - `%f` - Floating point value.
    - `%j` - JSON.
    - `%o` - Object.
    - `%#` - Index of the test case.
    - `%%` - single percent sign ('%'). This does not consume an argument.
  - Or generate unique test titles by injecting properties of test case object with `$variable`
    - To inject nested object values use you can supply a keyPath i.e. `$variable.path.to.value`
    - You can use `$#` to inject the index of the test case
    - You cannot use `$variable` with the `printf` formatting except for `%%`
- testFn: `Function` the test logic, this is the function that will receive the parameters of each row as function arguments

#### `each([parameters]).describe(name, suiteFn)`

##### `each`:

- parameters: `Array` of Arrays with the arguments that are passed into the `suiteFn` for each row
  - _Note_ If you pass in a 1D array of primitives, internally it will be mapped to a table i.e. `[1, 2, 3] -> [[1], [2], [3]]`

##### `.describe`:

- name: `String` the title of the `describe`
  - Generate unique test titles by positionally injecting parameters with [`printf` formatting](https://nodejs.org/api/util.html#util_util_format_format_args):
    - `%p` - [pretty-format](https://www.npmjs.com/package/pretty-format).
    - `%s`- String.
    - `%d`- Number.
    - `%i` - Integer.
    - `%f` - Floating point value.
    - `%j` - JSON.
    - `%o` - Object.
    - `%#` - Index of the test case.
    - `%%` - single percent sign ('%'). This does not consume an argument.
  - Or generate unique test titles by injecting properties of test case object with `$variable`
    - To inject nested object values use you can supply a keyPath i.e. `$variable.path.to.value`
    - You can use `$#` to inject the index of the test case
    - You cannot use `$variable` with the `printf` formatting except for `%%`
- suiteFn: `Function` the suite of `test`/`it`s to be ran, this is the function that will receive the parameters in each row as function arguments

### Usage

#### `.test(name, fn)`

Alias: `.it(name, fn)`

```js
each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
]).test('returns the result of adding %d to %d', (a, b, expected) => {
  expect(a + b).toBe(expected);
});
```

```js
each([
  {a: 1, b: 1, expected: 2},
  {a: 1, b: 2, expected: 3},
  {a: 2, b: 1, expected: 3},
]).test('returns the result of adding $a to $b', ({a, b, expected}) => {
  expect(a + b).toBe(expected);
});
```

#### `.test.only(name, fn)`

Aliases: `.it.only(name, fn)` or `.fit(name, fn)`

```js
each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
]).test.only('returns the result of adding %d to %d', (a, b, expected) => {
  expect(a + b).toBe(expected);
});
```

#### `.test.skip(name, fn)`

Aliases: `.it.skip(name, fn)` or `.xit(name, fn)` or `.xtest(name, fn)`

```js
each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
]).test.skip('returns the result of adding %d to %d', (a, b, expected) => {
  expect(a + b).toBe(expected);
});
```

#### `.test.concurrent(name, fn)`

Aliases: `.it.concurrent(name, fn)`

```js
each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
]).test.concurrent(
  'returns the result of adding %d to %d',
  (a, b, expected) => {
    expect(a + b).toBe(expected);
  },
);
```

#### `.test.concurrent.only(name, fn)`

Aliases: `.it.concurrent.only(name, fn)`

```js
each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
]).test.concurrent.only(
  'returns the result of adding %d to %d',
  (a, b, expected) => {
    expect(a + b).toBe(expected);
  },
);
```

#### `.test.concurrent.skip(name, fn)`

Aliases: `.it.concurrent.skip(name, fn)`

```js
each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
]).test.concurrent.skip(
  'returns the result of adding %d to %d',
  (a, b, expected) => {
    expect(a + b).toBe(expected);
  },
);
```

#### Asynchronous `.test(name, fn(done))`

Alias: `.it(name, fn(done))`

```js
each([['hello'], ['mr'], ['spy']]).test(
  'gives 007 secret message: %s',
  (str, done) => {
    const asynchronousSpy = message => {
      expect(message).toBe(str);
      done();
    };
    callSomeAsynchronousFunction(asynchronousSpy)(str);
  },
);
```

#### `.describe(name, fn)`

```js
each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
]).describe('.add(%d, %d)', (a, b, expected) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected);
  });

  test('does not mutate first arg', () => {
    a + b;
    expect(a).toBe(a);
  });

  test('does not mutate second arg', () => {
    a + b;
    expect(b).toBe(b);
  });
});
```

```js
each([
  {a: 1, b: 1, expected: 2},
  {a: 1, b: 2, expected: 3},
  {a: 2, b: 1, expected: 3},
]).describe('.add($a, $b)', ({a, b, expected}) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected);
  });

  test('does not mutate first arg', () => {
    a + b;
    expect(a).toBe(a);
  });

  test('does not mutate second arg', () => {
    a + b;
    expect(b).toBe(b);
  });
});
```

#### `.describe.only(name, fn)`

Aliases: `.fdescribe(name, fn)`

```js
each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
]).describe.only('.add(%d, %d)', (a, b, expected) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected);
  });
});
```

#### `.describe.skip(name, fn)`

Aliases: `.xdescribe(name, fn)`

```js
each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
]).describe.skip('.add(%d, %d)', (a, b, expected) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected);
  });
});
```

---

## Tagged Template Literal of rows

### API

#### `each[tagged template].test(name, suiteFn)`

```js
each`
  a    | b    | expected
  ${1} | ${1} | ${2}
  ${1} | ${2} | ${3}
  ${2} | ${1} | ${3}
`.test('returns $expected when adding $a to $b', ({a, b, expected}) => {
  expect(a + b).toBe(expected);
});
```

##### `each` takes a tagged template string with:

- First row of variable name column headings separated with `|`
- One or more subsequent rows of data supplied as template literal expressions using `${value}` syntax.

##### `.test`:

- name: `String` the title of the `test`, use `$variable` in the name string to inject test values into the test title from the tagged template expressions
  - To inject nested object values use you can supply a keyPath i.e. `$variable.path.to.value`
  - You can use `$#` to inject the index of the table row.
- testFn: `Function` the test logic, this is the function that will receive the parameters of each row as function arguments

#### `each[tagged template].describe(name, suiteFn)`

```js
each`
  a    | b    | expected
  ${1} | ${1} | ${2}
  ${1} | ${2} | ${3}
  ${2} | ${1} | ${3}
`.describe('$a + $b', ({a, b, expected}) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected);
  });

  test('does not mutate first arg', () => {
    a + b;
    expect(a).toBe(a);
  });

  test('does not mutate second arg', () => {
    a + b;
    expect(b).toBe(b);
  });
});
```

##### `each` takes a tagged template string with:

- First row of variable name column headings separated with `|`
- One or more subsequent rows of data supplied as template literal expressions using `${value}` syntax.

##### `.describe`:

- name: `String` the title of the `test`, use `$variable` in the name string to inject test values into the test title from the tagged template expressions
  - To inject nested object values use you can supply a keyPath i.e. `$variable.path.to.value`
- suiteFn: `Function` the suite of `test`/`it`s to be ran, this is the function that will receive the parameters in each row as function arguments

### Usage

#### `.test(name, fn)`

Alias: `.it(name, fn)`

```js
each`
  a    | b    | expected
  ${1} | ${1} | ${2}
  ${1} | ${2} | ${3}
  ${2} | ${1} | ${3}
`.test('returns $expected when adding $a to $b', ({a, b, expected}) => {
  expect(a + b).toBe(expected);
});
```

#### `.test.only(name, fn)`

Aliases: `.it.only(name, fn)` or `.fit(name, fn)`

```js
each`
  a    | b    | expected
  ${1} | ${1} | ${2}
  ${1} | ${2} | ${3}
  ${2} | ${1} | ${3}
`.test.only('returns $expected when adding $a to $b', ({a, b, expected}) => {
  expect(a + b).toBe(expected);
});
```

#### `.test.skip(name, fn)`

Aliases: `.it.skip(name, fn)` or `.xit(name, fn)` or `.xtest(name, fn)`

```js
each`
  a    | b    | expected
  ${1} | ${1} | ${2}
  ${1} | ${2} | ${3}
  ${2} | ${1} | ${3}
`.test.skip('returns $expected when adding $a to $b', ({a, b, expected}) => {
  expect(a + b).toBe(expected);
});
```

#### Asynchronous `.test(name, fn(done))`

Alias: `.it(name, fn(done))`

```js
each`
  str
  ${'hello'}
  ${'mr'}
  ${'spy'}
`.test('gives 007 secret message: $str', ({str}, done) => {
  const asynchronousSpy = message => {
    expect(message).toBe(str);
    done();
  };
  callSomeAsynchronousFunction(asynchronousSpy)(str);
});
```

#### `.describe(name, fn)`

```js
each`
  a    | b    | expected
  ${1} | ${1} | ${2}
  ${1} | ${2} | ${3}
  ${2} | ${1} | ${3}
`.describe('$a + $b', ({a, b, expected}) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected);
  });

  test('does not mutate first arg', () => {
    a + b;
    expect(a).toBe(a);
  });

  test('does not mutate second arg', () => {
    a + b;
    expect(b).toBe(b);
  });
});
```

#### `.describe.only(name, fn)`

Aliases: `.fdescribe(name, fn)`

```js
each`
  a    | b    | expected
  ${1} | ${1} | ${2}
  ${1} | ${2} | ${3}
  ${2} | ${1} | ${3}
`.describe.only('$a + $b', ({a, b, expected}) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected);
  });
});
```

#### `.describe.skip(name, fn)`

Aliases: `.xdescribe(name, fn)`

```js
each`
  a    | b    | expected
  ${1} | ${1} | ${2}
  ${1} | ${2} | ${3}
  ${2} | ${1} | ${3}
`.describe.skip('$a + $b', ({a, b, expected}) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected);
  });
});
```

## License

MIT
