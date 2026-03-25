# console-browserify [![Build Status](https://travis-ci.org/browserify/console-browserify.png?branch=master)](https://travis-ci.org/browserify/console-browserify)

Emulate console for all the browsers

## Install

You usually do not have to install `console-browserify` yourself! If your code runs in Node.js, `console` is built in. If your code runs in the browser, bundlers like [browserify](https://github.com/browserify/browserify) or [webpack](https://github.com/webpack/webpack) also include the `console-browserify` module when you do `require('console')`.

But if none of those apply, with npm do:

```
npm install console-browserify
```

## Usage

```js
var console = require("console")
// Or when manually using console-browserify directly:
// var console = require("console-browserify")

console.log("hello world!")
```

## API

See the [Node.js Console docs](https://nodejs.org/api/console.html). `console-browserify` does not support creating new `Console` instances and does not support the Inspector-only methods.

## Contributing

PRs are very welcome! The main way to contribute to `console-browserify` is by porting features, bugfixes and tests from Node.js. Ideally, code contributions to this module are copy-pasted from Node.js and transpiled to ES5, rather than reimplemented from scratch. Matching the Node.js code as closely as possible makes maintenance simpler when new changes land in Node.js.
This module intends to provide exactly the same API as Node.js, so features that are not available in the core `console` module will not be accepted. Feature requests should instead be directed at [nodejs/node](https://github.com/nodejs/node) and will be added to this module once they are implemented in Node.js.

If there is a difference in behaviour between Node.js's `console` module and this module, please open an issue!

## Contributors

 - Raynos

## License

[MIT](./LICENSE)
