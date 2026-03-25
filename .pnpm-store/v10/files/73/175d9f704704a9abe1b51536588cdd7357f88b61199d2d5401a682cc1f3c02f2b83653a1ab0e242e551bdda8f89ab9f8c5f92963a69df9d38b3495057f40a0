<div align="center">
<h1>jest-expect-message</h1>

🃏🗯

Add custom message to Jest expects

</div>

<hr />

[![Build Status](https://img.shields.io/github/workflow/status/mattphillips/jest-expect-message/GitHub%20CI/main?style=flat-square)](https://github.com/mattphillips/jest-expect-message/actions/workflows/ci.yaml)
[![Code Coverage](https://img.shields.io/codecov/c/github/mattphillips/jest-expect-message.svg?style=flat-square)](https://codecov.io/github/mattphillips/jest-expect-message)
[![version](https://img.shields.io/npm/v/jest-expect-message.svg?style=flat-square)](https://www.npmjs.com/package/jest-expect-message)
[![downloads](https://img.shields.io/npm/dm/jest-expect-message.svg?style=flat-square)](http://npm-stat.com/charts.html?package=jest-expect-message&from=2017-09-14)
[![MIT License](https://img.shields.io/npm/l/jest-expect-message.svg?style=flat-square)](https://github.com/mattphillips/jest-expect-message/blob/master/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Roadmap](https://img.shields.io/badge/%F0%9F%93%94-roadmap-CD9523.svg?style=flat-square)](https://github.com/mattphillips/jest-expect-message/blob/master/docs/ROADMAP.md)
[![Examples](https://img.shields.io/badge/%F0%9F%92%A1-examples-ff615b.svg?style=flat-square)](https://github.com/mattphillips/jest-expect-message/blob/master/docs/EXAMPLES.md)

## Problem

In many testing libraries it is possible to supply a custom message for a given expectation, this is currently not
possible in Jest.

For example:

```js
test('returns 2 when adding 1 and 1', () => {
  expect(1 + 1, 'Woah this should be 2!').toBe(3);
});
```

This will throw the following error in Jest:

```sh
Expect takes at most one argument.
```

## Solution

`jest-expect-message` allows you to call `expect` with a second argument of a `String` message.

For example the same test as above:

```js
test('returns 2 when adding 1 and 1', () => {
  expect(1 + 1, 'Woah this should be 2!').toBe(3);
});
```

With `jest-expect-message` this will fail with your custom error message:

```sh
  ● returns 2 when adding 1 and 1

    Custom message:
      Woah this should be 2!

    expect(received).toBe(expected) // Object.is equality

    Expected: 3
    Received: 2
```

## Installation

With npm:

```sh
npm install --save-dev jest-expect-message
```

With yarn:

```sh
yarn add -D jest-expect-message
```

## Setup

Add `jest-expect-message` to your Jest `setupFilesAfterEnv` configuration.
[See for help](https://jestjs.io/docs/en/next/configuration#setupfilesafterenv-array)

### Jest v24+

```json
"jest": {
  "setupFilesAfterEnv": ["jest-expect-message"]
}
```

### Jest v23-

```json
"jest": {
  "setupTestFrameworkScriptFile": "jest-expect-message"
}
```

If you have a custom setup file and want to use this library then add the following to your setup file.

```js
import 'jest-expect-message';
```

### Configure Typescript

Add the following entry to your tsconfig to enable Typescript support.

```json
  "files": ["node_modules/jest-expect-message/types/index.d.ts"],
```

#### Example

Custom message [example](/example) with typescript

### Configure ESlint

```json
"rules": {
  "jest/valid-expect": [
    "error",
    {
      "maxArgs": 2
    }
  ]
}
```

## Usage

- `expect(actual, message, options?)`
  - `actual`: The value you would normally pass into an `expect` to assert against with a given matcher.
  - `message`: String, the custom message you want to be printed should the `expect` fail.
  - `options`: An optional object that controls what is shown as part of the custom message.
    - `showPrefix: boolean`: If `false` will not show the `Custom message:` prefix. Default: `true`
    - `showMatcherMessage: boolean`: If `false` will not show the matchers original error message. Default: `true`
    - `showStack: boolean`: If `false` will not show the matchers stack trace. Default: `true`

```js
test('returns 2 when adding 1 and 1', () => {
  expect(1 + 1, 'Woah this should be 2!').toBe(3);
});
// ↓ ↓ ↓ ↓ ↓ ↓
/*
  ● returns 2 when adding 1 and 1

    Custom message:
      Woah this should be 2!

    expect(received).toBe(expected) // Object.is equality

    Expected: 3
    Received: 2

  1 |   test('returns 2 when adding 1 and 1', () => {
> 2 |     expect(1 + 1, 'Woah this should be 2!').toBe(3);
    |                                             ^
  3 |   });
*/
```

### showPrefix: `false`

```js
test('returns 2 when adding 1 and 1', () => {
  expect(1 + 1, 'Woah this should be 2!', { showPrefix: false }).toBe(3);
});
// ↓ ↓ ↓ ↓ ↓ ↓
/*
  ● returns 2 when adding 1 and 1

    Woah this should be 2!

    expect(received).toBe(expected) // Object.is equality

    Expected: 3
    Received: 2

  1 |   test('returns 2 when adding 1 and 1', () => {
> 2 |     expect(1 + 1, 'Woah this should be 2!', { showPrefix: false }).toBe(3);
    |                                                                    ^
  3 |   });
*/
```

### showMatcherMessage: `false`

```js
test('returns 2 when adding 1 and 1', () => {
  expect(1 + 1, 'Woah this should be 2!', { showMatcherMessage: false }).toBe(3);
});
// ↓ ↓ ↓ ↓ ↓ ↓
/*
  ● returns 2 when adding 1 and 1

    Custom message:
      Woah this should be 2!

  1 |   test('returns 2 when adding 1 and 1', () => {
> 2 |     expect(1 + 1, 'Woah this should be 2!', { showMatcherMessage: false }).toBe(3);
    |                                                                            ^
  3 |   });
*/
```

### showStack: `false`

```js
test('returns 2 when adding 1 and 1', () => {
  expect(1 + 1, 'Woah this should be 2!', { showStack: false }).toBe(3);
});
// ↓ ↓ ↓ ↓ ↓ ↓
/*
  ● returns 2 when adding 1 and 1

    Custom message:
      Woah this should be 2!

    expect(received).toBe(expected) // Object.is equality

    Expected: 3
    Received: 2
*/
```

## LICENSE

[MIT](/LICENSE)
