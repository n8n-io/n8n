# URI parsing/validating/resolving library
**Replacement for abandoned library** [uri-js](https://www.npmjs.com/package/uri-js) aka "URI.js"<br>

[![NPM](https://nodei.co/npm/uri-js-replace.png)](https://nodei.co/npm/uri-js-replace/)

- Based on Node.js and browser [URL api](https://developer.mozilla.org/en-US/docs/Web/API/URL)
- 99% compatible with original URI.js library
- Solves "The punycode module is deprecated" warning in Node
- Tested with libraries: ESLint, Webpack, [Ajv](https://github.com/ajv-validator/ajv)

# Usage
## NPM
Add to your package.json
```json
{
  "overrides": {
    "uri-js": "npm:uri-js-replace"
  }
}
```
and run
```shell
npm update
```

## Yarn
```json
{
  "resolutions": {
    "uri-js": "npm:uri-js-replace"
  }
}
```

# Library usage examples
### Parsing
```js
import * as URI from "uri-js";

URI.parse("uri://user:pass@example.com:123/one/two.three?q1=a1&q2=a2#body");
//returns:
//{
//  scheme : "uri",
//  userinfo : "user:pass",
//  host : "example.com",
//  port : 123,
//  path : "/one/two.three",
//  query : "q1=a1&q2=a2",
//  fragment : "body"
//}
```

### Serializing

```js
URI.serialize({scheme : "http", host : "example.com", fragment : "footer"}) === "http://example.com/#footer"
```

### Normalizing
```js
URI.normalize("URI://www.example.org/red%09ros\xE9#red") === "uri://www.example.org/red%09ros%C3%A9#red"
```

## Tests
All tests copied from original repository
```shell
vitest
```

### Generating d.ts files
```shell
npm i -g typescript
tsc
```

## NPM
https://www.npmjs.com/package/uri-js-replace

