# assert-options

Smart `options`-object handling, with one line of code:

* throw detailed error on invalid options
* set default values for missing options  

Strongly-typed, built with TypeScript 4.x `strict` mode, for JavaScript clients.

## Rationale

* Passing in invalid or misspelled option names is one of the most common errors in JavaScript.
* Assigning defaults is the most common operation for methods that take options.  

This module automates proper options handling - parsing + setting defaults in one line.

Although this library is implemented in TypeScript, its objective is mainly to help JavaScript clients,
because TypeScript itself can handle invalid options and defaults natively. 

## Installation

```
$ npm i assert-options
```

## Usage

```js
const { assertOptions } = require('assert-options');

function functionWithOptions(options) {
    options = assertOptions(options, {first: 123, second: null});
    
    // options is a safe object here, with all missing defaults set.
}
```

When default values are not needed, you can just use an array of strings:

```js
function functionWithOptions(options) {
    options = assertOptions(options, ['first', 'second']);
    
    // the result is exactly the same as using the following:
    // options = assertOptions(options, {first: undefined, second: undefined});
    
    // options is a safe object here, without defaults.
}
```

You can override how errors are thrown, by creating the `assert` function yourself,
and specifying a custom handler:

```js
const {createAssert} = require('assert-options');

// must implement IOptionsErrorHandler protocol
class MyErrorHanler {
    handle(err, ctx) {
        // throw different errors, based on "err"
        // for reference, see DefaultErrorHandler implementation 
    }
}

const assert = createAssert(new MyErrorHanler());
```

## API

### `assertOptions(options, defaults)` 

* When `options` is `null`/`undefined`, new `{}` is returned, applying `defaults` as specified.

* When `options` contains an unknown property, [Error] `Option "name" is not recognized.` is thrown.

* When a property in `options` is missing or `undefined`, its value is set from the `defaults`,
provided it is available and its value is not `undefined`.

* When `options` is not `null`/`undefined`, it must be of type `object`, or else [TypeError] is thrown:
`Invalid "options" parameter: value`.
  
* Parameter `defaults` is required, as a non-`null` object or an array of strings, or else [TypeError]
is thrown: `Invalid "defaults" parameter: value`.

### `createAssert(handler)`

Creates a new assert function, using a custom error handler that implements `IOptionsErrorHandler` protocol.

For example, the default `assertOptions` is created internally like this:

```js
const {createOptions, DefaultErrorHandler} = require('assert-options');

const assertOptions = createAssert(new DefaultErrorHandler());
``` 

[Error]:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
[TypeError]:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
