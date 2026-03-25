# pug-attrs

Generate code for Pug attributes

[![Build Status](https://img.shields.io/travis/pugjs/pug-attrs/master.svg)](https://travis-ci.org/pugjs/pug-attrs)
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-attrs)](https://david-dm.org/pugjs/pug?path=packages/pug-attrs)
[![NPM version](https://img.shields.io/npm/v/pug-attrs.svg)](https://www.npmjs.org/package/pug-attrs)

## Installation

    npm install pug-attrs

## Usage

```js
var compileAttrs = require('pug-attrs');
```

### `compileAttrs(attrs, options)`

Compile `attrs` to a JavaScript string that evaluates to the attributes in the desired format.

`options` MUST include the following properties:

- `terse`: whether or not to use HTML5-style terse boolean attributes
- `runtime`: callback that takes a runtime function name and returns the source code that will evaluate to that function at runtime
- `format`: output format; must be `html` or `object`

`attrs` is an array of attributes, with each attribute having the form of `{ name, val, mustEscape }`. `val` represents a JavaScript string that evaluates to the value of the attribute, either statically or dynamically.

```js
var compileAttrs = require('pug-attrs');
var pugRuntime = require('pug-runtime');

function getBaz () { return 'baz<>'; }

var attrs = [
  {name: 'foo',  val: '"bar"',    mustEscape: true },
  {name: 'baz',  val: 'getBaz()', mustEscape: true },
  {name: 'quux', val: true,       mustEscape: false}
];
var result, finalResult;

// HTML MODE
result = compileAttrs(attrs, {
  terse:   true,
  format:  'html',
  runtime: function (name) { return 'pugRuntime.' + name; }
});
//=> '" foo=\\"bar\\"" + pugRuntime.attr("baz", getBaz(), true, true) + " quux"'

finalResult = Function('pugRuntime, getBaz',
  'return (' + result + ');'
);
finalResult(pugRuntime, getBaz);
// => ' foo="bar" baz="baz&lt;&gt;" quux'

// OBJECT MODE
result = compileAttrs(attrs, {
  terse:   true,
  format:  'object',
  runtime: function (name) { return 'pugRuntime.' + name; }
});
//=> '{"foo": "bar","baz": pugRuntime.escape(getBaz()),"quux": true}'

finalResult = Function('pugRuntime, getBaz',
  'return (' + result + ');'
);
finalResult(pugRuntime, getBaz);
//=> { foo: 'bar', baz: 'baz&lt;&gt;', quux: true }
```

## License

  MIT
