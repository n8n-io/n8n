# Zod to Json Schema

[![NPM Version](https://img.shields.io/npm/v/zod-to-json-schema.svg)](https://npmjs.org/package/zod-to-json-schema)
[![NPM Downloads](https://img.shields.io/npm/dw/zod-to-json-schema.svg)](https://npmjs.org/package/zod-to-json-schema)

_Looking for the exact opposite? Check out [json-schema-to-zod](https://npmjs.org/package/json-schema-to-zod)_

## Summary

Does what it says on the tin; converts [Zod schemas](https://github.com/colinhacks/zod) into [JSON schemas](https://json-schema.org/)!

- Supports all relevant schema types, basic string, number and array length validations and string patterns.
- Resolves recursive and recurring schemas with internal `$ref`s.
- Also able to target Open API 3 (Swagger) specification for paths.

### Usage

```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const mySchema = z
  .object({
    myString: z.string().min(5),
    myUnion: z.union([z.number(), z.boolean()]),
  })
  .describe("My neat object schema");

const jsonSchema = zodToJsonSchema(mySchema, "mySchema");
```

#### Expected output

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$ref": "#/definitions/mySchema",
  "definitions": {
    "mySchema": {
      "description": "My neat object schema",
      "type": "object",
      "properties": {
        "myString": {
          "type": "string",
          "minLength": 5
        },
        "myUnion": {
          "type": ["number", "boolean"]
        }
      },
      "additionalProperties": false,
      "required": ["myString", "myUnion"]
    }
  }
}
```

## Options

### Schema name

You can pass a string as the second parameter of the main zodToJsonSchema function. If you do, your schema will end up inside a definitions object property on the root and referenced from there. Alternatively, you can pass the name as the `name` property of the options object (see below).

### Options object

Instead of the schema name (or nothing), you can pass an options object as the second parameter. The following options are available:

| Option                                                                             | Effect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **name**?: _string_                                                                | As described above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **nameStrategy**?: "ref"                                                           \| "title"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Adds name as "title" meta instead of as a ref as described above |
| **basePath**?: string[]                                                            | The base path of the root reference builder. Defaults to ["#"].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **$refStrategy**?: "root" \| "relative" \| "seen" \| "none"                        | The reference builder strategy; <ul><li>**"root"** resolves $refs from the root up, ie: "#/definitions/mySchema".</li><li>**"relative"** uses [relative JSON pointers](https://tools.ietf.org/id/draft-handrews-relative-json-pointer-00.html). _See known issues!_</li><li>**"seen"** reuses the output of any "seen" Zod schema. In theory it's a more performant version of "none", but in practice this behaviour can cause issues with nested schemas and has now gotten its own option.</li> <li>**"none"** ignores referencing all together, creating a new schema branch even on "seen" schemas. Recursive references defaults to "any", ie `{}`.</li></ul> Defaults to "root". |
| **effectStrategy**?: "input" \| "any"                                              | The effects output strategy. Defaults to "input". _See known issues!_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **dateStrategy**?: "format:date" \| "format:date-time" \| "string" \| "integer"    | Date strategy, integer allow to specify in unix-time min and max values. "format:date" creates a string schema with format: "date". "format:date-time" creates a string schema with format: "date-time". "string" is intepreted as "format:date-time". "integer" creates an integer schema with format "unix-time" (unless target "openApi3" is used min max checks are also respected)                                                                                                                                                                                                                                                                                                 |
|                                                                                    |
| **emailStrategy**?: "format:email" \| "format:idn-email" \| "pattern:zod"          | Choose how to handle the email string check. Defaults to "format:email".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **base64Strategy**?: "format:binary" \| "contentEnconding:base64" \| "pattern:zod" | Choose how to handle the base64 string check. Defaults to "contentEncoding:base64" as described [here](https://json-schema.org/understanding-json-schema/reference/non_json_data#contentencoding). Note that "format:binary" is not represented in the output type as it's not part of the JSON Schema spec and only intended to be used when targeting OpenAPI 3.0. Later versions of OpenAPI support contentEncoding.                                                                                                                                                                                                                                                                 |
| **definitionPath**?: "definitions" \| "$defs"                                      | The name of the definitions property when name is passed. Defaults to "definitions".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **target**?: "jsonSchema7" \| "jsonSchema2019-09" \| "openApi3"                    | Which spec to target. Defaults to "jsonSchema7"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **strictUnions**?: boolean                                                         | Scrubs unions of any-like json schemas, like `{}` or `true`. Multiple zod types may result in these out of necessity, such as z.instanceof()                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **definitions**?: Record<string, ZodSchema>                                        | See separate section below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **errorMessages**?: boolean                                                        | Include custom error messages created via chained function checks for supported zod types. See section below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **markdownDescription**?: boolean                                                  | Copies the `description` meta to `markdownDescription`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **patternStrategy**?: "escape" \| "preserve"                                       | The Zod string validations `.includes()`, `.startsWith()`, and `.endsWith()` must be converted to regex to be compatible with JSON Schema's `pattern`. For safety, all non-alphanumeric characters are `escape`d by default (consider `z.string().includes(".")`), but this can occasionally cause problems with Unicode-flagged regex parsers. Use `preserve` to prevent this escaping behaviour and preserve the exact string written, even if it results in an inaccurate regex.                                                                                                                                                                                                     |
| **applyRegexFlags**?: boolean                                                      | JSON Schema's `pattern` doesn't support RegExp flags, but Zod's `z.string().regex()` does. When this option is true (default false), a best-effort is made to transform regexes into a flag-independent form (e.g. `/x/i => /[xX]/` ). Supported flags: `i` (basic Latin only), `m`, `s`.                                                                                                                                                                                                                                                                                                                                                                                               |
| **pipeStrategy**?: "all" \| "input" \| "output"                                    | Decide which types should be included when using `z.pipe`, for example `z.string().pipe(z.number())` would return both `string` and `number` by default, only `string` for "input" and only `number` for "output".                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **removeAdditionalStrategy**?: "passthrough" \| "strict"                           | Decide when `additionalProperties ` should be false - whether according to strict or to passthrough. Since most parsers would retain properties given that `additionalProperties  = false` while zod strips them, the default is to strip them unless `passthrough` is explicitly in the schema. On the other hand, it is useful to retain all fields unless `strict` is explicit in the schema which is the second option for the removeAdditional                                                                                                                                                                                                                                     |
| **override**?: callback                                                            | See section                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### Definitions

The definitions option lets you manually add recurring schemas into definitions for cleaner outputs. It's fully compatible with named schemas, changed definitions path and base path. Here's a simple example:

```typescript
const myRecurringSchema = z.string();
const myObjectSchema = z.object({ a: myRecurringSchema, b: myRecurringSchema });

const myJsonSchema = zodToJsonSchema(myObjectSchema, {
  definitions: { myRecurringSchema },
});
```

#### Result

```json
{
  "type": "object",
  "properties": {
    "a": {
      "$ref": "#/definitions/myRecurringSchema"
    },
    "b": {
      "$ref": "#/definitions/myRecurringSchema"
    }
  },
  "definitions": {
    "myRecurringSchema": {
      "type": "string"
    }
  }
}
```

### Error Messages

This feature allows optionally including error messages created via chained function calls for supported zod types:

```ts
// string schema with additional chained function call checks
const EmailSchema = z.string().email("Invalid email").min(5, "Too short");

const jsonSchema = zodToJsonSchema(EmailSchema, { errorMessages: true });
```

#### Result

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string",
  "format": "email",
  "minLength": 5,
  "errorMessage": {
    "format": "Invalid email",
    "minLength": "Too short"
  }
}
```

This allows for field specific, validation step specific error messages which can be useful for building forms and such. This format is accepted by `react-hook-form`'s ajv resolver (and therefor `ajv-errors` which it uses under the hood). Note that if using AJV with this format will require [enabling `ajv-errors`](https://ajv.js.org/packages/ajv-errors.html#usage) as vanilla AJV does not accept this format by default.

#### Custom Error Message Support

- ZodString
  - regex
  - min, max
  - email, cuid, uuid, url
  - endsWith, startsWith
- ZodNumber
  - min, max, lt, lte, gt, gte,
  - int
  - multipleOf
- ZodSet
  - min, max
- ZodArray
  - min, max

## `override` option

This options takes a Zod schema definition, the current reference object (containing the current ref path and other options), an argument containing inforation about wether or not the schema has been encountered before, and a forceResolution argument.

Since `undefined` is a valid option to return, if you don't want to override the current item you have to return the `ignoreOverride` symbol exported from the index.

```typescript
import zodToJsonSchema, { ignoreOverride } from "zod-to-json-schema";

zodToJsonSchema(
  z.object({
    ignoreThis: z.string(),
    overrideThis: z.string(),
    removeThis: z.string(),
  }),
  {
    override: (def, refs) => {
      const path = refs.currentPath.join("/");

      if (path === "#/properties/overrideThis") {
        return {
          type: "integer",
        };
      }

      if (path === "#/properties/removeThis") {
        return undefined;
      }

      // Important! Do not return `undefined` or void unless you want to remove the property from the resulting schema completely.
      return ignoreOverride;
    },
  },
);
```

Expected output:

```json
{
  "type": "object",
  "required": ["ignoreThis", "overrideThis"],
  "properties": {
    "ignoreThis": {
      "type": "string"
    },
    "overrideThis": {
      "type": "integer"
    }
  },
  "additionalProperties": false
}
```

## Known issues

- When using `.transform`, the return type is inferred from the supplied function. In other words, there is no schema for the return type, and there is no way to convert it in runtime. Currently the JSON schema will therefore reflect the input side of the Zod schema and not necessarily the output (the latter aka. `z.infer`). If this causes problems with your schema, consider using the effectStrategy "any", which will allow any type of output.
- JSON Schemas does not support any other key type than strings for objects. When using `z.record` with any other key type, this will be ignored. An exception to this rule is `z.enum` as is supported since 3.11.3
- Relative JSON pointers, while published alongside [JSON schema draft 2020-12](https://json-schema.org/specification.html), is not technically a part of it. Currently, most resolvers do not handle them at all.
- Since v3, the Object parser uses `.isOptional()` to check if a property should be included in `required` or not. This has the potentially dangerous behavior of calling `.safeParse` with `undefined`. To work around this, make sure your `preprocess` and other effects callbacks are pure and not liable to throw errors. An issue has been logged in the Zod repo and can be [tracked here](https://github.com/colinhacks/zod/issues/1460).

## Versioning

This package _does not_ follow semantic versioning. The major and minor versions of this package instead reflects feature parity with the [Zod package](http://npmjs.com/package/zod).

I will do my best to keep API-breaking changes to an absolute minimum, but new features may appear as "patches", such as introducing the options pattern in 3.9.1.

## Changelog

https://github.com/StefanTerdell/zod-to-json-schema/blob/master/changelog.md
