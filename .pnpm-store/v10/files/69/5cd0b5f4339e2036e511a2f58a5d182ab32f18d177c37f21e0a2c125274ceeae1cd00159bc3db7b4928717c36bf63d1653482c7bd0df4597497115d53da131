# ts-error

**TL/DR: An extendable error class that actually works with TypeScript and ES6
support compatible with all environments, even very old browsers.**

This package provides an extendable error class, `ExtendableError` for
JavaScript / TypeScript. There exist a number of similar packages on NPM, but
they all have shortcomings, like not supporting TypeScript, being awkward to use
with TypeScript 2, not being compatible with old browsers, not printing the
stack trace when used with `console.log` or similar functions or not having all
features I wanted. So I decided to write my own.

Obviously, it's not all 100% written from scratch, but rather I collected the
good parts from various existing open source error packages and some
StackOverflow answers, fixed various errors, wrote some tests and put it
together in one package.

The purpose of extendable errors classes is to be able to throw error objects
that are subclasses of the built-in JavaScript `Error` class, which has a number
of gotchas, and to then filter them with the `instanceof` operator in the
`catch` clause of a `try`/`catch` block as well as potentially adding additional
variables to the error object.

This `ExtendableError` class will:

- subclass the built-in `Error` class. Subclasses created from `ExtendableError`
  will subclass `Error`, `ExtendableError` and any other classes in the
  inheritance chain.
- have a name attribute equal to the class name
- have a string representation with `toString()` that includes the name and
  message properties of the error object. This is also fixed for all versions of
  IE, where the error object usually does _not_ print error objects like this.
- include all non-standard properties that default `Error` objects provide in
  different browsers
- provide a stack trace, if default `Error` objects have the `stack` property or
  the `Error.captureStackTrace` exists (on V8, so in Chrome and node.js).
  Additionally, on V8, the stack trace will **not** include the constructor
  functions of the error subclasses.
- have a stack trace with the actual error name instead of `Error`
- display the stack trace (or the toString() representation, if the stack trace
  does not exist), including the error name at the beginning, when printed with
  `console.log(e)` (except for Chrome, where this does not work, even though the
  `stack` property includes the actual name. I don't think it is possible to fix
  this, but if anyone knows a way, let me know!)

It is compatible with node.js, provides an old-style CommonJS module and a
new-style ES6 module as well as a TypeScript definition file. It is extensively
tested and works in node.js and all browsers I have tested (including IE6 and
various old browsers as well as mobile browsers).

It's also really small, with less than 200 lines of code, and it has no
production dependencies.

## Install

You can install the [ts-error package](https://www.npmjs.com/package/ts-error)
from NPM with the command:

```sh
# If you use yarn
yarn add ts-error

# If you use NPM
npm install ts-error
```

## Usage

Simply import the package and optionally subclass `ExtendableError` and create a
new error object. The `message` property that should be passed to the object
will is optional and will default to an empty string. If undefined is passed,
this is also turned into an empty string.

For compatiblity, the package requires various methods, that are not defined in
old browsers. The CommonJs version (only!) includes polyfills for these
functions without polluting the global namespace, if the required functions are
not defined. If you want to use your own polyfills, load them before loading
this package.

In TypeScript:

```ts
import { ExtendableError } from "ts-error";

class CustomError extends ExtendableError {}

try {
  throw new CustomError("Optional Error message");
} catch (e) {
  if (e instanceof CustomError) {
    // ...
  } else {
    // ...
  }
}
```

In ES6 / esnext:

```js
import { ExtendableError } from "ts-error";

class CustomError extends ExtendableError {}

try {
  throw new CustomError("Optional Error message");
} catch (e) {
  if (e instanceof CustomError) {
    // ...
  } else {
    // ...
  }
}
```

In ES5:

```js
var ExtendableError = require("ts-error").ExtendableError;

// This is taken from TypeScript compiler output, because it works quite reliably.
// There are various other methods though, so use whatever you like, if you have to use ES5.
var __extends =
  (this && this.__extends) ||
  (function() {
    var extendStatics =
      Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array &&
        function(d, b) {
          d.__proto__ = b;
        }) ||
      function(d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      };
    return function(d, b) {
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype =
        b === null
          ? Object.create(b)
          : ((__.prototype = b.prototype), new __());
    };
  })();

var CustomError = /** @class */ (function(_super) {
  __extends(CustomError, _super);
  function CustomError() {
    return (_super !== null && _super.apply(this, arguments)) || this;
  }
  return CustomError;
})(ExtendableError);

try {
  throw new CustomError("Optional Error message");
} catch (e) {
  if (e instanceof CustomError) {
    // ...
  } else {
    // ...
  }
}
```

**Please note that error names will not be displayed correctly if the error
class definitions get uglified, because the display of error messages relies on
`Function.prototype.name` to infer the correct error message.** You can
configure any uglifier to ignore certain function or class names, either via a
source code annotation or using a regex configuration parameter to decide which
properties to mangle.

## Tests

The module is extensively tested in JavaScript, ES6+ and TypeScript and works in
node.js as well as all browsers I have tested: All versions of Chrome 15+,
Firefox 3+, Safari 4+, Edge 14+, IE6+, Opera 10.6+, Yandex 14.12, various iOS
browsers down to the iPhone 3GS running iOS3 and the Android browser down to
Android 4. Note that I haven't test all versions of these browsers (except for
IE and Edge due to their notorious buggyness), but rather the oldest few and
more recent ones, because I would assume if they work in either of these, they
will work in all versions.

