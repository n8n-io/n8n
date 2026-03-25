# ufo

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![Codecov][codecov-src]][codecov-href]

URL utils for humans.

## Install

Install using npm or your favourite package manager:

Install package:

```sh
# npm
npm install ufo

# yarn
yarn add ufo

# pnpm
pnpm install ufo

# bun
bun install ufo
```

Import utils:

```js
// ESM
import { normalizeURL, joinURL } from "ufo";

// CommonJS
const { normalizeURL, joinURL } = require("ufo");

// Deno
import { parseURL } from "https://unpkg.com/ufo/dist/index.mjs";
```

<!-- automd:jsdocs src=./src defaultGroup=utils -->

## Encoding Utils

### `decode(text)`

Decodes text using `decodeURIComponent`. Returns the original text if it fails.

### `decodePath(text)`

Decodes path section of URL (consistent with encodePath for slash encoding).

### `decodeQueryKey(text)`

Decodes query key (consistent with `encodeQueryKey` for plus encoding).

### `decodeQueryValue(text)`

Decodes query value (consistent with `encodeQueryValue` for plus encoding).

### `encode(text)`

Encodes characters that need to be encoded in the path, search and hash sections of the URL.

### `encodeHash(text)`

Encodes characters that need to be encoded in the hash section of the URL.

### `encodeHost(name)`

Encodes hostname with punycode encoding.

### `encodeParam(text)`

Encodes characters that need to be encoded in the path section of the URL as a param. This function encodes everything `encodePath` does plus the slash (`/`) character.

### `encodePath(text)`

Encodes characters that need to be encoded in the path section of the URL.

### `encodeQueryKey(text)`

Encodes characters that need to be encoded for query values in the query section of the URL and also encodes the `=` character.

### `encodeQueryValue(input)`

Encodes characters that need to be encoded for query values in the query section of the URL.

## Parsing Utils

### `parseAuth(input)`

Takes a string of the form `username:password` and returns an object with the username and password decoded.

### `parseFilename(input, opts?: { strict? })`

Parses a URL and returns last segment in path as filename.

If `{ strict: true }` is passed as the second argument, it will only return the last segment only if ending with an extension.

**Example:**

```js
// Result: filename.ext
parseFilename("http://example.com/path/to/filename.ext");

// Result: undefined
parseFilename("/path/to/.hidden-file", { strict: true });
```

### `parseHost(input)`

Takes a string, and returns an object with two properties: `hostname` and `port`.

### `parsePath(input)`

Splits the input string into three parts, and returns an object with those three parts.

### `parseURL(input, defaultProto?)`

Takes a URL string and returns an object with the URL's `protocol`, `auth`, `host`, `pathname`, `search`, and `hash`.

**Example:**

```js
parseURL("http://foo.com/foo?test=123#token");
// { protocol: 'http:', auth: '', host: 'foo.com', pathname: '/foo', search: '?test=123', hash: '#token' }

parseURL("foo.com/foo?test=123#token");
// { pathname: 'foo.com/foo', search: '?test=123', hash: '#token' }

parseURL("foo.com/foo?test=123#token", "https://");
// { protocol: 'https:', auth: '', host: 'foo.com', pathname: '/foo', search: '?test=123', hash: '#token' }
```

### `stringifyParsedURL(parsed)`

Takes a `ParsedURL` object and returns the stringified URL.

**Example:**

```js
const obj = parseURL("http://foo.com/foo?test=123#token");
obj.host = "bar.com";

stringifyParsedURL(obj); // "http://bar.com/foo?test=123#token"
```

## Query Utils

### `encodeQueryItem(key, value)`

Encodes a pair of key and value into a url query string value.

If the value is an array, it will be encoded as multiple key-value pairs with the same key.

### `parseQuery(parametersString)`

Parses and decodes a query string into an object.

The input can be a query string with or without the leading `?`.

### `stringifyQuery(query)`

Stringfies and encodes a query object into a query string.

## Utils

### `$URL()`

### `cleanDoubleSlashes(input)`

Removes double slashes from the URL.

**Example:**

```js
cleanDoubleSlashes("//foo//bar//"); // "/foo/bar/"

cleanDoubleSlashes("http://example.com/analyze//http://localhost:3000//");
// Returns "http://example.com/analyze/http://localhost:3000/"
```

### `filterQuery(input, predicate)`

Removes the query section of the URL.

**Example:**

```js
filterQuery("/foo?bar=1&baz=2", (key) => key !== "bar"); // "/foo?baz=2"
```

### `getQuery(input)`

Parses and decodes the query object of an input URL into an object.

**Example:**

```js
getQuery("http://foo.com/foo?test=123&unicode=%E5%A5%BD");
// { test: "123", unicode: "好" }
```

### `hasLeadingSlash(input)`

Checks if the input has a leading slash (e.g. `/foo`).

### `hasProtocol(inputString, opts)`

### `hasTrailingSlash(input, respectQueryAndFragment?)`

Checks if the input has a trailing slash.

### `isEmptyURL(url)`

Checks if the input URL is empty or `/`.

### `isEqual(a, b, options)`

Checks if two paths are equal regardless of encoding, trailing slash, and leading slash differences.

You can make slash check strict by setting `{ trailingSlash: true, leadingSlash: true }` as options.

You can make encoding check strict by setting `{ encoding: true }` as options.

**Example:**

