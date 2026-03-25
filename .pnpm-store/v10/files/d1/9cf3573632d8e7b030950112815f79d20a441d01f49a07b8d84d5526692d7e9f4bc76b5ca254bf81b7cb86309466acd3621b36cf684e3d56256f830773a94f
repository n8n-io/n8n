<img src="assets/header-round-medium.png" width="100%" align="center" />

💖 _Huge thanks to the [sponsors](https://github.com/sponsors/ThomasAribart) who help me maintain this repo:_

<table align="center"><tbody><tr><td align="center"><a href="https://github.com/theodo"><img src="https://github.com/theodo.png" width="80px" alt="Theodo" /><br/><span>Theodo</span></a></td><!-- sponsors --><!-- sponsors --><td align="center"><a href="https://github.com/sponsors/ThomasAribart"><img src="assets/plus-sign.png" width="55px" alt="Plus sign" /></br>Your Brand</br>Here</a></td></tr></tbody></table>

# Stop typing twice 🙅‍♂️

A lot of projects use JSON schemas for runtime data validation along with TypeScript for static type checking.

Their code may look like this:

```typescript
const dogSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
    hobbies: { type: "array", items: { type: "string" } },
    favoriteFood: { enum: ["pizza", "taco", "fries"] },
  },
  required: ["name", "age"],
};

type Dog = {
  name: string;
  age: number;
  hobbies?: string[];
  favoriteFood?: "pizza" | "taco" | "fries";
};
```

Both objects carry similar if not exactly the same information. This is a code duplication that can annoy developers and introduce bugs if not properly maintained.

That's when `json-schema-to-ts` comes to the rescue 💪

## FromSchema

The `FromSchema` method lets you infer TS types directly from JSON schemas:

```typescript
import { FromSchema } from "json-schema-to-ts";

const dogSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
    hobbies: { type: "array", items: { type: "string" } },
    favoriteFood: { enum: ["pizza", "taco", "fries"] },
  },
  required: ["name", "age"],
} as const;

type Dog = FromSchema<typeof dogSchema>;
// => Will infer the same type as above
```

Schemas can even be nested, as long as you don't forget the `as const` statement:

```typescript
const catSchema = { ... } as const;

const petSchema = {
  anyOf: [dogSchema, catSchema],
} as const;

type Pet = FromSchema<typeof petSchema>;
// => Will work 🙌
```

The `as const` statement is used so that TypeScript takes the schema definition to the word (e.g. _true_ is interpreted as the _true_ constant and not widened as _boolean_). It is pure TypeScript and has zero impact on the compiled code.

If you don't mind impacting the compiled code, you can use the `asConst` util, which simply returns the schema while narrowing its inferred type.

```typescript
import { asConst } from "json-schema-to-ts";

const dogSchema = asConst({
  type: "object",
  ...
});

type Dog = FromSchema<typeof dogSchema>;
// => Will work as well 🙌
```

Since TS 4.9, you can also use the `satisfies` operator to benefit from type-checking and autocompletion:

```typescript
import type { JSONSchema } from "json-schema-to-ts";

const dogSchema = {
  // Type-checked and autocompleted 🙌
  type: "object"
  ...
} as const satisfies JSONSchema

type Dog = FromSchema<typeof dogSchema>
// => Still work 🙌
```

You can also use this with JSDocs by wrapping your schema in `/** @type {const} @satisfies {import('json-schema-to-ts').JSONSchema} */ (...)` like:

```
const dogSchema = /** @type {const} @satisfies {import('json-schema-to-ts').JSONSchema} */ ({
  // Type-checked and autocompleted 🙌
  type: "object"
  ...
})

/** @type {import('json-schema-to-ts').FromSchema<typeof dogSchema>} */
const dog = { ... }
```

## Why use `json-schema-to-ts`?

If you're looking for runtime validation with added types, libraries like [yup](https://github.com/jquense/yup), [zod](https://github.com/vriad/zod) or [runtypes](https://github.com/pelotom/runtypes) may suit your needs while being easier to use!

On the other hand, JSON schemas have the benefit of being widely used, more versatile and reusable (swaggers, APIaaS...).

If you prefer to stick to them and can define your schemas in TS instead of JSON (importing JSONs `as const` is not available yet), then `json-schema-to-ts` is made for you:

- ✅ **Schema validation** `FromSchema` raises TS errors on invalid schemas, based on [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/json-schema)'s definitions
- ✨ **No impact on compiled code**: `json-schema-to-ts` only operates in type space. And after all, what's lighter than a dev-dependency?
- 🍸 **DRYness**: Less code means less embarrassing typos
- 🤝 **Real-time consistency**: See that `string` that you used instead of an `enum`? Or this `additionalProperties` you confused with `additionalItems`? Or forgot entirely? Well, `json-schema-to-ts` does!
- 🔧 **Reliability**: `FromSchema` is extensively tested against [AJV](https://github.com/ajv-validator/ajv), and covers all the use cases that can be handled by TS for now\*
- 🏋️‍♂️ **Help on complex schemas**: Get complex schemas right first time with instantaneous typing feedbacks! For instance, it's not obvious the following schema can never be validated:

```typescript
const addressSchema = {
  type: "object",
  allOf: [
    {
      properties: {
        street: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
      },
      required: ["street", "city", "state"],
    },
    {
      properties: {
        type: { enum: ["residential", "business"] },
      },
    },
  ],
  additionalProperties: false,
} as const;
```

But it is with `FromSchema`!

```typescript
type Address = FromSchema<typeof addressSchema>;
// => never 🙌
```

> \*If `json-schema-to-ts` misses one of your use case, feel free to [open an issue](https://github.com/ThomasAribart/json-schema-to-ts/issues) 🤗

## Table of content

- [Installation](#installation)
- [Use cases](#use-cases)
  - [Const](#const)
  - [Enums](#enums)
  - [Primitive types](#primitive-types)
  - [Nullable](#nullable)
  - [Arrays](#arrays)
  - [Tuples](#tuples)
  - [Objects](#objects)
- [Combining schemas](#combining-schemas)
  - [AnyOf](#anyof)
  - [AllOf](#allof)
  - [OneOf](#oneof)
  - [Not](#not)
  - [If/Then/Else](#ifthenelse)
  - [Definitions](#definitions)
  - [References](#references)
- [Deserialization](#deserialization)
- [Extensions](#extensions)
- [Typeguards](#typeguards)
  - [Validators](#validators)
  - [Compilers](#compilers)
- [FAQ](#frequently-asked-questions)

## Installation

```bash
# npm
npm install --save-dev json-schema-to-ts

# yarn
yarn add --dev json-schema-to-ts
```

> `json-schema-to-ts` requires TypeScript 4.3+. Using `strict` mode is required, as well as (apparently) turning off [`noStrictGenericChecks`](https://www.typescriptlang.org/tsconfig#noStrictGenericChecks).

## Use cases

### Const

```typescript
const fooSchema = {
  const: "foo",
} as const;

type Foo = FromSchema<typeof fooSchema>;
// => "foo"
```

### Enums

```typescript
const enumSchema = {
  enum: [true, 42, { foo: "bar" }],
} as const;

type Enum = FromSchema<typeof enumSchema>;
// => true | 42 | { foo: "bar"}
```

You can also go full circle with typescript `enums`.

```typescript
enum Food {
  Pizza = "pizza",
  Taco = "taco",
  Fries = "fries",
}

const enumSchema = {
  enum: Object.values(Food),
} as const;

type Enum = FromSchema<typeof enumSchema>;
// => Food
```

### Primitive types

```typescript
const primitiveTypeSchema = {
  type: "null", // "boolean", "string", "integer", "number"
} as const;

type PrimitiveType = FromSchema<typeof primitiveTypeSchema>;
// => null, boolean, string or number
```

```typescript
const primitiveTypesSchema = {
  type: ["null", "string"],
} as const;

type PrimitiveTypes = FromSchema<typeof primitiveTypesSchema>;
// => null | string
```

> For more complex types, refinment keywords like `required` or `additionalItems` will apply 🙌

### Nullable

```typescript
const nullableSchema = {
  type: "string",
  nullable: true,
} as const;

type Nullable = FromSchema<typeof nullableSchema>;
// => string | null
```

### Arrays

```typescript
const arraySchema = {
  type: "array",
  items: { type: "string" },
} as const;

type Array = FromSchema<typeof arraySchema>;
// => string[]
```

### Tuples

```typescript
const tupleSchema = {
  type: "array",
  items: [{ type: "boolean" }, { type: "string" }],
} as const;

type Tuple = FromSchema<typeof tupleSchema>;
// => [] | [boolean] | [boolean, string] | [boolean, string, ...unknown[]]
```

`FromSchema` supports the `additionalItems` keyword:

```typescript
const tupleSchema = {
  type: "array",
  items: [{ type: "boolean" }, { type: "string" }],
  additionalItems: false,
} as const;

type Tuple = FromSchema<typeof tupleSchema>;
// => [] | [boolean] | [boolean, string]
```

```typescript
const tupleSchema = {
  type: "array",
  items: [{ type: "boolean" }, { type: "string" }],
  additionalItems: { type: "number" },
} as const;

type Tuple = FromSchema<typeof tupleSchema>;
// => [] | [boolean] | [boolean, string] | [boolean, string, ...number[]]
```

...as well as the `minItems` and `maxItems` keywords:

```typescript
const tupleSchema = {
  type: "array",
  items: [{ type: "boolean" }, { type: "string" }],
  minItems: 1,
  maxItems: 2,
} as const;

type Tuple = FromSchema<typeof tupleSchema>;
// => [boolean] | [boolean, string]
```

> Additional items will only work if Typescript's `strictNullChecks` option is activated

### Objects

```typescript
const objectSchema = {
  type: "object",
  properties: {
    foo: { type: "string" },
    bar: { type: "number" },
  },
  required: ["foo"],
} as const;

type Object = FromSchema<typeof objectSchema>;
// => { [x: string]: unknown; foo: string; bar?: number; }
```

Defaulted properties (even optional ones) will be set as required in the resulting type. You can turn off this behavior by setting the `keepDefaultedPropertiesOptional` option to `true`:

```typescript
const defaultedProp = {
  type: "object",
  properties: {
    foo: { type: "string", default: "bar" },
  },
  additionalProperties: false,
} as const;

type Object = FromSchema<typeof defaultedProp>;
// => { foo: string; }

type Object = FromSchema<
  typeof defaultedProp,
  { keepDefaultedPropertiesOptional: true }
>;
// => { foo?: string; }
```

`FromSchema` partially supports the `additionalProperties`, `patternProperties` and `unevaluatedProperties` keywords:

- `additionalProperties` and `unevaluatedProperties` can be used to deny additional properties.

```typescript
const closedObjectSchema = {
  ...objectSchema,
  additionalProperties: false,
} as const;

type Object = FromSchema<typeof closedObjectSchema>;
// => { foo: string; bar?: number; }
```

```typescript
const closedObjectSchema = {
  type: "object",
  allOf: [
    {
      properties: {
        foo: { type: "string" },
      },
      required: ["foo"],
    },
    {
      properties: {
        bar: { type: "number" },
      },
    },
  ],
  unevaluatedProperties: false,
} as const;

type Object = FromSchema<typeof closedObjectSchema>;
// => { foo: string; bar?: number; }
```

- Used on their own, `additionalProperties` and/or `patternProperties` can be used to type unnamed properties.

```typescript
const openObjectSchema = {
  type: "object",
  additionalProperties: {
    type: "boolean",
  },
  patternProperties: {
    "^S": { type: "string" },
    "^I": { type: "integer" },
  },
} as const;

type Object = FromSchema<typeof openObjectSchema>;
// => { [x: string]: string | number | boolean }
```

However:

- When used in combination with the `properties` keyword, extra properties will always be typed as `unknown` to avoid conflicts.

```typescript
const mixedObjectSchema = {
  type: "object",
  properties: {
    foo: { enum: ["bar", "baz"] },
  },
  additionalProperties: { type: "string" },
} as const;

type Object = FromSchema<typeof mixedObjectSchema>;
// => { [x: string]: unknown; foo?: "bar" | "baz"; }
```

- Due to its context-dependent nature, `unevaluatedProperties` does not type extra-properties when used on its own. Use `additionalProperties` instead.

```typescript
const openObjectSchema = {
  type: "object",
  unevaluatedProperties: {
    type: "boolean",
  },
} as const;

type Object = FromSchema<typeof openObjectSchema>;
// => { [x: string]: unknown }
```

## Combining schemas

### AnyOf

```typescript
const anyOfSchema = {
  anyOf: [
    { type: "string" },
    {
      type: "array",
      items: { type: "string" },
    },
  ],
} as const;

type AnyOf = FromSchema<typeof anyOfSchema>;
// => string | string[]
```

`FromSchema` will correctly infer factored schemas:

```typescript
const factoredSchema = {
  type: "object",
  properties: {
    bool: { type: "boolean" },
  },
  required: ["bool"],
  anyOf: [
    {
      properties: {
        str: { type: "string" },
      },
      required: ["str"],
    },
    {
      properties: {
        num: { type: "number" },
      },
    },
  ],
} as const;

type Factored = FromSchema<typeof factoredSchema>;
// => {
//  [x:string]: unknown;
//  bool: boolean;
//  str: string;
// } | {
//  [x:string]: unknown;
//  bool: boolean;
//  num?: number;
// }
```

### OneOf

`FromSchema` will parse the `oneOf` keyword in the same way as `anyOf`:

```typescript
const catSchema = {
  type: "object",
  oneOf: [
    {
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    },
    {
      properties: {
        color: { enum: ["black", "brown", "white"] },
      },
    },
  ],
} as const;

type Cat = FromSchema<typeof catSchema>;
// => {
//  [x: string]: unknown;
//  name: string;
// } | {
//  [x: string]: unknown;
//  color?: "black" | "brown" | "white";
// }

// => Error will NOT be raised 😱
const invalidCat: Cat = { name: "Garfield" };
```

### AllOf

```typescript
const addressSchema = {
  type: "object",
  allOf: [
    {
      properties: {
        address: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
      },
      required: ["address", "city", "state"],
    },
    {
      properties: {
        type: { enum: ["residential", "business"] },
      },
    },
  ],
} as const;

type Address = FromSchema<typeof addressSchema>;
// => {
//   [x: string]: unknown;
//   address: string;
//   city: string;
//   state: string;
//   type?: "residential" | "business";
// }
```

### Not

Exclusions require heavy computations, that can sometimes be aborted by Typescript and end up in `any` inferred types. For this reason, they are not activated by default: You can opt-in with the `parseNotKeyword` option.

```typescript
const tupleSchema = {
  type: "array",
  items: [{ const: 1 }, { const: 2 }],
  additionalItems: false,
  not: {
    const: [1],
  },
} as const;

type Tuple = FromSchema<typeof tupleSchema, { parseNotKeyword: true }>;
// => [] | [1, 2]
```

```typescript
const primitiveTypeSchema = {
  not: {
    type: ["array", "object"],
  },
} as const;

type PrimitiveType = FromSchema<
  typeof primitiveTypeSchema,
  { parseNotKeyword: true }
>;
// => null | boolean | number | string
```

In objects and tuples, the exclusion will propagate to properties/items if it can collapse on a single one.

```typescript
// 👍 Can be propagated on "animal" property
const petSchema = {
  type: "object",
  properties: {
    animal: { enum: ["cat", "dog", "boat"] },
  },
  not: {
    properties: { animal: { const: "boat" } },
  },
  required: ["animal"],
  additionalProperties: false,
} as const;

type Pet = FromSchema<typeof petSchema, { parseNotKeyword: true }>;
// => { animal: "cat" | "dog" }
```

```typescript
// ❌ Cannot be propagated
const petSchema = {
  type: "object",
  properties: {
    animal: { enum: ["cat", "dog"] },
    color: { enum: ["black", "brown", "white"] },
  },
  not: {
    const: { animal: "cat", color: "white" },
  },
  required: ["animal", "color"],
  additionalProperties: false,
} as const;

type Pet = FromSchema<typeof petSchema, { parseNotKeyword: true }>;
// => { animal: "cat" | "dog", color: "black" | "brown" | "white" }
```

As some actionable keywords are not yet parsed, exclusions that resolve to `never` are granted the benefit of the doubt and omitted. For the moment, `FromSchema` assumes that you are not crafting unvalidatable exclusions.

```typescript
const oddNumberSchema = {
  type: "number",
  not: { multipleOf: 2 },
} as const;

type OddNumber = FromSchema<typeof oddNumberSchema, { parseNotKeyword: true }>;
// => should and will resolve to "number"

const incorrectSchema = {
  type: "number",
  not: { bogus: "option" },
} as const;

type Incorrect = FromSchema<typeof incorrectSchema, { parseNotKeyword: true }>;
// => should resolve to "never" but will still resolve to "number"
```

Also, keep in mind that TypeScript misses [refinment types](https://en.wikipedia.org/wiki/Refinement_type):

```typescript
const goodLanguageSchema = {
  type: "string",
  not: {
    enum: ["Bummer", "Silly", "Lazy sod !"],
  },
} as const;

type GoodLanguage = FromSchema<
  typeof goodLanguageSchema,
  { parseNotKeyword: true }
>;
// => string
```

### If/Then/Else

For the same reason as the `Not` keyword, conditions parsing is not activated by default: You can opt-in with the `parseIfThenElseKeywords` option.

```typescript
const petSchema = {
  type: "object",
  properties: {
    animal: { enum: ["cat", "dog"] },
    dogBreed: { enum: Object.values(DogBreed) },
    catBreed: { enum: Object.values(CatBreed) },
  },
  required: ["animal"],
  if: {
    properties: {
      animal: { const: "dog" },
    },
  },
  then: {
    required: ["dogBreed"],
    not: { required: ["catBreed"] },
  },
  else: {
    required: ["catBreed"],
    not: { required: ["dogBreed"] },
  },
  additionalProperties: false,
} as const;

type Pet = FromSchema<typeof petSchema, { parseIfThenElseKeywords: true }>;
// => {
//  animal: "dog";
//  dogBreed: DogBreed;
//  catBreed?: CatBreed | undefined
// } | {
//  animal: "cat";
//  catBreed: CatBreed;
//  dogBreed?: DogBreed | undefined
// }
```

> ☝️ `FromSchema` computes the resulting type as `(If ∩ Then) ∪ (¬If ∩ Else)`. While correct in theory, remember that the `not` keyword is not perfectly assimilated, which may become an issue in some complex schemas.

### Definitions

```typescript
const userSchema = {
  type: "object",
  properties: {
    name: { $ref: "#/definitions/name" },
    age: { $ref: "#/definitions/age" },
  },
  required: ["name", "age"],
  additionalProperties: false,
  definitions: {
    name: { type: "string" },
    age: { type: "integer" },
  },
} as const;

type User = FromSchema<typeof userSchema>;
// => {
//  name: string;
//  age: number;
// }
```

> ☝️ Wether in definitions or references, `FromSchema` will not work on recursive schemas for now.

### References

Unlike run-time validator classes like [AJV](https://github.com/ajv-validator/ajv), TS types cannot withhold internal states. Thus, they cannot keep any identified schemas in memory.

But you can hydrate them via the `references` option:

```typescript
const userSchema = {
  $id: "http://example.com/schemas/user.json",
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" },
  },
  required: ["name", "age"],
  additionalProperties: false,
} as const;

const usersSchema = {
  type: "array",
  items: {
    $ref: "http://example.com/schemas/user.json",
  },
} as const;

type Users = FromSchema<
  typeof usersSchema,
  { references: [typeof userSchema] }
>;
// => {
//  name: string;
//  age: string;
// }[]

const anotherUsersSchema = {
  $id: "http://example.com/schemas/users.json",
  type: "array",
  items: { $ref: "user.json" },
} as const;
// => Will work as well 🙌
```

## Deserialization

You can specify deserialization patterns with the `deserialize` option:

```typescript
const userSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: {
      type: "string",
      format: "email",
    },
    birthDate: {
      type: "string",
      format: "date-time",
    },
  },
  required: ["name", "email", "birthDate"],
  additionalProperties: false,
} as const;

type Email = string & { brand: "email" };

type User = FromSchema<
  typeof userSchema,
  {
    deserialize: [
      {
        pattern: {
          type: "string";
          format: "email";
        };
        output: Email;
      },
      {
        pattern: {
          type: "string";
          format: "date-time";
        };
        output: Date;
      },
    ];
  }
>;
// => {
//  name: string;
//  email: Email;
//  birthDate: Date;
// }
```

## Extensions

If you need to extend the JSON Schema spec with custom properties, use the `ExtendedJSONSchema` and `FromExtendedSchema` types to benefit from `json-schema-to-ts`:

```typescript
import type { ExtendedJSONSchema, FromExtendedSchema } from "json-schema-to-ts";

type CustomProps = {
  numberType: "int" | "float" | "bigInt";
};

const bigIntSchema = {
  type: "number",
  numberType: "bigInt",
  // 👇 Ensures mySchema is correct (includes extension)
} as const satisfies ExtendedJSONSchema<CustomProps>;

type BigInt = FromExtendedSchema<
  CustomProps,
  typeof bigIntSchema,
  {
    // 👇 Works very well with the deserialize option!
    deserialize: [
      {
        pattern: {
          type: "number";
          numberType: "bigInt";
        };
        output: bigint;
      },
    ];
  }
>;
```

## Typeguards

You can use `FromSchema` to implement your own typeguard:

```typescript
import { FromSchema, Validator } from "json-schema-to-ts";

// It's important to:
// - Explicitely type your validator as Validator
// - Use FromSchema as the default value of a 2nd generic first
const validate: Validator = <S extends JSONSchema, T = FromSchema<S>>(
  schema: S,
  data: unknown
): data is T => {
  const isDataValid: boolean = ... // Implement validation here
  return isDataValid;
};

const petSchema = { ... } as const
let data: unknown;
if (validate(petSchema, data)) {
  const { name, ... } = data; // data is typed as Pet 🙌
}
```

If needed, you can provide `FromSchema` options and additional validation options to the `Validator` type:

```typescript
type FromSchemaOptions = { parseNotKeyword: true };
type ValidationOptions = [{ fastValidate: boolean }]

const validate: Validator<FromSchemaOptions, ValidationOptions> = <
  S extends JSONSchema,
  T = FromSchema<S, FromSchemaOptions>
>(
  schema: S,
  data: unknown,
  ...validationOptions: ValidationOptions
): data is T => { ... };
```

`json-schema-to-ts` also exposes two helpers to write type guards. They don't impact the code that you wrote (they simply `return` it), but turn it into type guards.

You can use them to wrap either [`validators`](#validator) or [`compilers`](#compiler).

### Validators

A validator is a function that receives a schema plus some data, and returns `true` if the data is valid compared to the schema, `false` otherwise.

You can use the `wrapValidatorAsTypeGuard` helper to turn validators into type guards. Here is an implementation with [ajv](https://ajv.js.org/):

```typescript
import Ajv from "ajv";
import { $Validator, wrapValidatorAsTypeGuard } from "json-schema-to-ts";

const ajv = new Ajv();

// The initial validator definition is up to you
// ($Validator is prefixed with $ to differ from resulting type guard)
const $validate: $Validator = (schema, data) => ajv.validate(schema, data);

const validate = wrapValidatorAsTypeGuard($validate);

const petSchema = { ... } as const;

let data: unknown;
if (validate(petSchema, data)) {
  const { name, ... } = data; // data is typed as Pet 🙌
}
```

If needed, you can provide `FromSchema` options and additional validation options as generic types:

```typescript
type FromSchemaOptions = { parseNotKeyword: true };
type ValidationOptions = [{ fastValidate: boolean }]

const $validate: $Validator<ValidationOptions> = (
  schema,
  data,
  ...validationOptions // typed as ValidationOptions
) => { ... };

// validate will inherit from ValidationOptions
const validate = wrapValidatorAsTypeGuard($validate);

// with special FromSchemaOptions
// (ValidationOptions needs to be re-provided)
const validate = wrapValidatorAsTypeGuard<
  FromSchemaOptions,
  ValidationOptions
>($validate);
```

### Compilers

A compiler is a function that takes a schema as an input and returns a data validator for this schema as an output.

You can use the `wrapCompilerAsTypeGuard` helper to turn compilers into type guard builders. Here is an implementation with [ajv](https://ajv.js.org/):

```typescript
import Ajv from "ajv";
import { $Compiler, wrapCompilerAsTypeGuard } from "json-schema-to-ts";

// The initial compiler definition is up to you
// ($Compiler is prefixed with $ to differ from resulting type guard)
const $compile: $Compiler = (schema) => ajv.compile(schema);

const compile = wrapCompilerAsTypeGuard($compile);

const petSchema = { ... } as const;

const isPet = compile(petSchema);

let data: unknown;
if (isPet(data)) {
  const { name, ... } = data; // data is typed as Pet 🙌
}
```

If needed, you can provide `FromSchema` options, additional compiling and validation options as generic types:

```typescript
type FromSchemaOptions = { parseNotKeyword: true };
type CompilingOptions = [{ fastCompile: boolean }];
type ValidationOptions = [{ fastValidate: boolean }];

const $compile: $Compiler<CompilingOptions, ValidationOptions> = (
  schema,
  ...compilingOptions // typed as CompilingOptions
) => {
  ...

  return (
    data,
    ...validationOptions // typed as ValidationOptions
  ) => { ...  };
};

// compile will inherit from all options
const compile = wrapCompilerAsTypeGuard($compile);

// with special FromSchemaOptions
// (options need to be re-provided)
const compile = wrapCompilerAsTypeGuard<
  FromSchemaOptions,
  CompilingOptions,
  ValidationOptions
>($compile);
```

## Frequently Asked Questions

- [Does `json-schema-to-ts` work on _.json_ file schemas?](./documentation/FAQs/does-json-schema-to-ts-work-on-json-file-schemas.md)
- [Will `json-schema-to-ts` impact the performances of my IDE/compiler?](./documentation/FAQs/will-json-schema-to-ts-impact-the-performances-of-my-ide-compiler.md)
- [How can I apply `FromSchema` on generics?](./documentation/FAQs/applying-from-schema-on-generics.md)
- [I get a `type instantiation is excessively deep and potentially infinite` error, what should I do?](./documentation/FAQs/i-get-a-type-instantiation-is-excessively-deep-and-potentially-infinite-error-what-should-i-do.md)
