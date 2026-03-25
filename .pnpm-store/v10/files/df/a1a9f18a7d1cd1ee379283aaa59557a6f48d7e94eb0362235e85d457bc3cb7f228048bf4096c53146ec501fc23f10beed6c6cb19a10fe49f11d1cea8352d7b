# pug-runtime

The runtime components for the pug templating language

[![Build Status](https://img.shields.io/travis/pugjs/pug-runtime/master.svg)](https://travis-ci.org/pugjs/pug-runtime)
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-runtime)](https://david-dm.org/pugjs/pug?path=packages/pug-runtime)
[![DevDependencies Status](https://david-dm.org/pugjs/pug/dev-status.svg?path=packages/pug-runtime)](https://david-dm.org/pugjs/pug?path=packages/pug-runtime&type=dev)
[![NPM version](https://img.shields.io/npm/v/pug-runtime.svg)](https://www.npmjs.org/package/pug-runtime)

## Installation

    npm install pug-runtime

## Usage


You can call runtime methods directly using `runtime.method`.  This is particularly useful when compiling to deal with things that are already known at compile time.

```js
var runtime = require('pug-runtime');

assert(runtime.attr('foo', 'bar', true, true) === ' foo="bar"');
```

You can also build a string with a given list of functions available as `pug_method` by calling `build(arrayOfMethods)`.  This is useful for inlining runtime functions within the compiled templates.

```js
var build = require('pug-runtime/build');
var src = build(['attr']);

var attr = Function('', src + ';return pug_attr;')();
assert(attr('foo', 'bar', true, true) === ' foo="bar"');
```

When testing code compiled for the browser in Node.js, it is necessary to make the runtime available. To do so, one can use `require('pug-runtime/wrap')`:

```js
var pug = require('pug');
var wrap = require('pug-runtime/wrap');

var pugSrc = 'p= content';
// By default compileClient automatically embeds the needed runtime functions,
// rendering this module useless.
var compiledCode = pug.compileClient(pugSrc, {
  externalRuntime: true
});
//=> 'function template (locals) { ... pug.escape() ... }'

var templateFunc = wrap(compiledCode);
templateFunc({content: 'Hey!'});
//=> '<p>Hey!</p>'

// Change template function name to 'heyTemplate'
compiledCode = pug.compileClient(pugSrc, {
  externalRuntime: true,
  name: 'heyTemplate'
});
//=> 'function heyTemplate (locals) { ... }'

templateFunc = wrap(compiledCode, 'heyTemplate');
templateFunc({content: 'Hey!'});
//=> '<p>Hey!</p>'
```


## License

  MIT
