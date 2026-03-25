[![Build status][build-image]][build-url]
[![Tests coverage][cov-image]][cov-url]
[![npm version][npm-image]][npm-url]

# esniff

## Low footprint JavaScript source code parser

Low footprint, fast source code parser, which allows you to find all code fragment occurrences with respect to all syntax rules that cannot be handled with plain regular expression search.

It aims at use cases where we don't need full AST tree, but instead we're interested in finding usages of given function, property etc. in syntactically valid code.

### Installation

#### npm

    $ npm install esniff

### Usage

Using main module you can configure sophisticated parser on your own. However, first, **see preprared [API utilities](#API) that may already address use cases you have**.

#### esniff(code, executor)

- `code` - Code to parse
- `executor` - A function to be executed immediately by the constructor, It receives an `emitter` parameter.

`emitter` emits following events:

- `trigger:<char>` - When char is a code character approached in code, that is not a whitespaces, is not in a middle of identificator, is not part of a comment, string, template string or regular expression.

Emitter passes to listener and `accessor` object, which provides access to current parser state and allows to manipulate parsing process. `accessor` exposes following methods:

- `skipCodePart(codePart)` - Skips forward through input _codePart_ assuming parser index points start of given part. Returns true if given `codePart` was found and index and skipped
- `skipIdentifier` - Skips approached identifier (can be function name or property name), returns `{ name, start, end }` meta object
- `skipWhitespace` - Skips any whitespace and comments founds at current parsing index
- `collectScope` - If at current index `(` character is found, it registers given paranthesis scope for registrations (it's content will be returned as one of the results after finished parsing)
- `stop` - Stops parsing process
- `index` - Returns currently parsed index
- `previousToken` - Previous non-whitespace character
- `scopeDepth` - Current scope depth
- `shouldCollectComments` - Whether data about code comments should be collected in the result

##### Example

Parse all `require(..)` calls:

```javascript
var esniff = require("esniff");

var parseRequires = function (code) {
  return esniff(code, function (emitter) {
    emitter.on("trigger:r", function (accessor) {
      if (accessor.previousToken === ".") return;
      if (!accessor.skipCodePart("require")) return;
      accessor.skipWhitespace();
      accessor.collectScope();
    });
  });
};

console.log(parseRequires("var x = require('foo/bar')"));
[{ type: "scope", point: 17, column: 17, line: 1, raw: "'foo/bar'" }];
```

#### Predefined utils for common use cases

#### accessedProperties(objName) _(esniff/accessed-properties)_

Returns function which allows us to find all accessed property names on given object name

```javascript
var findProperties = require("esniff/accessed-properties");
var findContextProperties = findProperties("this");

var result = findContextProperties(
  "var foo = \"0\"; this.bar = foo; this.someMethod(); otherFunction()"
);
console.log(result); // [ { name: 'bar', start: 20, end: 23 }, { name: 'someMethod', start: 36, end: 46 } ]
```

#### function(name[, options]) _(esniff/function)_

Returns function which allows us to find all occurrences of given function (or method) being invoked

Through options we can restrict cases which we're after:

- `asProperty` (default: `false`), on true will allow `x.name()` when we search for `name` calls
- `asPlain` (default: `true`), on true it allows plain calls e.g. `name()` when we search for `name`. Should be set to `false` if we're strictly about method calls.

Setting both `asProperty` and `asPlain` to false, will always produce empty result

```javascript
var findRequires = require("esniff/function")("require");

findRequires("var x = require('foo/bar')");
// [{ point: 17, column: 17, line: 1, raw: '\'foo/bar\'' }]
```

#### resolveArguments(code[, limit]) _(esniff/resolve-arguments)_

Resolves expressions separated with commas, with additional `limit` you can specify after which number of arguments resolver should stop

```javascript
var resolveArgs = require("esniff/resolve-arguments");

var result = resolveArgs("'raz', 'dwa', ['raz', 'dwa'], 'trzy'", 3);

console.log(result); // ['"raz"', ' "dwa"', ' [\'raz\', \'dwa\']']
```

### Limitations

- _esniff_ assumes code that you pass is syntactically correct, it won't inform you about any syntax errors and may produce unexpected and nonsense results when such code is used.
- There's single case of syntactically correct code, which will make _esniff_ produce incorrect results, it's division made directly on object literal (e.g. `x = { foo: 'bar' } / 14`, esniff in that case will assume that `/` starts regular expression). Still there's not known use case where such code may make any sense, and many popular JS source code parsers share very same vulnerability.

## Tests

    $ npm test

## Security contact information

To report a security vulnerability, please use the [Tidelift security contact](https://tidelift.com/security). Tidelift will coordinate the fix and disclosure.

[build-image]: https://github.com/medikoo/esniff/workflows/Integrate/badge.svg
[build-url]: https://github.com/medikoo/esniff/actions?query=workflow%3AIntegrate
[cov-image]: https://img.shields.io/codecov/c/github/medikoo/esniff.svg
[cov-url]: https://codecov.io/gh/medikoo/esniff
[npm-image]: https://img.shields.io/npm/v/esniff.svg
[npm-url]: https://www.npmjs.com/package/esniff
