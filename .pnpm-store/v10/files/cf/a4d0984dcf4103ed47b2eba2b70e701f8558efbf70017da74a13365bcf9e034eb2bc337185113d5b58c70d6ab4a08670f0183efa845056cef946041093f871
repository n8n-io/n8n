# lie
<a href="http://promises-aplus.github.com/promises-spec">
  <img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png"
       alt="Promises/A+ logo" title="Promises/A+ 1.1 compliant" align="right" />
</a> [![Build Status](https://travis-ci.org/calvinmetcalf/lie.svg)](https://travis-ci.org/calvinmetcalf/lie)

lie is a small, performant promise library implementing the [Promises/A+ spec](http://promises-aplus.github.com/promises-spec/) (Version 1.1).

Originally a fork of [Ruben Verborgh](https://github.com/RubenVerborgh)'s [promiscuous](https://github.com/RubenVerborgh/promiscuous), with version 2.6 it became a fork of [ayepromise](https://github.com/cburgmer/ayepromise) by [Chris Burgmer](https://github.com/cburgmer).

```bash
npm install lie

```

```javascript
var Promise = require('lie');
// or use the pollyfill
require('lie/polyfill');
```

## Usage

Either use it with [browserify](http://browserify.org/) (recommended) or grab one of the files from the dist folder:

- lie.js/lie.min.js exposes 'Promise' either as a UMD module or from the global scope, depending on if a CJS or AMD loader is available.
- lie.polyfill.js/lie.polyfill.min.js adds 'Promise' to the global scope only if it's not already defined (not a UMD).

## API

Implements the standard ES6 api:

```js
new Promise(function(resolve, reject){
    doSomething(function(err, result) {
        if (err) {
            reject(err);
        } else {
            resolve(result);
        }
    });
}).then(function (value) {
    //on success
}, function (reason) {
    //on error
}).catch(function (reason) {
    //shortcut for error handling
});

Promise.all([
    //array of promises or values
]).then(function ([/* array of results */]));

Promise.race([
    //array of promises or values
]);
// either resolves or rejects depending on the first value to do so
```

## Unhandled Rejections

In Node.js, lie emits an `unhandledRejection` event when a rejected promise isn't caught, in line with [how io.js does it](https://iojs.org/api/process.html#process_event_unhandledrejection). This allows it to act as a promise shim in both Node.js and the browser.
