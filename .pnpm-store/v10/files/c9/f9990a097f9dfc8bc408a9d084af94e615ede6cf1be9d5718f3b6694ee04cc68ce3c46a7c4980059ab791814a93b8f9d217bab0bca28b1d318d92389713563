# ES6-Promise (subset of [rsvp.js](https://github.com/tildeio/rsvp.js)) [![Build Status](https://travis-ci.org/stefanpenner/es6-promise.svg?branch=master)](https://travis-ci.org/stefanpenner/es6-promise)

This is a polyfill of the [ES6 Promise](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-promise-constructor). The implementation is a subset of [rsvp.js](https://github.com/tildeio/rsvp.js) extracted by @jakearchibald, if you're wanting extra features and more debugging options, check out the [full library](https://github.com/tildeio/rsvp.js).

For API details and how to use promises, see the <a href="http://www.html5rocks.com/en/tutorials/es6/promises/">JavaScript Promises HTML5Rocks article</a>.

## Downloads

* [es6-promise 27.86 KB (7.33 KB gzipped)](https://raw.githubusercontent.com/stefanpenner/es6-promise/master/dist/es6-promise.js)
* [es6-promise-min 6.17 KB (2.4 KB gzipped)](https://raw.githubusercontent.com/stefanpenner/es6-promise/master/dist/es6-promise.min.js)

## Node.js

To install:

```sh
npm install es6-promise
```

To use:

```js
var Promise = require('es6-promise').Promise;
```

## Bower

To install:

```sh
bower install es6-promise --save
```


## Usage in IE<9

`catch` is a reserved word in IE<9, meaning `promise.catch(func)` throws a syntax error. To work around this, you can use a string to access the property as shown in the following example.

However, please remember that such technique is already provided by most common minifiers, making the resulting code safe for old browsers and production:

```js
promise['catch'](function(err) {
  // ...
});
```

Or use `.then` instead:

```js
promise.then(undefined, function(err) {
  // ...
});
```

## Auto-polyfill

To polyfill the global environment (either in Node or in the browser via CommonJS) use the following code snippet:

```js
require('es6-promise').polyfill();
```

Notice that we don't assign the result of `polyfill()` to any variable. The `polyfill()` method will patch the global environment (in this case to the `Promise` name) when called.

## Building & Testing

You will need to have PhantomJS installed globally in order to run the tests.

`npm install -g phantomjs`

* `npm run build` to build
* `npm test` to run tests
* `npm start` to run a build watcher, and webserver to test
* `npm run test:server` for a testem test runner and watching builder
