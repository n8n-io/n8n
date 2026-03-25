# tiny-invariant 🔬💥

[![Build Status](https://travis-ci.org/alexreardon/tiny-invariant.svg?branch=master)](https://travis-ci.org/alexreardon/tiny-invariant)
[![npm](https://img.shields.io/npm/v/tiny-invariant.svg)](https://www.npmjs.com/package/tiny-invariant) [![dependencies](https://david-dm.org/alexreardon/tiny-invariant.svg)](https://david-dm.org/alexreardon/tiny-invariant)
![types](https://img.shields.io/badge/types-typescript%20%7C%20flow-blueviolet)
[![minzip](https://img.shields.io/bundlephobia/minzip/tiny-invariant.svg)](https://www.npmjs.com/package/tiny-invariant)
[![Downloads per month](https://img.shields.io/npm/dm/tiny-invariant.svg)](https://www.npmjs.com/package/tiny-invariant)

A tiny [`invariant`](https://www.npmjs.com/package/invariant) alternative.

## What is `invariant`?

An `invariant` function takes a value, and if the value is [falsy](https://github.com/getify/You-Dont-Know-JS/blob/bdbe570600d4e1107d0b131787903ca1c9ec8140/up%20%26%20going/ch2.md#truthy--falsy) then the `invariant` function will throw. If the value is [truthy](https://github.com/getify/You-Dont-Know-JS/blob/bdbe570600d4e1107d0b131787903ca1c9ec8140/up%20%26%20going/ch2.md#truthy--falsy), then the function will not throw.

```js
import invariant from 'tiny-invariant';

invariant(truthyValue, 'This should not throw!');

invariant(falsyValue, 'This will throw!');
// Error('Invariant violation: This will throw!');
```

You can also provide a function to generate your message, for when your message is expensive to create

```js
import invariant from 'tiny-invariant';

invariant(value, () => getExpensiveMessage());
```

## Why `tiny-invariant`?

The [`library: invariant`](https://www.npmjs.com/package/invariant) supports passing in arguments to the `invariant` function in a sprintf style `(condition, format, a, b, c, d, e, f)`. It has internal logic to execute the sprintf substitutions. The sprintf logic is not removed in production builds. `tiny-invariant` has dropped all of the sprintf logic. `tiny-invariant` allows you to pass a single string message. With [template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) there is really no need for a custom message formatter to be built into the library. If you need a multi part message you can just do this:

```js
invariant(condition, `Hello, ${name} - how are you today?`);
```

## Type narrowing

`tiny-invariant` is useful for correctly narrowing types for `flow` and `typescript`

```ts
const value: Person | null = { name: 'Alex' }; // type of value == 'Person | null'
invariant(value, 'Expected value to be a person');
// type of value has been narrowed to 'Person'
```

## API: `(condition: any, message?: string | (() => string)) => void`

- `condition` is required and can be anything
- `message` optional `string` or a function that returns a `string` (`() => string`)

## Installation

```bash
# yarn
yarn add tiny-invariant

# npm
npm install tiny-invariant --save
```

## Dropping your `message` for kb savings!

Big idea: you will want your compiler to convert this code:

```js
invariant(condition, 'My cool message that takes up a lot of kbs');
```

Into this:

```js
if (!condition) {
  if ('production' !== process.env.NODE_ENV) {
    invariant(false, 'My cool message that takes up a lot of kbs');
  } else {
    invariant(false);
  }
}
```

- **Babel**: recommend [`babel-plugin-dev-expression`](https://www.npmjs.com/package/babel-plugin-dev-expression)
- **TypeScript**: recommend [`tsdx`](https://github.com/jaredpalmer/tsdx#invariant) (or you can run `babel-plugin-dev-expression` after TypeScript compiling)

Your bundler can then drop the code in the `"production" !== process.env.NODE_ENV` block for your production builds to end up with this:

```js
if (!condition) {
  invariant(false);
}
```

- rollup: use [rollup-plugin-replace](https://github.com/rollup/rollup-plugin-replace) and set `NODE_ENV` to `production` and then `rollup` will treeshake out the unused code
- Webpack: [instructions](https://webpack.js.org/guides/production/#specify-the-mode)

## Builds

- We have a `es` (EcmaScript module) build
- We have a `cjs` (CommonJS) build
- We have a `umd` (Universal module definition) build in case you needed it

We expect `process.env.NODE_ENV` to be available at module compilation. We cache this value

## That's it!

🤘
