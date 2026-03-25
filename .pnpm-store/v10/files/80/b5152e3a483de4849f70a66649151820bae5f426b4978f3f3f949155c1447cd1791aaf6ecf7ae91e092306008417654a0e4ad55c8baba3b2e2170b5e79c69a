# `@exodus/schemasafe`

A code-generating [JSON Schema](https://json-schema.org/) validator that attempts to be reasonably secure.

Supports [draft-04/06/07/2019-09/2020-12](doc/Specification-support.md) and the
[`discriminator` OpenAPI keyword](./doc/Discriminator-support.md).

[![Node CI Status](https://github.com/ExodusMovement/schemasafe/workflows/Node%20CI/badge.svg)](https://github.com/ExodusMovement/schemasafe/actions)
[![npm](https://img.shields.io/npm/v/@exodus/schemasafe.svg)](https://www.npmjs.com/package/@exodus/schemasafe)
[![codecov](https://codecov.io/gh/ExodusMovement/schemasafe/branch/master/graph/badge.svg)](https://codecov.io/gh/ExodusMovement/schemasafe)

## Features

* [Converts schemas to self-contained JavaScript files](#generate-modules), can be used in the build process.\
  _Integrates nicely with bundlers, so one won't need to generate code in runtime, and that works with CSP._
* Optional `requireValidation: true` mode enforces full validation of the input object.\
  **Using [`mode: "strong"`](./doc/Strong-mode.md) is recommended, — it combines that option with additional schema safety checks.**
* Does not fail open on unknown or unprocessed keywords — instead throws at build time if schema was not fully understood.
  _That is implemented by tracking processed keywords and ensuring that none remain uncovered._
* Does not fail open on schema problems — instead throws at build time.\
  _E.g. it will detect mistakes like `{type: "array", "maxLength": 2}`._
* [About 2000 lines of code](./doc/Auditable.md), non-minified.
* Uses [secure code generation](./doc/Secure-code-generation.md) approach to prevent data from schema from leaking into
  the generated code without being JSON-wrapped.
* [0 dependencies](./doc/Auditable.md)
* [Very fast](./doc/Performance.md)
* Supports JSON Schema [draft-04/06/07/2019-09/2020-12](./doc/Specification-support.md) and a strict subset of the
  [`discriminator` OpenAPI keyword](./doc/Discriminator-support.md).
* Can assign defaults and/or remove additional properties when schema allows to do that safely.
  Throws at build time if those options are used with schemas that don't allow to do that safely.
* Can be used as a [schema linter](./doc/Linter.md).

## Installation

```sh
npm install --save @exodus/schemasafe
```

## Usage

Simply pass a schema to compile it:

```js
const { validator } = require('@exodus/schemasafe')

const validate = validator({
  type: 'object',
  required: ['hello'],
  properties: {
    hello: {
      type: 'string'
    }
  }
})

console.log('should be valid', validate({ hello: 'world' }))
console.log('should not be valid', validate({}))
```

Or use the [parser API](./doc/Parser-not-validator.md) (running in
[strong mode](./doc/Strong-mode.md) by default):

```js
const { parser } = require('@exodus/schemasafe')

const parse = parser({
  $schema: 'https://json-schema.org/draft/2019-09/schema',
  type: 'object',
  required: ['hello'],
  properties: {
    hello: {
      pattern: '^[a-z]+$',
      type: 'string'
    }
  },
  additionalProperties: false
})

console.log(parse('{"hello": "world" }')) // { valid: true, value: { hello: 'world' } }
console.log(parse('{}')) // { valid: false }
```

Parser API is recommended, because this way you can avoid handling unvalidated JSON objects in
non-string form at all in your code.

## Options

See [options documentation](./doc/Options.md) for the full list of supported options.

## Custom formats

`@exodus/schemasafe` supports the formats specified in JSON schema v4 (such as date-time).
If you want to add your own custom formats pass them as the formats options to the validator:

```js
const validate = validator({
  type: 'string',
  format: 'no-foo'
}, {
  formats: {
    'no-foo': (str) => !str.includes('foo'),
  }
})
console.log(validate('test')) // true
console.log(validate('foo')) // false

const parse = parser({
  $schema: 'https://json-schema.org/draft/2019-09/schema',
  type: 'string',
  format: 'only-a'
}, {
  formats: {
    'only-a': /^a+$/,
  }
})
console.log(parse('"aa"')) // { valid: true, value: 'aa' }
console.log(parse('"ab"')) // { valid: false }
```

## External schemas

You can pass in external schemas that you reference using the `$ref` attribute as the `schemas` option

```js
const ext = {
  type: 'string'
}

const schema = {
  $ref: 'ext#' // references another schema called ext
}

// pass the external schemas as an option
const validate = validator(schema, { schemas: { ext: ext }})

console.log(validate('hello')) // true
console.log(validate(42)) // false
```

`schemas` can be either an object as shown above, a `Map`, or plain array of schemas (given that
those have corresponding `$id` set at top level inside schemas themselves).

## Enabling errors shows information about the source of the error

When the `includeErrors` option is set to `true`, `@exodus/schemasafe` also outputs:

- `keywordLocation`: a JSON pointer string as an URI fragment indicating which sub-schema failed, e.g.
  `#/properties/item/type`
- `instanceLocation`: a JSON pointer string as an URI fragment indicating which property of the object
  failed validation, e.g. `#/item`

```js
const schema = {
  type: 'object',
  required: ['hello'],
  properties: {
    hello: {
      type: 'string'
    }
  }
}
const validate = validator(schema, { includeErrors: true })

validate({ hello: 100 });
console.log(validate.errors)
// [ { keywordLocation: '#/properties/hello/type', instanceLocation: '#/hello' } ]
```

Or, similarly, with parser API:

```js
const schema = {
  $schema: 'https://json-schema.org/draft/2019-09/schema',
  type: 'object',
  required: ['hello'],
  properties: {
    hello: {
      type: 'string',
      pattern: '^[a-z]+$',
    }
  },
  additionalProperties: false,
}
const parse = parser(schema, { includeErrors: true })

console.log(parse('{ "hello": 100 }'));
// { valid: false,
//   error: 'JSON validation failed for type at #/hello',
//   errors: [ { keywordLocation: '#/properties/hello/type', instanceLocation: '#/hello' } ]
// }
```

Only the first error is reported by default unless `allErrors` option is also set to `true` in
addition to `includeErrors`.

See [Error handling](./doc/Error-handling.md) for more information.

## Generate Modules

See the [doc/samples](./doc/samples/) directory to see how `@exodus/schemasafe` compiles
supported test suites.

To compile a validator function to an IIFE, call `validate.toModule()`:

```js
const { validator } = require('@exodus/schemasafe')

const schema = {
  type: 'string',
  format: 'hex'
}

// This works with custom formats as well.
const formats = {
  hex: (value) => /^0x[0-9A-Fa-f]*$/.test(value),
}

const validate = validator(schema, { formats })

console.log(validate.toModule())
/** Prints:
 * (function() {
 * 'use strict'
 * const format0 = (value) => /^0x[0-9A-Fa-f]*$/.test(value);
 * return (function validate(data) {
 *   if (data === undefined) data = null
 *   if (!(typeof data === "string")) return false
 *   if (!format0(data)) return false
 *   return true
 * })})();
 */
```

## Performance

`@exodus/schemasafe` uses code generation to turn a JSON schema into javascript code that is easily
optimizeable by v8 and [extremely fast](https://github.com/ebdrup/json-schema-benchmark).

See [Performance](./doc/Performance.md) for information on options that might affect performance
both ways.

## Contributing

Get a fully set up development environment with:

```sh
git clone https://github.com/ExodusMovement/schemasafe
cd schemasafe

git submodule update --init --recursive
yarn
yarn lint
yarn test
```

## Previous work

This is based on a heavily rewritten version of the amazing (but outdated)
[is-my-json-valid](https://github.com/mafintosh/is-my-json-valid) by
[@mafintosh](https://github.com/mafintosh/is-my-json-valid).

Compared to `is-my-json-valid`, `@exodus/schemasafe` adds security-first design, many new features,
newer spec versions support, slimmer and more maintainable code, 0 dependencies, self-contained JS
module generation, fixes bugs and adds better test coverage, and drops support for outdated Node.js
versions.
## License

[MIT](./LICENSE)

