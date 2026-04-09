# Path-to-RegExp

> Turn a path string such as `/user/:name` into a regular expression.

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][build-image]][build-url]
[![Build coverage][coverage-image]][coverage-url]
[![License][license-image]][license-url]

## Installation

```
npm install path-to-regexp --save
```

## Usage

```js
const {
  match,
  pathToRegexp,
  compile,
  parse,
  stringify,
} = require("path-to-regexp");
```

### Parameters

Parameters match arbitrary strings in a path by matching up to the end of the segment, or up to any proceeding tokens. They are defined by prefixing a colon to the parameter name (`:foo`). Parameter names can use any valid JavaScript identifier, or be double quoted to use other characters (`:"param-name"`).

```js
const fn = match("/:foo/:bar");

fn("/test/route");
//=> { path: '/test/route', params: { foo: 'test', bar: 'route' } }
```

### Wildcard

Wildcard parameters match one or more characters across multiple segments. They are defined the same way as regular parameters, but are prefixed with an asterisk (`*foo`).

```js
const fn = match("/*splat");

fn("/bar/baz");
//=> { path: '/bar/baz', params: { splat: [ 'bar', 'baz' ] } }
```

### Optional

Braces can be used to define parts of the path that are optional.

```js
const fn = match("/users{/:id}/delete");

fn("/users/delete");
//=> { path: '/users/delete', params: {} }

fn("/users/123/delete");
//=> { path: '/users/123/delete', params: { id: '123' } }
```

## Match

The `match` function returns a function for matching strings against a path:

