TOML Parser for Node.js
=======================

[![Build Status](https://travis-ci.org/BinaryMuse/toml-node.png?branch=master)](https://travis-ci.org/BinaryMuse/toml-node)

[![NPM](https://nodei.co/npm/toml.png?downloads=true)](https://nodei.co/npm/toml/)

If you haven't heard of TOML, well you're just missing out. [Go check it out now.](https://github.com/mojombo/toml) Back? Good.

TOML Spec Support
-----------------

toml-node supports version 0.4.0 the TOML spec as specified by [mojombo/toml@v0.4.0](https://github.com/mojombo/toml/blob/master/versions/en/toml-v0.4.0.md)

Installation
------------

toml-node is available via npm.

    npm install toml

toml-node also works with browser module bundlers like Browserify and webpack.

Usage
-----

### Standalone

Say you have some awesome TOML in a variable called `someTomlString`. Maybe it came from the web; maybe it came from a file; wherever it came from, it came asynchronously! Let's turn that sucker into a JavaScript object.

```javascript
var toml = require('toml');
var data = toml.parse(someTomlString);
console.dir(data);
```

`toml.parse` throws an exception in the case of a parsing error; such exceptions have a `line` and `column` property on them to help identify the offending text.

```javascript
try {
  toml.parse(someCrazyKnuckleHeadedTrblToml);
} catch (e) {
  console.error("Parsing error on line " + e.line + ", column " + e.column +
    ": " + e.message);
}
```

### Streaming

As of toml-node version 1.0, the streaming interface has been removed. Instead, use a module like [concat-stream](https://npmjs.org/package/concat-stream):

```javascript
var toml = require('toml');
var concat = require('concat-stream');
var fs = require('fs');

fs.createReadStream('tomlFile.toml', 'utf8').pipe(concat(function(data) {
  var parsed = toml.parse(data);
}));
```

Thanks [@ForbesLindesay](https://github.com/ForbesLindesay) for the suggestion.

### Requiring with Node.js

You can use the [toml-require package](https://github.com/BinaryMuse/toml-require) to `require()` your `.toml` files with Node.js

Live Demo
---------

You can experiment with TOML online at http://binarymuse.github.io/toml-node/, which uses the latest version of this library.

Building & Testing
------------------

toml-node uses [the PEG.js parser generator](http://pegjs.majda.cz/).

    npm install
    npm run build
    npm test

Any changes to `src/toml.peg` requires a regeneration of the parser with `npm run build`.

toml-node is tested on Travis CI and is tested against:

 * Node 0.10
 * Node 0.12
 * Latest stable io.js

License
-------

toml-node is licensed under the MIT license agreement. See the LICENSE file for more information.
