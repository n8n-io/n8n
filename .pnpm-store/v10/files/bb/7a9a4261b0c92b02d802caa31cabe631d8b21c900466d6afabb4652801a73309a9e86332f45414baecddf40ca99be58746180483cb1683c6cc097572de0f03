# pug-code-gen

Default code-generator for pug.  It generates HTML via a JavaScript template function.

<!-- [![Build Status](https://img.shields.io/travis/pugjs/pug-code-gen/master.svg)](https://travis-ci.org/pugjs/pug-code-gen) -->
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-code-gen)](https://david-dm.org/pugjs/pug?path=packages/pug-code-gen)
[![npm version](https://img.shields.io/npm/v/pug-code-gen.svg)](https://www.npmjs.org/package/pug-code-gen)

## Installation

    npm install pug-code-gen

## Usage

```js
var generateCode = require('pug-code-gen');
```

### `generateCode(ast, options)`

Generate a JavaScript function string for the given AST.

`ast` is a fully expanded AST for Pug, with all inclusion, extends, and filters resolved.

`options` may contain the following properties that have the same meaning as the options with the same names in `pug`:

 - pretty (boolean): default is `false`
 - compileDebug (boolean): default is `true`
 - doctype (string): default is `undefined`
 - inlineRuntimeFunctions (boolean): default is `false`
 - globals (array of strings): default is `[]`
 - self (boolean): default is `false`

In addition to above, `pug-code-gen` has the following unique options:

 - includeSources (object): map of filename to source string; used if `compileDebug` is `true`; default is `undefined`
 - templateName (string): the name of the generated function; default is `'template'`

```js
var lex = require('pug-lexer');
var parse = require('pug-parser');
var wrap = require('pug-runtime/wrap');
var generateCode = require('pug-code-gen');

var funcStr = generateCode(parse(lex('p Hello world!')), {
  compileDebug: false,
  pretty: true,
  inlineRuntimeFunctions: false,
  templateName: 'helloWorld'
});
//=> 'function helloWorld(locals) { ... }'

var func = wrap(funcStr, 'helloWorld');
func();
//=> '\n<p>Hello world!</p>'
```

### `new generateCode.CodeGenerator(ast, options)`

The constructor for the internal class of the code generator. You shouldn't need to use this for most purposes.

## License

  MIT