- **path** String, `TokenData` object, or array of strings and `TokenData` objects.
- **options** _(optional)_ (Extends [pathToRegexp](#pathToRegexp) options)
  - **decode** Function for decoding strings to params, or `false` to disable all processing. (default: `decodeURIComponent`)

```js
const fn = match("/foo/:bar");
```

**Please note:** `path-to-regexp` is intended for ordered data (e.g. paths, hosts). It can not handle arbitrarily ordered data (e.g. query strings, URL fragments, JSON, etc).

## PathToRegexp

The `pathToRegexp` function returns the `regexp` for matching strings against paths, and an array of `keys` for understanding the `RegExp#exec` matches.

- **path** String, `TokenData` object, or array of strings and `TokenData` objects.
- **options** _(optional)_ (See [parse](#parse) for more options)
  - **sensitive** Regexp will be case sensitive. (default: `false`)
  - **end** Validate the match reaches the end of the string. (default: `true`)
  - **delimiter** The default delimiter for segments, e.g. `[^/]` for `:named` parameters. (default: `'/'`)
  - **trailing** Allows optional trailing delimiter to match. (default: `true`)

```js
const { regexp, keys } = pathToRegexp("/foo/:bar");

regexp.exec("/foo/123"); //=> ["/foo/123", "123"]
```

## Compile ("Reverse" Path-To-RegExp)

The `compile` function will return a function for transforming parameters into a valid path:

- **path** A string or `TokenData` object.
- **options** (See [parse](#parse) for more options)
  - **delimiter** The default delimiter for segments, e.g. `[^/]` for `:named` parameters. (default: `'/'`)
  - **encode** Function for encoding input strings for output into the path, or `false` to disable entirely. (default: `encodeURIComponent`)

```js
const toPath = compile("/user/:id");

toPath({ id: "name" }); //=> "/user/name"
toPath({ id: "café" }); //=> "/user/caf%C3%A9"

const toPathRepeated = compile("/*segment");

toPathRepeated({ segment: ["foo"] }); //=> "/foo"
toPathRepeated({ segment: ["a", "b", "c"] }); //=> "/a/b/c"

// When disabling `encode`, you need to make sure inputs are encoded correctly. No arrays are accepted.
const toPathRaw = compile("/user/:id", { encode: false });

toPathRaw({ id: "%3A%2F" }); //=> "/user/%3A%2F"
```

## Stringify

Transform a `TokenData` object to a Path-to-RegExp string.

- **data** A `TokenData` object.

```js
const data = {
  tokens: [
    { type: "text", value: "/" },
    { type: "param", name: "foo" },
  ],
};

const path = stringify(data); //=> "/:foo"
```

## Developers

- If you are rewriting paths with match and compile, consider using `encode: false` and `decode: false` to keep raw paths passed around.
- To ensure matches work on paths containing characters usually encoded, such as emoji, consider using [encodeurl](https://github.com/pillarjs/encodeurl) for `encodePath`.

### Parse

The `parse` function accepts a string and returns `TokenData`, which can be used with `match` and `compile`.

- **path** A string.
- **options** _(optional)_
  - **encodePath** A function for encoding input strings. (default: `x => x`, recommended: [`encodeurl`](https://github.com/pillarjs/encodeurl))

### Tokens

`TokenData` has two properties:

- **tokens** A sequence of tokens, currently of types `text`, `parameter`, `wildcard`, or `group`.
- **originalPath** The original path used with `parse`, shown in error messages to assist debugging.

### Custom path

In some applications you may not be able to use the `path-to-regexp` syntax, but you still want to use this library for `match` and `compile`. For example:

```js
import { match } from "path-to-regexp";

const tokens = [
  { type: "text", value: "/" },
  { type: "parameter", name: "foo" },
];
const originalPath = "/[foo]"; // To help debug error messages.
const path = { tokens, originalPath };
const fn = match(path);

fn("/test"); //=> { path: '/test', index: 0, params: { foo: 'test' } }
```

## Errors

An effort has been made to ensure ambiguous paths from previous releases throw an error. This means you might be seeing an error when things worked before.

### Missing parameter name

Parameter names must be provided after `:` or `*`, for example `/*path`. They can be valid JavaScript identifiers (e.g. `:myName`) or JSON strings (`:"my-name"`).

### Unexpected `?` or `+`

In past releases, `?`, `*`, and `+` were used to denote optional or repeating parameters. As an alternative, try these:

- For optional (`?`), use braces: `/file{.:ext}`.
- For one or more (`+`), use a wildcard: `/*path`.
- For zero or more (`*`), use both: `/files{/*path}`.

### Unexpected `(`, `)`, `[`, `]`, etc.

Previous versions of Path-to-RegExp used these for RegExp features. This version no longer supports them so they've been reserved to avoid ambiguity. To match these characters literally, escape them with a backslash, e.g. `"\\("`.

### Unterminated quote

Parameter names can be wrapped in double quote characters, and this error means you forgot to close the quote character. For example, `:"foo`.

### Express <= 4.x

Path-To-RegExp breaks compatibility with Express <= `4.x` in the following ways:

- The wildcard `*` must have a name and matches the behavior of parameters `:`.
- The optional character `?` is no longer supported, use braces instead: `/:file{.:ext}`.
- Regexp characters are not supported.
- Some characters have been reserved to avoid confusion during upgrade (`()[]?+!`).
- Parameter names now support valid JavaScript identifiers, or quoted like `:"this"`.

## License

MIT

[npm-image]: https://img.shields.io/npm/v/path-to-regexp
[npm-url]: https://npmjs.org/package/path-to-regexp
[downloads-image]: https://img.shields.io/npm/dm/path-to-regexp
[downloads-url]: https://npmjs.org/package/path-to-regexp
[build-image]: https://img.shields.io/github/actions/workflow/status/pillarjs/path-to-regexp/ci.yml?branch=master
[build-url]: https://github.com/pillarjs/path-to-regexp/actions/workflows/ci.yml?query=branch%3Amaster
[coverage-image]: https://img.shields.io/codecov/c/gh/pillarjs/path-to-regexp
[coverage-url]: https://codecov.io/gh/pillarjs/path-to-regexp
[license-image]: http://img.shields.io/npm/l/path-to-regexp.svg?style=flat
[license-url]: LICENSE.md
