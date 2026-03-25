<img src="assets/header-round-medium.png" width="100%" align="center" />

<p align="right">
  <i>If you use this repo, star it ✨</i>
</p>

# Types on steroids 💊

`ts-algebra` exposes a subset of TS types called **Meta-types**: Meta-types are types that encapsulate other types.

```typescript
import { Meta } from "ts-algebra";

type MetaString = Meta.Primitive<string>;
```

The encapsulated type can be retrieved using the `Resolve` operation.

```typescript
type Resolved = Meta.Resolve<MetaString>;
// => string 🙌
```

You can also use the more compact `M` notation:

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Resolved = M.Resolve<
  M.Primitive<string>
>;
```

## Okay, but... why ? 🤔

Meta-types allow operations that **are not possible with conventional types**.

For instance, they allow new ["intersect"](#intersect) and ["exclude"](#exclude) operations, and handling objects additional properties:

```typescript
type MyObject = {
  str: string; // <= ❌ "str" is assignable to string
  [key: string]: number;
};

type MyObjectKeys = keyof MyObject;
// => string <= ❌ Unable to isolate "str"
```

Think of meta-types as a parallel universe where all kinds of magic can happen 🌈 Once your computations are over, you can retrieve the results by resolving them.

<img src="assets/schema.png" width="100%" align="center" />

> Meta-types were originally part of [json-schema-to-ts](https://github.com/ThomasAribart/json-schema-to-ts). Check it to see a real-life usage.

## Table of content

- [Installation](#%EF%B8%8F-installation)
- [Cardinality](#-cardinality)
- [Meta-types](#-meta-types)
  - [Never](#never)
  - [Any](#any)
  - [Const](#const)
  - [Enum](#enum)
  - [Primitive](#primitive)
  - [Array](#array)
  - [Tuple](#tuple)
  - [Object](#object)
  - [Union](#union)
- [Methods](#-methods)
  - [Resolve](#resolve)
  - [Intersect](#intersect)
  - [Exclude](#exclude)
- [Deserialization](#-deserialization)
- [Type constraints](#-type-constraints)
- [Unsafe types](#%EF%B8%8F-unsafe-types-and-methods)

## ☁️ Installation

```bash
# npm
npm install --save-dev ts-algebra

# yarn
yarn add --dev ts-algebra
```

## 🧮 Cardinality

A bit of theory first:

- The [**cardinality**](https://en.wikipedia.org/wiki/Cardinality) of a type is the number of distinct values (potentially infinite) that can be assigned to it
- A meta-type is said **representable** if at least one value can be assigned to its resolved type (cardinality ≥ 1)

An important notion to keep in mind using `ts-algebra`:

---

<p align="center">
  <a href="#never"><code>M.Never</code></a> is the only Meta-Type that is non-representable
  <br>
  <i>(i.e. that resolves to <code>never</code>)</i>
</p>

---

Any other non-representable meta-type (e.g. an object with a non-representable but required property) will be instanciated as `M.Never`.

There are drawbacks to this choice (the said property is hard to find and debug) but stronger benefits: This drastically reduces type computations, in particular in [intersections](#intersect) and [exclusions](#exclude). This is crucial for performances and stability.

## ✨ Meta-types

### Never

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Resolved = M.Resolve<
  M.Never
>;
// => never
```

### Any

**Arguments:**

