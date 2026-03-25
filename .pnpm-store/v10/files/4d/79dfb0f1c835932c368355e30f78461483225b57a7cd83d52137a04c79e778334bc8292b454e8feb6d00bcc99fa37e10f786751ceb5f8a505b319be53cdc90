# openapi-sampler

[![Travis build status](http://img.shields.io/travis/Redocly/openapi-sampler.svg?style=flat)](https://travis-ci.org/Redocly/openapi-sampler) [![Coverage Status](https://coveralls.io/repos/Redocly/openapi-sampler/badge.svg?branch=master&service=github)](https://coveralls.io/github/Redocly/openapi-sampler?branch=master) [![Dependency Status](https://david-dm.org/Redocly/openapi-sampler.svg)](https://david-dm.org/Redocly/openapi-sampler) [![devDependency Status](https://david-dm.org/Redocly/openapi-sampler/dev-status.svg)](https://david-dm.org/Redocly/openapi-sampler#info=devDependencies)

Tool for generation samples based on OpenAPI payload/response schema

## Features

- Deterministic (given a particular input, will always produce the same output)
- Supports compound keywords: `allOf`, `oneOf`, `anyOf`, `if/then/else`
- Supports `additionalProperties` with [`x-additionalPropertiesName`](https://github.com/Redocly/redoc/blob/master/docs/redoc-vendor-extensions.md#x-additionalpropertiesname)
- Uses `const`, `examples`, `enum` and `default` where possible - in this order
- Good array support: supports `contains`, `minItems`, `maxItems`, and tuples (`items` as an array)
- Supports `minLength`, `maxLength`, `min`, `max`, `exclusiveMinimum`, `exclusiveMaximum`, ([limited](https://fakerjs.dev/api/helpers.html#fromregexp)) `pattern`
- Supports the following `string` formats:
  - email
  - idn-email
  - password
  - date-time
  - date
  - time
  - ipv4
  - ipv6
  - hostname
  - idn-hostname
  - uri
  - uri-reference
  - uri-template
  - iri
  - iri-reference
  - uuid
  - json-pointer
  - relative-json-pointer
  - regex
- Infers schema type automatically following same rules as [json-schema-faker](https://www.npmjs.com/package/json-schema-faker#inferred-types)
- Support for `$ref` resolving
- Has basic supports for JSON Schema draft 7 (thanks to [@P0lip](https://github.com/P0lip) from [@stoplightio](https://github.com/stoplightio) for contributing)

## Installation

Install using [npm](https://docs.npmjs.com/getting-started/what-is-npm)

    npm install openapi-sampler

or using [yarn](https://yarnpkg.com)

    yarn add openapi-sampler

Then require it in your code:

```js
var OpenAPISampler = require('openapi-sampler');
```

## Usage
#### `OpenAPISampler.sample(schema, [options], [spec])`
- **schema** (_required_) - `object`
An [OpenAPI Schema Object](http://swagger.io/specification/#schemaObject) or a JSON Schema Draft 7 document.
- **options** (_optional_) - `object`
Available options:
  - **skipNonRequired** - `boolean`
  Don't include non-required object properties not specified in [`required` property of the schema object](https://swagger.io/docs/specification/data-models/data-types/#required)
  - **skipReadOnly** - `boolean`
  Don't include `readOnly` object properties
  - **skipWriteOnly** - `boolean`
  Don't include `writeOnly` object properties
  - **quiet** - `boolean`
  Don't log console warning messages
- **spec** - whole specification where the schema is taken from. Required only when schema may contain `$ref`. **spec** must not contain any external references

## Example
```js
const OpenAPISampler = require('.');
OpenAPISampler.sample({
  type: 'object',
  properties: {
    a: {type: 'integer', minimum: 10},
    b: {type: 'string', format: 'password', minLength: 10},
    c: {type: 'boolean', readOnly: true}
  }
}, {skipReadOnly: true});
// { a: 10, b: 'pa$$word_q' }
```
