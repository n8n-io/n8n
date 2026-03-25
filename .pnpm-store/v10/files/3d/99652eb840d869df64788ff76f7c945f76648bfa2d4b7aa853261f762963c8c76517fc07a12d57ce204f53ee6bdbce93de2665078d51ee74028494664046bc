ono (Oh No!)
============================
### Throw better errors.

[![npm](https://img.shields.io/npm/v/@jsdevtools/ono.svg)](https://www.npmjs.com/package/@jsdevtools/ono)
[![License](https://img.shields.io/npm/l/@jsdevtools/ono.svg)](LICENSE)
[![Buy us a tree](https://img.shields.io/badge/Treeware-%F0%9F%8C%B3-lightgreen)](https://plant.treeware.earth/JS-DevTools/ono)

[![Build Status](https://github.com/JS-DevTools/ono/workflows/CI-CD/badge.svg)](https://github.com/JS-DevTools/ono/actions)
[![Coverage Status](https://coveralls.io/repos/github/JS-DevTools/ono/badge.svg?branch=master)](https://coveralls.io/github/JS-DevTools/ono)
[![Dependencies](https://david-dm.org/JS-DevTools/ono.svg)](https://david-dm.org/JS-DevTools/ono)

[![OS and Browser Compatibility](https://jstools.dev/img/badges/ci-badges-with-ie.svg)](https://github.com/JS-DevTools/ono/actions)



Features
--------------------------
- Wrap and re-throw an error _without_ losing the original error's type, message, stack trace, and properties

- Add custom properties to errors &mdash; great for error numbers, status codes, etc.

- Use [format strings](#format-option) for error messages &mdash; great for localization

- Enhanced support for [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) and [`util.inspect()`](https://nodejs.org/api/util.html#util_util_inspect_object_options) &mdash; great for logging

- Supports and enhances your own [custom error classes](#custom-error-classes)

- Tested on Node.js and all modern web browsers on Mac, Windows, and Linux.



Example
--------------------------

```javascript
const ono = require("@jsdevtools/ono");

// Throw an error with custom properties
throw ono({ code: "NOT_FOUND", status: 404 }, `Resource not found: ${url}`);

// Wrap an error without losing the original error's stack and props
throw ono(originalError, "An error occurred while saving your changes");

// Wrap an error and add custom properties
throw ono(originalError, { code: 404, status: "NOT_FOUND" });

// Wrap an error, add custom properties, and change the error message
throw ono(originalError, { code: 404, status: "NOT_FOUND" }, `Resource not found: ${url}`);

// Throw a specific Error subtype instead
// (works with any of the above signatures)
throw ono.range(...);                           // RangeError
throw ono.syntax(...);                          // SyntaxError
throw ono.reference(...);                       // ReferenceError

// Create an Ono method for your own custom error class
const { Ono } = require("@jsdevtools/ono");
class MyErrorClass extends Error {}
ono.myError = new Ono(MyErrorClass);

// And use it just like any other Ono method
throw ono.myError(...);                         // MyErrorClass
```



Installation
--------------------------
Install using [npm](https://docs.npmjs.com/about-npm/):

```bash
npm install @jsdevtools/ono
```



Usage
--------------------------
When using Ono in Node.js apps, you'll probably want to use **CommonJS** syntax:

```javascript
const ono = require("@jsdevtools/ono");
```

When using a transpiler such as [Babel](https://babeljs.io/) or [TypeScript](https://www.typescriptlang.org/), or a bundler such as [Webpack](https://webpack.js.org/) or [Rollup](https://rollupjs.org/), you can use **ECMAScript modules** syntax instead:

```javascript
import ono from "@jsdevtools/ono";
```



Browser support
--------------------------
Ono supports recent versions of every major web browser.  Older browsers may require [Babel](https://babeljs.io/) and/or [polyfills](https://babeljs.io/docs/en/next/babel-polyfill).

To use Ono in a browser, you'll need to use a bundling tool such as [Webpack](https://webpack.js.org/), [Rollup](https://rollupjs.org/), [Parcel](https://parceljs.org/), or [Browserify](http://browserify.org/). Some bundlers may require a bit of configuration, such as setting `browser: true` in [rollup-plugin-resolve](https://github.com/rollup/rollup-plugin-node-resolve).



API
--------------------------
### `ono([originalError], [props], [message, ...])`
Creates an [`Error`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object with the given properties.

* `originalError` - _(optional)_ The original error that occurred, if any. This error's message, stack trace, and properties will be copied to the new error. If this error's type is one of the [known error types](#specific-error-types), then the new error will be of the same type.

* `props` - _(optional)_ An object whose properties will be copied to the new error. Properties can be anything, including objects and functions.

* `message` - _(optional)_ The error message string. If it contains placeholders, then pass each placeholder's value as an additional parameter.  See the [`format` option](#format-option) for more info.

### Specific error types
The default `ono()` function may return an instance of the base [`Error` class](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error), or it may return a more specific sub-class, based on the type of the `originalError` argument.  If you want to _explicitly_ create a specific type of error, then you can use any of the following methods:

The method signatures and arguments are exactly the same as [the default `ono()` function](#onooriginalerror-props-message-).

|Method                      | Return Type
|:---------------------------|:-------------------
|`ono.error()`               |[`Error`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
|`ono.eval()`                |[`EvalError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/EvalError)
|`ono.range()`               |[`RangeError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError)
|`ono.reference()`           |[`ReferenceError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ReferenceError)
|`ono.syntax()`              |[`SyntaxError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError)
|`ono.type()`                |[`TypeError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError)
|`ono.uri()`                 |[`URIError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/URIError)
|`ono.yourCustomErrorHere()` |Add your own [custom error classes](#custom-error-classes) to ono



### `Ono(Error, [options])`
The `Ono` constructor is used to create your own [custom `ono` methods](#custom-error-classes) for custom error types, or to change the default behavior of the built-in methods.

> **Warning:** Be sure not to confuse `ono` (lowercase) and `Ono` (capitalized). The latter one is a class.

* `Error` - The Error sub-class that this Ono method will create instances of

* `options` - _(optional)_ An [options object](#options), which customizes the behavior of the Ono method



Options
---------------------------------
The `Ono` constructor takes an optional options object as a second parameter. The object can have the following properties, all of which are optional:

|Option           |Type        |Default      |Description
|-----------------|------------|-------------|---------------------------------------------------------------
|`concatMessages` |boolean     |`true`       |When Ono is used to wrap an error, this setting determines whether the inner error's message is appended to the new error message.
|`format`         |function or boolean |[`util.format()`](https://nodejs.org/api/util.html#util_util_format_format_args) in Node.js<br><br>`false` in web browsers|A function that replaces placeholders like in error messages with values.<br><br>If set to `false`, then error messages will be treated as literals and no placeholder replacement will occur.


### `concatMessages` Option
When wrapping an error, Ono's default behavior is to append the error's message to your message, with a newline between them.  For example:

```javascript
const ono = require("@jsdevtools/ono");

function createArray(length) {
  try {
    return new Array(length);
  }
  catch (error) {
    // Wrap and re-throw the error
    throw ono(error, "Sorry, I was unable to create the array.");
  }
}

// Try to create an array with a negative length
createArray(-5);
```

The above code produces the following error message:

```
Sorry, I was unable to create the array.
Invalid array length;
```

If you'd rather not include the original message, then you can set the `concatMessages` option to `false`. For example:

```javascript
const { ono, Ono } = require("@jsdevtools/ono");

// Override the default behavior for the RangeError
ono.range = new Ono(RangeError, { concatMessages: false });

function createArray(length) {
  try {
    return new Array(length);
  }
  catch (error) {
    // Wrap and re-throw the error
    throw ono(error, "Sorry, I was unable to create the array.");
  }
}

// Try to create an array with a negative length
createArray(-5);
```

Now the error only includes your message, not the original error message.

```
Sorry, I was unable to create the array.
```


### `format` option
The `format` option let you set a format function, which replaces placeholders in error messages with values.

When running in Node.js, Ono uses [the `util.format()` function](https://nodejs.org/api/util.html#util_util_format_format_args) by default, which lets you use placeholders such as %s, %d, and %j. You can provide the values for these placeholders when calling any Ono method:

```javascript
throw ono("%s is invalid. Must be at least %d characters.", username, minLength);
```

Of course, the above example could be accomplished using [ES6 template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) instead of format strings:

```javascript
throw ono(`${username} is invalid. Must be at least ${minLength} characters.`);
```

Format strings are most useful when you don't alrady know the values at the time that you're writing the string. A common scenario is localization.  Here's a simplistic example:

```javascript
const errorMessages {
  invalidLength: {
    en: "%s is invalid. Must be at least %d characters.",
    es: "%s no es válido. Debe tener al menos %d caracteres.",
    zh: "%s 无效。 必须至少%d个字符。",
  }
}

let lang = getCurrentUsersLanguage();

throw ono(errorMessages.invalidLength[lang], username, minLength);
```

#### The `format` option in web browsers
Web browsers don't have a built-in equivalent of Node's [`util.format()` function](https://nodejs.org/api/util.html#util_util_format_format_args), so format strings are only supported in Node.js by default.  However, you can set the `format` option to any compatible polyfill library to enable this functionality in web browsers too.

Here are some compatible polyfill libraries:

- [format](https://www.npmjs.com/package/format)
- [format-util](https://github.com/tmpfs/format-util)


#### Custom `format` implementation
If the standard [`util.format()`](https://nodejs.org/api/util.html#util_util_format_format_args) functionality isn't sufficient for your needs, then you can set the `format` option to your own custom implementation.  Here's a simplistic example:

```javascript
const { ono, Ono } = require("@jsdevtools/ono");

// This is a simple formatter that replaces $0, $1, $2, ... with the corresponding argument
let options = {
  format(message, ...args) {
    for (let [index, arg] of args.entries()) {
      message = message.replace("$" + index, arg);
    }
    return message;
  }
};

// Use your custom formatter for all of the built-in error types
ono.error = new Ono(Error, options);
ono.eval = new Ono(EvalError, options);
ono.range = new Ono(RangeError, options);
ono.reference = new Ono(ReferenceError, options);
ono.syntax = new Ono(SyntaxError, options);
ono.type = new Ono(TypeError, options);
ono.uri = new Ono(URIError, options);

// Now all Ono functions support your custom formatter
throw ono("$0 is invalid. Must be at least $1 characters.", username, minLength);
```




Custom Error Classes
-----------------------------
There are two ways to use Ono with your own custom error classes.  Which one you choose depends on what parameters your custom error class accepts, and whether you'd prefer to use `ono.myError()` syntax or `new MyError()` syntax.

### Option 1: Standard Errors
Ono has built-in support for all of [the built-in JavaScript Error types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Error_types).  For example, you can use `ono.reference()` to create a `ReferenceError`, or `ono.syntax()` to create a `SyntaxError`.

All of these built-in JavaScript Error types accept a single parameter: the error message string. If your own error classes also work this way, then you can create Ono methods for your custom error classes. Here's an example:

```javascript
const { ono, Ono } = require("@jsdevtools/ono");
let counter = 0;

// A custom Error class that assigns a unique ID and timestamp to each error
class MyErrorClass extends Error {
  constructor(message) {
    super(message);
    this.id = ++counter;
    this.timestamp = new Date();
  }
}

// Create a new Ono method for your custom Error class
ono.myError = new Ono(MyErrorClass);

// You can use this method just like any other Ono method
throw ono.myError({ code: 404, status: "NOT_FOUND" }, `Resource not found: ${url}`);
```

The code above throws an instance of `MyErrorClass` that looks like this:

```javascript
{
  "name": "MyErrorClass",
  "message": "Resource not found: xyz.html",
  "id": 1,
  "timestamp": "2019-01-01T12:30:00.456Z",
  "code": 404,
  "status": "NOT_FOUND",
  "stack": "MyErrorClass: Resource not found: xyz.html\n   at someFunction (index.js:24:5)",
}
```

### Option 2: Enhanced Error Classes
If your custom error classes require more than just an error message string parameter, then you'll need to use Ono differently. Rather than creating a [custom Ono method](#option-1-standard-errors) and using `ono.myError()` syntax, you'll use Ono _inside_ your error class's constructor. This has a few benefits:

- Your error class can accept whatever parameters you want
- Ono is encapsulated within your error class
- You can use `new MyError()` syntax rather than `ono.myError()` syntax

```javascript
const { ono, Ono } = require("@jsdevtools/ono");

// A custom Error class for 404 Not Found
class NotFoundError extends Error {
  constructor(method, url) {
    super(`404: ${method} ${url} was not found`);

    // Add custom properties, enhance JSON.stringify() support, etc.
    Ono.extend(this, { statusCode: 404, method, url });
  }
}

// A custom Error class for 500 Server Error
class ServerError extends Error {
  constructor(originalError, method, url) {
    super(`500: A server error occurred while responding to ${method} ${url}`);

    // Append the stack trace and custom properties of the original error,
    // and add new custom properties, enhance JSON.stringify() support, etc.
    Ono.extend(this, originalError, { statusCode: 500, method, url });
  }
}
```



Contributing
--------------------------
Contributions, enhancements, and bug-fixes are welcome!  [Open an issue](https://github.com/JS-DevTools/ono/issues) on GitHub and [submit a pull request](https://github.com/JS-DevTools/ono/pulls).

#### Building/Testing
To build/test the project locally on your computer:

1. __Clone this repo__<br>
`git clone https://github.com/JS-DevTools/ono.git`

2. __Install dependencies__<br>
`npm install`

3. __Run the build script__<br>
`npm run build`

4. __Run the tests__<br>
`npm test`



License
--------------------------
Ono is 100% free and open-source, under the [MIT license](LICENSE). Use it however you want.

This package is [Treeware](http://treeware.earth). If you use it in production, then we ask that you [**buy the world a tree**](https://plant.treeware.earth/JS-DevTools/ono) to thank us for our work. By contributing to the Treeware forest you’ll be creating employment for local families and restoring wildlife habitats.



Big Thanks To
--------------------------
Thanks to these awesome companies for their support of Open Source developers ❤

[![Travis CI](https://jstools.dev/img/badges/travis-ci.svg)](https://travis-ci.com)
[![SauceLabs](https://jstools.dev/img/badges/sauce-labs.svg)](https://saucelabs.com)
[![Coveralls](https://jstools.dev/img/badges/coveralls.svg)](https://coveralls.io)
