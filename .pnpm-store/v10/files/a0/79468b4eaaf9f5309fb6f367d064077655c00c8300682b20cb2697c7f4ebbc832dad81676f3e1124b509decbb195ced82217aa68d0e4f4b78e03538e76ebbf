# lazy-ass

> Lazy assertions without performance penalty

[![NPM][lazy-ass-icon] ][lazy-ass-url]

[![Build status][lazy-ass-ci-image] ][lazy-ass-ci-url]
[![manpm](https://img.shields.io/badge/manpm-compatible-3399ff.svg)](https://github.com/bahmutov/manpm)
[![dependencies][lazy-ass-dependencies-image] ][lazy-ass-dependencies-url]
[![devdependencies][lazy-ass-devdependencies-image] ][lazy-ass-devdependencies-url]

[![semantic-release][semantic-image] ][semantic-url]
[![Coverage Status][lazy-ass-coverage-image]][lazy-ass-coverage-url]
[![Codacy][lazy-ass-codacy-image]][lazy-ass-codacy-url]
[![Code Climate][lazy-ass-code-climate-image]][lazy-ass-code-climate-url]

[Demo](http://glebbahmutov.com/lazy-ass/)

Is the current code breaking dependencies if released?
[![Dont-break][circle-ci-image] ][circle-ci-url] - checks using
[dont-break](https://github.com/bahmutov/dont-break)
[circle-ci-image]: https://circleci.com/gh/bahmutov/lazy-ass.svg?style=svg
[circle-ci-url]: https://circleci.com/gh/bahmutov/lazy-ass

## Example

Regular assertions evaluate all arguments and concatenate message
EVERY time, even if the condition is true.

```js
console.assert(typeof foo === 'object',
  'expected ' + JSON.stringify(foo, null, 2) + ' to be an object');
```

Lazy assertion function evaluates its arguments and forms
a message ONLY IF the condition is false

```js
lazyAss(typeof foo === 'object', 'expected', foo, 'to be an object');
```

Concatenates strings, stringifies objects, calls functions - only if
condition is false.

```js
function environment() {
  // returns string
}
var user = {} // an object
lazyAsync(condition, 'something went wrong for', user, 'in', environment);
// throws an error with message equivalent of
// 'something went wrong for ' + JSON.stringify(user) + ' in ' + environment()
```

## Why?

* Passing an object reference to a function is about
[2000-3000 times faster](http://jsperf.com/object-json-stringify)
than serializing an object and passing it as a string.
* Concatenating 2 strings before passing to a function is about
[30% slower](http://jsperf.com/string-concat-vs-pass-string-reference)
than passing 2 separate strings.

## Install

Node: `npm install lazy-ass --save` then `var la = require('lazy-ass');`.
You can attach the methods to the global object using
`require('lazy-ass').globalRegister();`.

Browser: `bower install lazy-ass --save`, include `index.js`,
attaches functions `lazyAss` and `la` to `window` object.

## Notes

You can pass as many arguments to *lazyAss* after the condition. The condition
will be evaluated every time (this is required for any assertion). The rest of arguments
will be concatenated according to rules

* string will be left unchanged.
* function will be called and its output will be concatenated.
* any array or object will be JSON stringified.

There will be single space between the individual parts.

## Lazy async assertions

Sometimes you do not want to throw an error synchronously, breaking the entire
execution stack. Instead you can throw an error asynchronously using `lazyAssync`,
which internally implements logic like this:

```js
if (!condition) {
  setTimeout(function () {
    throw new Error('Conditions is false!');
  }, 0);
}
```

This allows the execution to continue, while your global error handler (like
my favorite [Sentry](http://glebbahmutov.com/blog/know-unknown-unknowns-with-sentry/))
can still forward the error with all specified information to your server.

```js
lazyAss.async(false, 'foo');
console.log('after assync');
// output
after assync
Uncaught Error: foo
```

In this case, there is no meaningful error stack, so use good message
arguments - there is no performance penalty!

## Rethrowing errors

If the condition itself is an instance of Error, it is simply rethrown (synchronously or
asynchronously).

```js
lazyAss(new Error('foo'));
// Uncaught Error: foo
```

Useful to make sure errors in the promise chains are
[not silently ignored](https://glebbahmutov.com/blog/why-promises-need-to-be-done/).

For example, a rejected promise below this will be ignored.

```js
var p = new Promise(function (resolve, reject) {
  reject(new Error('foo'));
});
p.then(...);
```

We can catch it and rethrow it *synchronously*, but it will be ignored too (same way,
only one step further)

```js
var p = new Promise(function (resolve, reject) {
  reject(new Error('foo'));
});
p.then(..., lazyAss);
```

But we can actually trigger global error if we rethrow the error *asynchronously*

```js
var p = new Promise(function (resolve, reject) {
  reject(new Error('foo'));
});
p.then(..., lazyAssync);
// Uncaught Error: foo
```

## Predicate function as a condition

Typically, JavaScript evaluates the condition expression first, then calls *lazyAss*.
This means the function itself sees only the true / false result, and not the expression
itself. This makes makes the error messages cryptic

    lazyAss(2 + 2 === 5);
    // Error

We usually get around this by giving at least one additional message argument to
explain the condition tested

    lazyAss(2 + 2 === 5, 'addition')
    // Error: addition

*lazyAss* has a better solution: if you give a function that evaluates the condition
expression, if the function returns false, the error message will include the source
of the function, making the extra arguments unnecessary

    lazyAss(function () { return 2 + 2 === 5; });
    // Error: function () { return 2 + 2 === 5; }

The condition function has access to any variables in the scope, making it extremely
powerful

    var foo = 2, bar = 2;
    lazyAss(function () { return foo + bar === 5; });
    // Error: function () { return foo + bar === 5; }

In practical terms, I recommend using separate predicates function and
passing relevant values to the *lazyAss* function. Remember, there is no performance
penalty!

    var foo = 2, bar = 2;
    function isValidPair() {
      return foo + bar === 5;
    }
    lazyAss(isValidPair, 'foo', foo, 'bar', bar);
    // Error: function isValidPair() {
    //   return foo + bar === 5;
    // } foo 2 bar 2

## Testing

This library is fully tested under Node and inside browser environment (CasperJs).
I described how one can test asynchronous assertion throwing in your own projects
using Jasmine in [a blog post](http://glebbahmutov.com/blog/testing-async-lazy-assertion/).

## TypeScript

If you use this function from a TypeScript project, we provide ambient type
definition file. Because this is CommonJS library, use it like this

```ts
import la = require('lazy-ass')
// la should have type signature
```

### Small print

Author: Gleb Bahmutov &copy; 2014

* [@bahmutov](https://twitter.com/bahmutov)
* [glebbahmutov.com](http://glebbahmutov.com)
* [blog](http://glebbahmutov.com/blog)

License: MIT - do anything with the code, but don't blame me if it does not work.

Spread the word: tweet, star on github, etc.

Support: if you find any problems with this module, email / tweet /
[open issue](https://github.com/bahmutov/lazy-ass/issues) on Github

## MIT License

Copyright (c) 2014 Gleb Bahmutov

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

[lazy-ass-icon]: https://nodei.co/npm/lazy-ass.svg?downloads=true
[lazy-ass-url]: https://npmjs.org/package/lazy-ass
[lazy-ass-ci-image]: https://travis-ci.org/bahmutov/lazy-ass.svg?branch=master
[lazy-ass-ci-url]: https://travis-ci.org/bahmutov/lazy-ass
[lazy-ass-coverage-image]: https://coveralls.io/repos/bahmutov/lazy-ass/badge.svg
[lazy-ass-coverage-url]: https://coveralls.io/r/bahmutov/lazy-ass
[lazy-ass-code-climate-image]: https://codeclimate.com/github/bahmutov/lazy-ass/badges/gpa.svg
[lazy-ass-code-climate-url]: https://codeclimate.com/github/bahmutov/lazy-ass
[lazy-ass-codacy-image]: https://www.codacy.com/project/badge/b60a0810c9af4fe4b2ae685932dbbdb8
[lazy-ass-codacy-url]: https://www.codacy.com/public/bahmutov/lazy-ass.git
[lazy-ass-dependencies-image]: https://david-dm.org/bahmutov/lazy-ass.svg
[lazy-ass-dependencies-url]: https://david-dm.org/bahmutov/lazy-ass
[lazy-ass-devdependencies-image]: https://david-dm.org/bahmutov/lazy-ass/dev-status.svg
[lazy-ass-devdependencies-url]: https://david-dm.org/bahmutov/lazy-ass#info=devDependencies
[semantic-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-url]: https://github.com/semantic-release/semantic-release
