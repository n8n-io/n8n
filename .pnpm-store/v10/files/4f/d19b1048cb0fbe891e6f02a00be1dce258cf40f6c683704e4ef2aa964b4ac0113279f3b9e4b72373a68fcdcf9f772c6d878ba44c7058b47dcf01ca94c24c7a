# node-ensure

A simple library that shims asynchronous module loading into Node.js to help
with building module bundlers and client-side loaders for isomorphic apps.
This library is super slim (read the source) and mainly represents an agreement
between developers and users of a particular bundler/loader.

NOTE: This module is *not* compatible with Browserify. It is for developers that
want to split their bundles for the client. For example, see
[dynapack](https://github.com/bauerca/dynapack).

*Syntax is inspired by the CommonJS
[Modules/Async/A](http://wiki.commonjs.org/wiki/Modules/Async/A) proposal.*


## Installation

```
npm install node-ensure
```

## Example

```js
var ensure = require('node-ensure');

ensure(['superagent', 'react'], function(err) {
  var request = require('superagent');
  var React = require('react');

  // Do the coolest of things.
});
```

If your bundler needs `require.ensure`, do this instead:

```js
require.ensure = require('node-ensure');

require.ensure(['superagent', 'react'], function(err) {
  var request = require('superagent');
  var React = require('react');

  // Do the coolest of things.
});
```

## Usage

The returned function takes an array of strings and a callback, in that
order (see the example above). The callback takes a single error argument, which
usually indicates a network problem or other client-side loader-specific runtime
error (it should never receive an error when used in Node.js).

Within the ensure callback, load modules with standard require calls.

## Bundlers/Loaders

This library primarily constitutes an agreement between users and developers of
module bundlers and (client-side) loaders. The users agree to the usage instructions
supplied above.

Bundlers and/or loaders must adhere to the following:

- The bundler/loader uses the package.json `"browser"` property for replacing
  server-only modules with browser-ready counterparts (a la Browserify).
- The `require` function passed to a module must have a `require.ensure`
  function.
- Each `require.ensure` must accept the same arguments as described in [Usage](#usage).
- Each `require.ensure` must not access variables via closure unless those variables
  are shared by **all** `require.ensure` functions.
- Each `require.ensure` may access properties
  on `this`. However, this assumes users have attached node-ensure to `require` via
  `require.ensure = require('node-ensure')`.

Happy loading!

# License

MIT