```js
isEqual("/foo", "foo"); // true
isEqual("foo/", "foo"); // true
isEqual("/foo bar", "/foo%20bar"); // true

// Strict compare
isEqual("/foo", "foo", { leadingSlash: true }); // false
isEqual("foo/", "foo", { trailingSlash: true }); // false
isEqual("/foo bar", "/foo%20bar", { encoding: true }); // false
```

### `isNonEmptyURL(url)`

Checks if the input URL is neither empty nor `/`.

### `isRelative(inputString)`

Check if a path starts with `./` or `../`.

**Example:**

```js
isRelative("./foo"); // true
```

### `isSamePath(p1, p2)`

Check if two paths are equal or not. Trailing slash and encoding are normalized before comparison.

**Example:**

```js
isSamePath("/foo", "/foo/"); // true
```

### `isScriptProtocol(protocol?)`

Checks if the input protocol is any of the dangerous `blob:`, `data:`, `javascript`: or `vbscript:` protocols.

### `joinRelativeURL()`

Joins multiple URL segments into a single URL and also handles relative paths with `./` and `../`.

**Example:**

```js
joinRelativeURL("/a", "../b", "./c"); // "/b/c"
```

### `joinURL(base)`

Joins multiple URL segments into a single URL.

**Example:**

```js
joinURL("a", "/b", "/c"); // "a/b/c"
```

### `normalizeURL(input)`

Normalizes the input URL:

- Ensures the URL is properly encoded - Ensures pathname starts with a slash - Preserves protocol/host if provided

**Example:**

```js
normalizeURL("test?query=123 123#hash, test");
// Returns "test?query=123%20123#hash,%20test"

normalizeURL("http://localhost:3000");
// Returns "http://localhost:3000"
```

### `resolveURL(base)`

Resolves multiple URL segments into a single URL.

**Example:**

```js
resolveURL("http://foo.com/foo?test=123#token", "bar", "baz");
// Returns "http://foo.com/foo/bar/baz?test=123#token"
```

### `withBase(input, base)`

Ensures the URL or pathname starts with base.

If input already starts with base, it will not be added again.

### `withFragment(input, hash)`

Adds or replaces the fragment section of the URL.

**Example:**

```js
withFragment("/foo", "bar"); // "/foo#bar"
withFragment("/foo#bar", "baz"); // "/foo#baz"
withFragment("/foo#bar", ""); // "/foo"
```

### `withHttp(input)`

Adds or replaces the URL protocol to `http://`.

**Example:**

```js
withHttp("https://example.com"); // http://example.com
```

### `withHttps(input)`

Adds or replaces the URL protocol to `https://`.

**Example:**

```js
withHttps("http://example.com"); // https://example.com
```

### `withLeadingSlash(input)`

Ensures the URL or pathname has a leading slash.

### `withoutBase(input, base)`

Removes the base from the URL or pathname.

If input does not start with base, it will not be removed.

### `withoutFragment(input)`

Removes the fragment section from the URL.

**Example:**

```js
withoutFragment("http://example.com/foo?q=123#bar")
// Returns "http://example.com/foo?q=123"
```

### `withoutHost(input)`

Removes the host from the URL while preserving everything else.

**Example:**

```js
withoutHost("http://example.com/foo?q=123#bar")
// Returns "/foo?q=123#bar"
```

### `withoutLeadingSlash(input)`

Removes leading slash from the URL or pathname.

### `withoutProtocol(input)`

Removes the protocol from the input.

**Example:**

```js
withoutProtocol("http://example.com"); // "example.com"
```

### `withoutTrailingSlash(input, respectQueryAndFragment?)`

Removes the trailing slash from the URL or pathname.

If second argument is `true`, it will only remove the trailing slash if it's not part of the query or fragment with cost of more expensive operations.

**Example:**

```js
withoutTrailingSlash("/foo/"); // "/foo"

withoutTrailingSlash("/path/?query=true", true); // "/path?query=true"
```

### `withProtocol(input, protocol)`

Adds or replaces protocol of the input URL.

**Example:**

```js
withProtocol("http://example.com", "ftp://"); // "ftp://example.com"
```

### `withQuery(input, query)`

Add/Replace the query section of the URL.

**Example:**

```js
withQuery("/foo?page=a", { token: "secret" }); // "/foo?page=a&token=secret"
```

### `withTrailingSlash(input, respectQueryAndFragment?)`

Ensures the URL ends with a trailing slash.

If second argument is `true`, it will only add the trailing slash if it's not part of the query or fragment with cost of more expensive operation.

**Example:**

```js
withTrailingSlash("/foo"); // "/foo/"

withTrailingSlash("/path?query=true", true); // "/path/?query=true"
```

<!-- /automd -->

## License

[MIT](./LICENSE)

Special thanks to Eduardo San Martin Morote ([posva](https://github.com/posva)) for [encoding utilities](https://github.com/vuejs/vue-router-next/blob/v4.0.1/src/encoding.ts)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/ufo?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/ufo
[npm-downloads-src]: https://img.shields.io/npm/dm/ufo?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/ufo
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/ufo/main?style=flat&colorA=18181B&colorB=F0DB4F
[codecov-href]: https://codecov.io/gh/unjs/ufo
[bundle-src]: https://img.shields.io/bundlephobia/minzip/ufo?style=flat&colorA=18181B&colorB=F0DB4F
[bundle-href]: https://bundlephobia.com/result?p=ufo