- <code>IsSerialized <i>(?boolean = false)</i></code>: See [deserialization](#-deserialization)
- <code>Deserialized <i>(?type = never)</i></code>: See [deserialization](#-deserialization)

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Resolved = M.Resolve<
  M.Any
>;
// => unknown
```

### Const

Used for types with [cardinalities](#meta-types) of 1.

**Arguments:**

- <code>Value <i>(type)</i></code>
- <code>IsSerialized <i>(?boolean = false)</i></code>: See [deserialization](#-deserialization)
- <code>Deserialized <i>(?type = never)</i></code>: See [deserialization](#-deserialization)

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Resolved = M.Resolve<
  M.Const<"I love pizza">
>;
// => "I love pizza"
```

### Enum

Used for types with finite [cardinalities](#meta-types).

**Arguments:**

- <code>Values <i>(type union)</i></code>
- <code>IsSerialized <i>(?boolean = false)</i></code>: See [deserialization](#-deserialization)
- <code>Deserialized <i>(?type = never)</i></code>: See [deserialization](#-deserialization)

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Food = M.Resolve<
  M.Enum<"pizza" | "tacos" | "fries">
>;
// => "pizza" | "tacos" | "fries"
```

> ☝️ `M.Enum<never>` is [non-representable](#✨-meta-types)

### Primitive

Used for either `string`, `number`, `boolean` or `null`.

**Arguments:**

- <code>Value <i>(string | number | boolean | null)</i></code>
- <code>IsSerialized <i>(?boolean = false)</i></code>: See [deserialization](#-deserialization)
- <code>Deserialized <i>(?type = never)</i></code>: See [deserialization](#-deserialization)

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Resolved = M.Resolve<
  M.Primitive<string>
>;
// => string
```

### Array

Used for lists of items of the same type.

**Arguments:**

- <code>Items <i>(?meta-type = M.Any)</i></code>
- <code>IsSerialized <i>(?boolean = false)</i></code>: See [deserialization](#-deserialization)
- <code>Deserialized <i>(?type = never)</i></code>: See [deserialization](#-deserialization)

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Resolved = M.Resolve<
  M.Array
>;
// => unknown[]

type Resolved = M.Resolve<
  M.Array<M.Primitive<string>>
>;
// => string[]
```

> ☝️ Any meta-array is representable by `[]`

### Tuple

Used for finite, ordered lists of items of different types.

Meta-tuples can have **additional items**, typed as [`M.Never`](#never) by default. Thus, any meta-tuple is considered **closed** (additional items not allowed), unless a representable additional items meta-type is specified, in which case it becomes **open**.

**Arguments:**

- <code>RequiredItems <i>(meta-type[])</i>:</code>
- <code>AdditionalItems <i>(?meta-type = M.Never)</i></code>: Type of additional items
- <code>IsSerialized <i>(?boolean = false)</i></code>: See [deserialization](#-deserialization)
- <code>Deserialized <i>(?type = never)</i></code>: See [deserialization](#-deserialization)

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Resolved = M.Resolve<
  M.Tuple<[M.Primitive<string>]>
>;
// => [string]

type Resolved = M.Resolve<
  M.Tuple<
    [M.Primitive<string>],
    M.Primitive<string>
  >
>;
// => [string, ...string[]]
```

> ☝️ A meta-tuple is [non-representable](#✨-meta-types) if one of its required items is non-representable

### Object

Used for sets of key-value pairs (properties) which can be required or not.

Meta-objects can have **additional properties**, typed as [`M.Never`](#never) by default. Thus, any meta-object is considered **closed** (additional properties not allowed), unless a representable additional properties meta-type is specified, in which case it becomes **open**.

In presence of named properties, open meta-objects additional properties are resolved as `unknown` to avoid conflicts. However, they are used as long as the meta-type is not resolved (especially in [intersections](#intersect) and [exclusions](#exclude)).

**Arguments:**

- <code>NamedProperties <i>(?{ [key:string]: meta-type } = {})</i></code>
- <code>RequiredPropertiesKeys <i>(?string union = never)</i></code>
- <code>AdditionalProperties <i>(?meta-type = M.Never)</i></code>: The type of additional properties
- <code>CloseOnResolve <i>(?boolean = false)</i></code>: Ignore `AdditionalProperties` at resolution time
- <code>IsSerialized <i>(?boolean = false)</i></code>: See [deserialization](#-deserialization)
- <code>Deserialized <i>(?type = never)</i></code>: See [deserialization](#-deserialization)

```typescript
import { M } from "ts-algebra";

type Resolved = M.Resolve<
  M.Object<
    {
      required: M.Primitive<string>;
      notRequired: M.Primitive<null>;
    },
    "required",
    M.Primitive<number>
  >
>;
// => {
//  req: string,
//  notRequired?: null,
//  [key: string]: unknown
// }

type ClosedOnResolve = M.Resolve<
  M.Object<
    {
      required: M.Primitive<string>;
      notRequired: M.Primitive<null>;
    },
    "required",
    M.Primitive<number>,
    false
  >
>;
// => {
//  req: string,
//  notRequired?: null,
// }
```

> ☝️ A meta-object is [non-representable](#✨-meta-types) if one of its required properties value is non-representable:
>
> - If it is a non-representable named property
> - If it is an additional property, and the object is closed

### Union

Used to combine meta-types in a union of meta-types.

**Arguments:**

- <code>Values <i>(meta-type union)</i></code>

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Food = M.Resolve<
  M.Union<
    | M.Primitive<number>
    | M.Enum<"pizza" | "tacos" | "fries">
    | M.Const<true>
  >
>;
// => number
// | "pizza" | "tacos" | "fries"
// | true
```

> ☝️ A meta-union is [non-representable](#✨-meta-types) if it is empty, or if none of its elements is representable

> ☝️ Along with [M.Never](#never), M.Union is the only meta-type that doesn't support [serialization](#-deserialization)

## 🔧 Methods

### Resolve

Resolves the meta-type to its encapsulated type.

**Arguments:**

- <code>MetaType <i>(meta-type)</i></code>

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Resolved = M.Resolve<
  M.Primitive<string>
>;
// => string
```

### Intersect

Takes two meta-types as arguments, and returns their intersection as a meta-type.

**Arguments:**

- <code>LeftMetaType <i>(meta-type)</i></code>
- <code>RightMetaType <i>(meta-type)</i></code>

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Intersected = M.Intersect<
  M.Primitive<string>,
  M.Enum<"I love pizza"
    | ["tacos"]
    | { and: "fries" }
  >
>
// => M.Enum<"I love pizza">
```

Meta-type intersections differ from conventional intersections:

<!-- prettier-ignore -->
```typescript
type ConventionalIntersection =
  { str: string } & { num: number };
// => { str: string, num: number }

type MetaIntersection = M.Intersect<
  M.Object<
    { str: M.Primitive<string> },
    "str"
  >,
  M.Object<
    { num: M.Primitive<number> },
    "num"
  >
>;
// => M.Never: "num" is required in B
// ...but denied in A
```

Intersections are recursively propagated among tuple items and object properties, and take into account additional items and properties:

<!-- prettier-ignore -->
```typescript
type Intersected = M.Intersect<
  M.Tuple<
    [M.Primitive<number>],
    M.Primitive<string>
  >,
  M.Tuple<
    [M.Enum<"pizza" | 42>],
    M.Enum<"fries" | true>
  >
>;
// => M.Tuple<
//  [M.Enum<42>],
//  M.Enum<"fries">
// >

type Intersected = M.Intersect<
  M.Object<
    { food: M.Primitive<string> },
    "food",
    M.Any
  >,
  M.Object<
    { age: M.Primitive<number> },
    "age",
    M.Enum<"pizza" | "fries" | 42>
  >
>;
// => M.Object<
//  {
//    food: M.Enum<"pizza" | "fries">,
//    age: M.Primitive<number>
//  },
//  "food" | "age",
//  M.Enum<"pizza" | "fries" | 42>
// >
```

Intersections are distributed among unions:

<!-- prettier-ignore -->
```typescript
type Intersected = M.Intersect<
  M.Primitive<string>,
  M.Union<
    | M.Const<"pizza">
    | M.Const<42>
  >
>;
// => M.Union<
//  | M.Const<"pizza">
//  | M.Never
// >
```

### Exclude

Takes two meta-types as arguments, and returns their exclusion as a meta-type.

**Arguments:**

- <code>SourceMetaType <i>(meta-type)</i></code>
- <code>ExcludedMetaType <i>(meta-type)</i></code>

<!-- prettier-ignore -->
```typescript
import { M } from "ts-algebra";

type Excluded = M.Exclude<
  M.Enum<"I love pizza"
    | ["tacos"]
    | { and: "fries" }
  >,
  M.Primitive<string>,
>
// => M.Enum<
//  | ["tacos"]
//  | { and: "fries" }
// >
```

Meta-type exclusions differ from conventional exclusions:

<!-- prettier-ignore -->
```typescript
type ConventionalExclusion = Exclude<
  { req: string; notReq?: string },
  { req: string }
>;
// => never
// ObjectA is assignable to ObjectB

type MetaExclusion = M.Exclude<
  M.Object<
    {
      req: M.Primitive<string>;
      notReq: M.Primitive<string>;
    },
    "req"
  >,
  M.Object<
    { req: M.Primitive<string> },
    "req"
  >
>;
// => ObjectA
// Exclusion is still representable
```

<!-- prettier-ignore -->
```typescript
type ConventionalExclusion = Exclude<
  { food: "pizza" | 42 },
  { [k: string]: number }
>;
// => { food: "pizza" | 42 }

type MetaExclusion = M.Exclude<
  M.Object<
    { food: M.Enum<"pizza" | 42> },
    "food"
  >,
  M.Object<
    {},
    never,
    M.Primitive<number>
  >
>;
// => M.Object<
//  { food: M.Enum<"pizza"> },
//  "food"
// >
```

When exclusions can be collapsed on a single item or property, they are recursively propagated among tuple items and object properties, taking into account additional items and properties:

<!-- prettier-ignore -->
```typescript
type Excluded = M.Exclude<
  M.Tuple<[M.Enum<"pizza" | 42>]>,
  M.Tuple<[M.Primitive<number>]>
>;
// => M.Tuple<[M.Enum<"pizza">]>

type Excluded = M.Exclude<
  M.Tuple<
    [M.Enum<"pizza" | 42>],
    M.Enum<"fries" | true>
  >,
  M.Tuple<
    [M.Primitive<number>],
    M.Primitive<string>
  >
>;
// => TupleA
// Exclusion is not collapsable on a single item

type Excluded = M.Exclude<
  M.Object<
    {
      reqA: M.Enum<"pizza" | 42>;
      reqB: M.Enum<"pizza" | 42>;
    },
    "reqA" | "reqB"
  >,
  M.Object<
    {},
    never,
    M.Primitive<number>
  >
>;
// => ObjectA
// Exclusion is not collapsable on a single property
```

Exclusions are distributed among unions:

<!-- prettier-ignore -->
```typescript
type Excluded = M.Exclude<
  M.Union<
    | M.Const<"pizza">
    | M.Const<42>
  >,
  M.Primitive<number>
>;
// => M.Union<
//  | M.Const<"pizza">
//  | M.Never
// >
```

Excluding a union returns the intersection of the exclusions of all elements, applied separately:

<!-- prettier-ignore -->
```typescript
type Excluded = M.Exclude<
  M.Enum<42 | "pizza" | true>,
  M.Union<
    | M.Primitive<number>
    | M.Primitive<boolean>
  >
>;
// => M.Enum<"pizza">
```

## 📦 Deserialization

All meta-types except [`M.Never`](#never) and [`M.Union`](#union) can carry an extra type for [deserialization](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html) purposes. This extra-type will be passed along in operations and override the resolved type.

For instance, it is common to deserialize timestamps as `Date` objects. The last two arguments of [`M.Primitive`](#primitive) can be used to implement this:

<!-- prettier-ignore -->
```typescript
type MetaTimestamp = M.Primitive<
  string,
  true, // <= enables deserialization (false by default)
  Date // <= overrides resolved type
>;

type Resolved = M.Resolve<MetaTimestamp>;
// => Date
```

Note that `MetaTimestamp` will still be considered as a string meta-type until it is resolved: Deserialization only take effect **at resolution time**.

<!-- prettier-ignore -->
```typescript
type Intersected = M.Intersect<
  MetaTimestamp,
  M.Object<{}, never, M.Any> // <= Date is an object...
>;
// => M.Never
// ...but doesn't intersect Timestamp
```

In representable [intersections](#intersect):

- If no meta-type is serialized, the resulting intersection is not serialized.
- If only one meta-type (left or right) is serialized, the resulting intersection inherits from its deserialization properties.
- If both left and right meta-types are serialized, the resulting intersection inherits from both deserialization properties, through a conventional intersection (`A & B`).

<!-- prettier-ignore -->
```typescript
type MetaBrandedString = M.Primitive<
  string,
  true,
  { brand: "timestamp" }
>;

type Resolved = M.Resolve<
  M.Intersect<
    MetaTimestamp,
    MetaBrandedString
  >
>
// => Date & { brand: "timestamp" }
```

In representable [exclusions](#exclude):

- If the source meta-type is not serialized, the resulting exclusion is not serialized.
- If the source meta-type is serialized, the resulting exclusion inherits of its deserialization properties.

## 🚧 Type constraints

To prevent errors, meta-types inputs are validated against type constraints:

<!-- prettier-ignore -->
```typescript
type Invalid = M.Array<
  string // <= ❌ Meta-type expected
>;
```

If you need to use them, all type constraints are also exported:

| Meta-type     | Type constraint                                                        |
| ------------- | :--------------------------------------------------------------------- |
| `M.Any`       | `M.AnyType` = `M.Any`                                                  |
| `M.Never`     | `M.NeverType` = `M.Never`                                              |
| `M.Const`     | `M.ConstType` = `M.Const<any>`                                         |
| `M.Enum`      | `M.EnumType` = `M.Enum<any>`                                           |
| `M.Primitive` | `M.PrimitiveType` = `M.Primitive<null \| boolean \| number \| string>` |
| `M.Array`     | `M.ArrayType` = `M.Array<M.Type>`                                      |
| `M.Tuple`     | `M.TupleType` = `M.Tuple<M.Type[], M.Type>`                            |
| `M.Object`    | `M.ObjectType` = `M.Object<Record<string, M.Type>, string, M.Type>`    |
| `M.Union`     | `M.UnionType` = `M.Union<M.Type>`                                      |
| -             | `M.Type` = Union of the above                                          |

## ✂️ Unsafe types and methods

In deep and self-referencing computations like in [json-schema-to-ts](https://github.com/ThomasAribart/json-schema-to-ts), type constraints can become an issue, as the compiler may not be able to confirm the input type validity ahead of usage.

<!-- prettier-ignore -->
```typescript
type MyArray = M.Array<
  VeryDeepTypeComputation<
    ...
  > // <= 💥 Type constraint can break
>
```

For such cases, `ts-algebra` exposes **"unsafe"** types and methods, that behave the same as "safe" ones but removing any type constraints. If you use them, beware: The integrity of the compiling is up to you 😉

| Safe          | Unsafe         |
| ------------- | -------------- |
| `M.Any`       | -              |
| `M.Never`     | -              |
| `M.Const`     | -              |
| `M.Enum`      | -              |
| `M.Primitive` | `M.$Primitive` |
| `M.Array`     | `M.$Array`     |
| `M.Tuple`     | `M.$Tuple`     |
| `M.Object`    | `M.$Object`    |
| `M.Union`     | `M.$Union`     |
| `M.Resolve`   | `M.$Resolve`   |
| `M.Intersect` | `M.$Intersect` |
| `M.Exclude`   | `M.$Exclude`   |
