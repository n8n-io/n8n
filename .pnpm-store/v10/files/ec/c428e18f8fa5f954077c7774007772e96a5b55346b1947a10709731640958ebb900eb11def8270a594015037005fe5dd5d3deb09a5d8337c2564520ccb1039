Change Log
=======================================
All notable changes will be documented in this file.
`ono` adheres to [Semantic Versioning](http://semver.org/).



[v7.1.0](https://github.com/JS-DevTools/ono/tree/v7.1.0) (2020-03-03)
----------------------------------------------------------------------------------------------------

- Added a static `Ono.extend()` method that allows Ono to extend errors that were created outside of Ono. The extended error gets all the Ono functionality, including nested stack traces, custom properties, improved support for `JSON.stringify()`, etc.


[Full Changelog](https://github.com/JS-DevTools/ono/compare/v7.0.1...v7.1.0)



[v7.0.0](https://github.com/JS-DevTools/ono/tree/v7.0.0) (2020-02-16)
----------------------------------------------------------------------------------------------------

- Moved Ono to the [@JSDevTools scope](https://www.npmjs.com/org/jsdevtools) on NPM

- The "ono" NPM package is now just a wrapper around the scoped "@jsdevtools/ono" package


[Full Changelog](https://github.com/JS-DevTools/ono/compare/v6.0.1...v7.0.0)



[v6.0.0](https://github.com/JS-DevTools/ono/tree/v6.0.0) (2019-12-28)
----------------------------------------------------------------------------------------------------

### Breaking Changes

- Dropped support for IE8 and other JavaScript engines that don't support [`Object.getOwnPropertyDescriptor()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor)

- Removed `ono.formatter`.  It has been replaced with [the `format` option](https://github.com/JS-DevTools/ono#format-option)

- When using the default `ono()` function to wrap an error, it will now try to match the error's type, rather than simply using the base `Error` class.

### New Features

- The [`Ono` constructor](https://github.com/JS-DevTools/ono#onoerror-options) now accepts an optional [options parameter](https://github.com/JS-DevTools/ono#options), which lets you customize the behavior of Ono

- The [`concatMessages` option](https://github.com/JS-DevTools/ono#concatmessages-option) lets you control whether the original error's message is appended to your error message

- The [`format` option](https://github.com/JS-DevTools/ono#format-option) lets you provide a custom function for replacing placeholders in error messages

[Full Changelog](https://github.com/JS-DevTools/ono/compare/v5.1.0...v6.0.0)



[v5.1.0](https://github.com/JS-DevTools/ono/tree/v5.1.0) (2019-09-10)
----------------------------------------------------------------------------------------------------

- Added a static `Ono.toJSON()` method that accepts any `Error` (even a non-Ono error) and returns a POJO that can be used with `JSON.stringify()`.  Ono errors already have a built-in `toJSON()` method, but this exposes that enhanced functionality in a way that can be used with _any_ error.

[Full Changelog](https://github.com/JS-DevTools/ono/compare/v5.0.2...v5.1.0)



[v5.0.0](https://github.com/JS-DevTools/ono/tree/v5.0.0) (2019-02-18)
----------------------------------------------------------------------------------------------------
### Breaking Changes

#### in Node.js

- Ono errors previously included an `inspect()` method to support Node's [`util.inspect()` function](https://nodejs.org/api/util.html#util_util_inspect_object_options).  As of Node v6.6.0, the `inspect()` method is deprecated in favor of a [`util.inspect.custom`](https://nodejs.org/api/util.html#util_util_inspect_custom).  Ono has updated accordingly, so errors no longer have an `inspect()` method.

#### in Web Browsers

- We no longer automatically include a polyfill for [Node's `util.format()` function](https://nodejs.org/api/util.html#util_util_format_format_args).  We recommend using [ES6 template strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) instead. Or you can import [a polyfill](https://github.com/tmpfs/format-util) yourself and assign it to [the `ono.formatter` property](https://jstools.dev/ono/#onoformatter).

### New Features

- Completely rewritten in TypeScript.

- Ono is now completely dependency free.

- You can now create your own Ono functions for custom error classes.  See [the docs](https://jstools.dev/ono/#custom-error-classes) for details.

- Symbol-keyed properties are now supported.  If the `originalError` and/or `props` objects has Symbol-keyed properties, they will be copied to the Ono error.

[Full Changelog](https://github.com/JS-DevTools/ono/compare/v4.0.11...v5.0.0)



[v4.0.0](https://github.com/JS-DevTools/ono/tree/v4.0.0) (2017-07-07)
----------------------------------------------------------------------------------------------------
The `err` parameter (see [the API docs](https://github.com/JS-DevTools/ono#api)) can now be any type of object, not just an `instanceof Error`. This allows for errors that don't extend from the `Error` class, such as [`DOMError`](https://developer.mozilla.org/en-US/docs/Web/API/DOMError), [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException), and custom error types.

> **NOTE:** This should **not** be a breaking change, but I'm bumping the major version number out of an abundance of caution.

[Full Changelog](https://github.com/JS-DevTools/ono/compare/v3.1.0...v4.0.0)



[v3.1.0](https://github.com/JS-DevTools/ono/tree/v3.1.0) (2017-06-01)
----------------------------------------------------------------------------------------------------
We removed the direct dependency on [Node's `util.format()`](https://nodejs.org/api/util.html#util_util_format_format_args), which was needlessly bloating the browser bundle. Instead, I now import [`format-util`](https://www.npmjs.com/package/format-util), which a much more [lightweight browser implementation](https://github.com/tmpfs/format-util/blob/f88c550ef10c5aaadc15a7ebab595f891bb385e1/format.js).  There's no change when running in Node.js, because `format-util` simply [exports `util.format()`](https://github.com/tmpfs/format-util/blob/392628c5d45e558589f2f19ffb9d79d4b5540010/index.js#L1).

[Full Changelog](https://github.com/JS-DevTools/ono/compare/v3.0.0...v3.1.0)



[v3.0.0](https://github.com/JS-DevTools/ono/tree/v3.0.0) (2017-06-01)
----------------------------------------------------------------------------------------------------
- Updated all dependencies and verified support for Node 8.0
- Ono no longer appears in error stack traces, so errors look like they came directly from your code

[Full Changelog](https://github.com/JS-DevTools/ono/compare/v2.0.0...v3.0.0)



[v2.0.0](https://github.com/JS-DevTools/ono/tree/v2.0.0) (2015-12-14)
----------------------------------------------------------------------------------------------------
- Did a major refactoring and code cleanup
- Support for various browser-specific `Error.prototype` properties (`fileName`, `lineNumber`, `sourceURL`, etc.)
- If you define a custom `toJSON()` method on an error object, Ono will no longer overwrite it
- Added support for Node's `util.inspect()`

[Full Changelog](https://github.com/JS-DevTools/ono/compare/v1.0.22...v2.0.0)
