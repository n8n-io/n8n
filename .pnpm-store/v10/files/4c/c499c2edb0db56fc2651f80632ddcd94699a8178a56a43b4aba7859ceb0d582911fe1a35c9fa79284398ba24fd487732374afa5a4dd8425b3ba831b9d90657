[![npm](https://img.shields.io/npm/v/json-schema-typed.svg?style=flat-square)](https://npmjs.org/package/json-schema-typed)
[![downloads-per-month](https://img.shields.io/npm/dm/json-schema-typed.svg?style=flat-square&label=npm%20downloads)](https://npmjs.org/package/json-schema-typed)
[![License](https://img.shields.io/badge/license-BSD--2--Clause-blue.svg?style=flat-square)][license]

# JSON Schema Typed

JSON Schema TypeScript definitions with complete inline documentation.

**NOTE:** This library only supports defining schemas. You will need a separate
library for data validation.

There are 3 JSON Schema drafts included in this package:

- `draft-07`
- `draft-2019-09`
- `draft-2020-12`

## Install

```sh
npm install json-schema-typed
```

## Usage

1. Chose which draft you'd like to import.

- The main package export points to the latest supported stable draft, currently
  `draft-2020-12`. Future releases that point the main package export to a new
  draft will always incur a bump to the major semantic version.

  ```ts
  import { type JSONSchema } from "json-schema-typed";
  ```

- Or you can specify the exact draft you need.
  ```ts
  import { type JSONSchema } from "json-schema-typed/draft-2020-12";
  ```

2. Define a schema

   ```ts
   import { Format, type JSONSchema } from "json-schema-typed";

   const schema: JSONSchema = {
     properties: {
       email: {
         format: Format.Email,
         type: "string",
       },
     },
     type: "object",
   };

   // The JSONSchema namespace also provides type-specific narrowed interfaces
   const stringSchema: JSONSchema.String = {
     // Only { type: "string" } and common keywords are allowed
     maxLength: 100,
     type: "string",
   };
   ```

## Upgrading

Version `8.0.0` has breaking changes from the previous release.

- Now a
  [pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
- Many exports were renamed. The table below reflects the new export names.
  These are considered final and unlikely to change in future releases.
- The `JSONSchema` type was changed from an `interface` to a `type` which is a
  mixed union that allows `boolean` values in order to properly align with the
  JSON Schema spec. If you were previously extending the `JSONSchema` interface,
  you can access the `interface` directly with `JSONSchema.Interface`.
- The previous main package export pointed to Draft 7. Import it directly if you
  need to continue using it:
  ```ts
  import { type JSONSchema } from "json-schema-typed/draft-07";
  ```

## Exports supported in each draft module

| Name              | Type            | Purpose                                                            |
| ----------------- | --------------- | ------------------------------------------------------------------ |
| `$schema`         | `string`        | Draft meta schema URL that can be used with the `$schema` keyword. |
| `ContentEncoding` | Enum object     | String content encoding strategies.                                |
| `draft`           | `string`        | Draft version.                                                     |
| `Format`          | Enum object     | String formats.                                                    |
| `JSONSchema`      | TypeScript Type | Used to define a JSON Schema.                                      |
| `keywords`        | `string[]`      | All the keywords for the imported draft.                           |
| `TypeName`        | Enum object     | Simple type names for the `type` keyword.                          |

## Versioning

This library follows [semantic versioning](https://semver.org).

---

## Maintainers

- [Remy Rylan](https://github.com/RemyRylan)

## License

[BSD-2-Clause][license]

[license]: https://github.com/RemyRylan/json-schema-typed/blob/main/dist/node/LICENSE.md
