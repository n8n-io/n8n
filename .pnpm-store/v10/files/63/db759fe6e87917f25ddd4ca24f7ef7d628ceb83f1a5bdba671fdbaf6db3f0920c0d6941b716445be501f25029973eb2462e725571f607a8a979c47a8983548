# fromentries [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url] [![javascript style guide][standard-image]][standard-url]

[travis-image]: https://img.shields.io/travis/feross/fromentries/master.svg
[travis-url]: https://travis-ci.org/feross/fromentries
[npm-image]: https://img.shields.io/npm/v/fromentries.svg
[npm-url]: https://npmjs.org/package/fromentries
[downloads-image]: https://img.shields.io/npm/dm/fromentries.svg
[downloads-url]: https://npmjs.org/package/fromentries
[standard-image]: https://img.shields.io/badge/code_style-standard-brightgreen.svg
[standard-url]: https://standardjs.com

### Object.fromEntries() ponyfill (in 6 lines)

## Install

```
npm install fromentries
```

## Why this package?

Existing polyfill packages (like
[`object.fromentries`](https://github.com/es-shims/Object.fromEntries))
pull in a bunch of dependencies and **adds over 8
KB** to the browser bundle size. This allows them to work in ES3 environments
like IE6, but it's also overkill; almost no one supports IE6 anymore.

I'd rather not ship tons of extra code to website visitors. A polyfill for this
feature can be implemented in a few short lines of code using modern language
features. That's what `fromentries` (this package) does.

This means that `fromentries` only works in evergreen browsers like:

- Chrome
- Firefox
- Edge
- Safari
- Opera

It does not work in browsers like IE11 and older (unless you transpile it first).

## Usage

```js
const fromEntries = require('fromentries')

const map = new Map([ [ 'a', 1 ], [ 'b', 2 ], [ 'c', 3 ] ])
const obj = fromEntries(map)
constole.log(obj) // { a: 1, b: 2, c: 3 }

const searchParams = new URLSearchParams('foo=bar&baz=qux')
const obj2 = fromEntries(searchParams)
console.log(obj2) // { foo: 'bar', 'baz': 'qux' }
```

## What is a ponyfill?

> A *ponyfill* is almost the same as a polyfill, but not quite. Instead of
> patching functionality for older browsers, a ponyfill provides that
> functionality as a standalone module you can use.

Read more at [PonyFoo](https://ponyfoo.com/articles/polyfills-or-ponyfills).

## See also

- [TC39 proposal for Object.fromEntries](https://github.com/tc39/proposal-object-from-entries)

## License

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