**If you encounter any issues, please file an issue and I will investigate and
fix it.**

You can run all tests together with `npm run test`, which will build all browser
tests and then execute the node and browser tests sequentially. All tests are
written in TypeScript and compiled to various targets to ensure compatibility.
All build configuration is in `tests/build`.

If you choose to build and run tests manually / individually, you first need to
run `npm run pretest:create-lib-symlinks`, which creates symlinks of the
TypeScript definition file in the `lib` directory.

### node.js tests

The node.js tests use `mocha` and `chai` together with `ts-node`. The test
source code is in `tests/node`. For node.js testing, the following commands
exist:

- `npm run test:node:cjs`: Test the CommonJs module `lib/cjs.js` with the
  compile target ES3.
- `npm run test:node:es`: Test the ES6+ module `lib/es.js` with the compile
  target `esnext`.
- `npm run test:node`: Run the CJS followed by the ES6+ tests.

Browser testing is a bit more complex. To ensure that the package is compatible
even with the oldest browsers, I had to create a few helper functions to emulate
the required functionality of `mocha` and `chai`. Old browsers like IE do not
have a console and various quirks, so it is necessary to execute the tests after
the DOM has loaded and write the results to the HTML body.

### Browser tests

You can build all browser tests with `npm run build:test` as well as in watch
mode with `npm run build:test:watch`. The test source code is in
`tests/browser/src`. This will run webpack to compile and bundle the test files
for various targets and copy some HTML files. The output will be in
`tests/browser/dist`, the bundled JS in `tests/browser/dist/js`. You can then
start the test with `npm run test:browser`. This will start `lite-server`, serve
the compiled files and should open a browser window automatically.

In the browser, you will see a navigation for testing of the scripts compiled to
targets ES3, ES5, ES6 and esnext. For each of these, you will have the option to
use print the results in the console or not. If you choose the console option,
the results will be printed in the console. If you choose the non-console option
or a console is not available in your browser, it will append the results to the
DOM.

If you would like to build some of the browser tests individually, the following
commands are available:

- `npm run build:test:browser:es3`: Build the test files for ES3
- `npm run build:test:browser:es3:watch`: Build the test files for ES3 in watch
  mode
- `npm run build:test:browser:es5`: Build the test files for ES5
- `npm run build:test:browser:es5:watch`: Build the test files for ES5 in watch
  mode
- `npm run build:test:browser:es6`: Build the test files for ES6
- `npm run build:test:browser:es6:watch`: Build the test files for ES6 in watch
  mode
- `npm run build:test:browser:esnext`: Build the test files for esnext
- `npm run build:test:browser:esnext:watch`: Build the test files for esnext in
  watch mode
- `npm run build:test:browser`: Execute all of the build commands concurrently
- `npm run build:test:browser:watch`: Execute all of the build commands
  concurrently in watch mode
- `npm run build:test`: Same as `npm run build:test:browser`
- `npm run build:test:watch`: Same as `npm run build:test:browser:watch`

## License

MIT (see [./LICENSE](./LICENSE)).
