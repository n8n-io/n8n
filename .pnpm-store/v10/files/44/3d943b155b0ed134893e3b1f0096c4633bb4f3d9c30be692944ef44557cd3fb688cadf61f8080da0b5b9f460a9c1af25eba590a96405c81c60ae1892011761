`jju` - a set of utilities to work with JSON / JSON5 documents

[![npm version badge](https://img.shields.io/npm/v/jju.svg)](https://www.npmjs.org/package/jju)
[![travis badge](http://img.shields.io/travis/rlidwka/jju.svg)](https://travis-ci.org/rlidwka/jju)
[![downloads badge](http://img.shields.io/npm/dm/jju.svg)](https://www.npmjs.org/package/jju)

## Installation

```
yarn add jju
```

or

```
npm install jju
```

## Usage

This module provides following functions:

1. [jju.parse()](#jjuparse-function) parses json/json5 text and returns a javascript value it corresponds to
2. [jju.stringify()](#jjustringify-function) converts javascript value to an appropriate json/json5 text
3. [jju.tokenize()](#jjutokenize-function) parses json/json5 text and returns an array of tokens it consists of ([see demo](http://rlidwka.github.io/jju/tokenizer.html))
4. [jju.analyze()](#jjuanalyze-function) parses json/json5 text and tries to guess indentation, quoting style, etc.
5. [jju.update()](#jjuupdate-function) changes json/json5 text, preserving original formatting as much as possible ([see demo](http://rlidwka.github.io/jju/editor.html))

All functions are able to work with a standard JSON documents. `jju.parse()` and `jju.stringify()` are better in some cases, but slower than native `JSON.parse()` and `JSON.stringify()` versions. Detailed description see below.

### jju.parse() function

```javascript
/*
 * Main syntax:
 *
 * `text` - text to parse, type: String
 * `options` - parser options, type: Object
 */
jju.parse(text[, options])

// compatibility syntax
jju.parse(text[, reviver])
```

Options:

 - reserved\_keys - what to do with reserved keys (String, default="ignore")
   - "ignore" - ignore reserved keys
   - "throw" - throw SyntaxError in case of reserved keys
   - "replace" - replace reserved keys, this is the default JSON.parse behaviour, unsafe

     Reserved keys are keys that exist in an empty object (`hasOwnProperty`, `__proto__`, etc.).

```javascript
// 'ignore' will cause reserved keys to be ignored:
parse('{hasOwnProperty: 1}', {reserved_keys: 'ignore'}) == {}
parse('{hasOwnProperty: 1, x: 2}', {reserved_keys: 'ignore'}).hasOwnProperty('x') == true

// 'throw' will cause SyntaxError in these cases:
parse('{hasOwnProperty: 1}', {reserved_keys: 'throw'}) == SyntaxError

// 'replace' will replace reserved keys with new ones:
parse('{hasOwnProperty: 1}', {reserved_keys: 'replace'}) == {hasOwnProperty: 1}
parse('{hasOwnProperty: 1, x: 2}', {reserved_keys: 'replace'}).hasOwnProperty('x') == TypeError
```


 - null\_prototype - create object as Object.create(null) instead of '{}' (Boolean)

   if `reserved_keys != 'replace'`, default is **false**

   if `reserved_keys == 'replace'`, default is **true**

   It is usually unsafe and not recommended to change this option to false in the last case.

 - reviver - reviver function - Function

   This function should follow JSON specification

 - mode - operation mode, set it to 'json' if you want to throw on non-strict json files (String)

### jju.stringify() function

```javascript
/*
 * Main syntax:
 *
 * `value` - value to serialize, type: *
 * `options` - serializer options, type: Object
 */
jju.stringify(value[, options])

// compatibility syntax
jju.stringify(value[, replacer [, indent])
```

Options:

 - ascii - output ascii only (Boolean, default=false)
   If this option is enabled, output will not have any characters except of 0x20-0x7f.

 - indent - indentation (String, Number or Boolean, default='\t')
   This option follows JSON specification.

 - quote - enquoting char (String, "'" or '"', default="'")
 - quote\_keys - whether keys quoting in objects is required or not (String, default=false)
   If you want `{"q": 1}` instead of `{q: 1}`, set it to true.

 - sort\_keys - sort all keys while stringifying (Boolean or Function, default=false)
   By default sort order will depend on implementation, with v8 it's insertion order. If set to `true`, all keys (but not arrays) will be sorted alphabetically. You can provide your own sorting function as well.

 - replacer - replacer function or array (Function or Array)
   This option follows JSON specification.

 - no\_trailing\_comma = don't output trailing comma (Boolean, default=false)
   If this option is set, arrays like this `[1,2,3,]` will never be generated. Otherwise they may be generated for pretty printing.

 - mode - operation mode, set it to 'json' if you want correct json in the output (String)

   Currently it's either 'json' or something else. If it is 'json', following options are implied:

   - options.quote = '"'
   - options.no\_trailing\_comma = true
   - options.quote\_keys = true
   - '\x' literals are not used

### jju.tokenize() function

```javascript
/*
 * Main syntax:
 *
 * `text` - text to tokenize, type: String
 * `options` - parser options, type: Object
 */
jju.tokenize(text[, options])
```

Options are the same as for the `jju.parse` function.

Return value is an array of tokens, where each token is an object:

 - raw (String) - raw text of this token, if you join all raw's, you will get the original document
 - type (String) - type of the token, can be `whitespace`, `comment`, `key`, `literal`, `separator` or `newline`
 - stack (Array) - path to the current token in the syntax tree
 - value - value of the token if token is a `key` or `literal`

You can check tokenizer for yourself using [this demo](http://rlidwka.github.io/jju/tokenizer.html).

### jju.analyze() function

```javascript
/*
 * Main syntax:
 *
 * `text` - text to analyze, type: String
 * `options` - parser options, type: Object
 */
jju.analyze(text[, options])
```

Options are the same as for the `jju.parse` function.

Return value is an object defining a programming style in which the document was written.

 - indent (String) - preferred indentation
 - newline (String) - preferred newline
 - quote (String) - `"` or `'` depending on which quote is preferred
 - quote\_keys (Boolean) - `true` if unquoted keys were used at least once
 - has\_whitespace (Boolean) - `true` if input has a whitespace token
 - has\_comments (Boolean) - `true` if input has a comment token
 - has\_newlines (Boolean) - `true` if input has a newline token
 - has\_trailing\_comma (Boolean) - `true` if input has at least one trailing comma

### jju.update() function

```javascript
/*
 * Main syntax:
 *
 * `text` - original text, type: String
 * `new_value` - new value you want to set
 * `options` - parser or stringifier options, type: Object
 */
jju.update(text, new_value[, options])
```

If you want to update a JSON document, here is the general approach:

```javascript
// here is your original JSON document:
var input = '{"foo": "bar", "baz": 123}'

// you need to parse it first:
var json = jju.parse(input, {mode: 'json'})
// json is { foo: 'bar', baz: 123 }

// then you can change it as you like:
json.foo = 'quux'
json.hello = 'world'

// then you run an update function to change the original json:
var output = jju.update(input, json, {mode: 'json'})
// output is '{"foo": "quux", "baz": 123, "hello": "world"}'
```

Look at [this demo](http://rlidwka.github.io/jju/editor.html) to test various types of json.

## Advantages over existing JSON libraries

In a few cases it makes sense to use this module instead of built-in JSON methods.

Parser:
 - better error reporting with source code and line numbers

In case of syntax error, JSON.parse does not return any good information to the user. This module does:

```
$ node -e 'require("jju").parse("[1,1,1,1,invalid]")'

SyntaxError: Unexpected token 'i' at 0:9
[1,1,1,1,invalid]
         ^
```

This module is about 5 times slower, so if user experience matters to you more than performance, use this module. If you're working with a lot of machine-generated data, use JSON.parse instead.

Stringifier:
 - util.inspect-like pretty printing

This module behaves more smart when dealing with object and arrays, and does not always print newlines in them:

```
$ node -e 'console.log(require("./").stringify([[,,,],,,[,,,,]], {mode:"json"}))'
[
        [null, null, null],
        null,
        null,
        [null, null, null, null]
]
```

JSON.stringify will split this into 15 lines, and it's hard to read.

Yet again, this feature comes with a performance hit, so if user experience matters to you more than performance, use this module. If your JSON will be consumed by machines, use JSON.stringify instead.

As a rule of thumb, if you use "space" argument to indent your JSON, you'd better use this module instead.

