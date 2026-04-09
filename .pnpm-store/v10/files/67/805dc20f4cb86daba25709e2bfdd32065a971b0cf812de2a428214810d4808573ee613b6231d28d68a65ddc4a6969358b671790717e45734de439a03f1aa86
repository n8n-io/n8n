<p align="center">
  <img src="/logo.png" width="120" alt="ts-essentials">
  <h3 align="center">ts-essentials</h3>
  <p align="center">All essential TypeScript types in one place 🤙</p>
  <p align="center">
    <a href="https://www.npmjs.com/package/ts-essentials" title="View this project on NPM">
      <img alt="Version" src="https://img.shields.io/npm/v/ts-essentials.svg">
    </a>
    <img alt="Downloads" src="https://img.shields.io/npm/dm/ts-essentials.svg">
    <a href="https://github.com/ts-essentials/ts-essentials/actions?query=branch%3Amaster" title="View Github Build status">
      <img alt="Build status" src="https://github.com/ts-essentials/ts-essentials/actions/workflows/ci.yml/badge.svg">
    </a>
    <a href="https://t.me/ts_essentials" title="Get support in Telegram">
      <img alt="Telegram" src="https://img.shields.io/badge/-telegram-red?color=white&logo=telegram">
    </a>
    <a href="/package.json"><img alt="Software License" src="https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square"></a>
    <a href="https://codechecks.io"><img src="https://raw.githubusercontent.com/codechecks/docs/master/images/badges/badge-default.svg?sanitize=true" alt="codechecks.io"></a>
  </p>
</p>

## Install

```sh
npm install --save-dev ts-essentials
```

👉 We require `typescript>=4.5`. If you're looking for support for older TS versions, please have a look at the
[TypeScript dependency table](https://github.com/ts-essentials/ts-essentials/tree/master#TypeScript-dependency-table)

👉 As we really want types to be stricter, we require enabled
[strictNullChecks](https://www.typescriptlang.org/tsconfig#strictNullChecks) in your project

## API

`ts-essentials` is a set of high-quality, useful TypeScript types that make writing type-safe code easier.

### Basic

- [`Builtin`](/lib/built-in) - Matches primitive, function, date, error or regular expression
- [`KeyofBase`](/lib/key-of-base) -
  [`keyofStringsOnly`](https://www.typescriptlang.org/tsconfig#keyofStringsOnly)-tolerant analogue for `PropertyKey`
- [`Prettify<Type>`](/lib/prettify/) - flattens type and makes it more readable on the hover in your IDE
- [`Primitive`](/lib/primitive) - Matches any
  [primitive value](https://developer.mozilla.org/en-US/docs/Glossary/Primitive)
- [`StrictExclude<UnionType, ExcludedMembers>`](/lib/strict-exclude) - Constructs a type by excluding from `UnionType`
  all union members that are assignable to `ExcludedMembers`. This is stricter version of
  [`Exclude`](https://www.typescriptlang.org/docs/handbook/utility-types.html#excludeuniontype-excludedmembers)
- [`StrictExtract<Type, Union>`](/lib/strict-extract) - Constructs a type by extracting from `Type` all union members
  that are assignable to `Union`. This is stricter version of
  [`Extract`](https://www.typescriptlang.org/docs/handbook/utility-types.html#extracttype-union)
- [`StrictOmit<Type, Keys>`](/lib/strict-omit) - Constructs a type by picking all properties from `Type` and then
  removing `Keys`. This is stricter version of
  [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)
- [`Writable<Type>`](/lib/writable) - Constructs a type with removed `readonly` for all properties of `Type`, meaning
  the properties of the constructed type can be reassigned

### Utility types

- [`AsyncOrSync<Type>`](/lib/async-or-sync) - Constructs a type with `Type` or `PromiseLike<Type>`
- [`AsyncOrSyncType<Type>`](/lib/async-or-sync-type) - Unwraps `AsyncOrSync` type
- [`Dictionary<Type, Keys?>`](/lib/dictionary) - Constructs a required object type which property keys are `Keys`
  (`string` by default) and which property values are `Type`
- [`Merge<Object1, Object2>`](/lib/merge) - Constructs a type by picking all properties from `Object1` and `Object2`.
  Property values from `Object2` override property values from `Object1` when property keys are the same
- [`MergeN<Tuple>`](/lib/merge-n) - Constructs a type by merging objects with type `Merge` in tuple `Tuple` recursively
- [`Newable<ReturnType>`](/lib/newable) - Constructs a class type with constructor which has return type `ReturnType`
- [`NonNever<Type>`](/lib/non-never) - Constructs a type by picking all properties from type `Type` which values don't
  equal to `never`
- [`OmitProperties<Type, Value>`](/lib/omit-properties) - Constructs a type by picking all properties from type `Type`
  and removing those properties which values equal to `Value`
- [`Opaque<Type, Token>`](/lib/opaque) - Constructs a type which is a subset of `Type` with a specified unique token
  `Token`
- [`PathValue<Type, Path>`](/lib/path-value) - Constructs a path value for type `Type` and path `Path`
- [`Paths<Type>`](/lib/paths) - Constructs a union type by picking all possible paths for type `Type`
- [`PickProperties<Type, Value>`](/lib/pick-properties) - Constructs a type by picking all properties from type `Type`
  which values equal to `Value`
- [`SafeDictionary<Type, Keys?>`](/lib/safe-dictionary) - Constructs an optional object type which property keys are
  `Keys` (`string` by default) and which property values are `Type`
- [`UnionToIntersection<Union>`](/lib/union-to-intersection) - Constructs a intersection type from union type `Union`
- [`ValueOf<Type>`](/lib/value-of) - Constructs a type for type `Type` and equals to a primitive for primitives, array
  elements for arrays, function return type for functions or object property values for objects
- [`XOR<Type1, Type2, Type3?, ..., Type50?>`](/lib/xor) - Construct a type which is assignable to either type `Type1`,
  `Type2` but not both. Starting in ts-essentials@10, it supports up to 50 generic types.

### Mark wrapper types

- [`MarkOptional<Type, Keys>`](/lib/mark-optional) - Constructs a type by picking all properties from type `Type` where
  properties `Keys` are set as optional, meaning they aren't required
- [`MarkReadonly<Type, Keys>`](/lib/mark-readonly) - Constructs a type by picking all properties from type `Type` where
  properties `Keys` are set to `readonly`, meaning they cannot be reassigned
- [`MarkRequired<Type, Keys>`](/lib/mark-required) - Constructs a type by picking all properties from type `Type` where
  properties `Keys` are set as required
- [`MarkWritable<Type, Keys>`](/lib/mark-writable) - Constructs a type by picking all properties from type `Type` where
  properties `Keys` remove `readonly` modifier, meaning they can be reassigned

### Deep wrapper types

- [`Buildable<Type>`](/lib/buildable) - Constructs a type by combining `DeepPartial` and `DeepWritable`, meaning all
  properties from type `Type` are recursively set as non-`readonly` and optional, meaning they can be reassigned and
  aren't required
- [`DeepMarkOptional<Type, KeyPathUnion>`](/lib/deep-mark-optional) - Constructs a type by picking all properties from type `Type` where
  properties by paths `KeyPathUnion` are set as optional. To mark properties optional on one level, use [`MarkOptional<Type, Keys>`](/lib/mark-optional).  
- [`DeepMarkRequired<Type, KeyPathUnion>`](/lib/deep-mark-required) - Constructs a type by picking all properties from type `Type` where
  properties by paths `KeyPathUnion` are set as required. To mark properties required on one level, use [`MarkRequired<Type, Keys>`](/lib/mark-required).
- [`DeepNonNullable<Type>`](/lib/deep-non-nullable) - Constructs a type by picking all properties from type `Type`
  recursively and exclude `null` and `undefined` property values from all of them. To make properties non-nullable on
  one level, use [`NonNullable<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#nonnullabletype)
- [`DeepNullable<Type>`](/lib/deep-nullable) - Constructs a type by picking all properties from type `Type` recursively
  and include `null` property values for all of them
- [`DeepOmit<Type, Filter>`](/lib/deep-omit) - Constructs a type by picking all properties from type `Type` and removing
  properties which values are `never` or `true` in type `Filter`. If you'd like type `Filter` to be validated against a
  structure of `Type`, please use [`StrictDeepOmit<Type, Filter>`](./lib/strict-deep-omit/).
- [`DeepPartial<Type>`](/lib/deep-partial) - Constructs a type by picking all properties from type `Type` recursively
  and setting them as optional, meaning they aren't required. To make properties optional on one level, use
  [`Partial<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)
- [`DeepPick<Type, Filter>`](/lib/deep-pick) - Constructs a type by picking set of properties, which have property
  values `never` or `true` in type `Filter`, from type `Type`. If you'd like type `Filter` to be validated against a
  structure of `Type`, please use [`StrictDeepPick<Type, Filter>`](./lib/strict-deep-pick/).
- [`DeepReadonly<Type>`](/lib/deep-readonly) - Constructs a type by picking all properties from type `Type` recursively
  and setting `readonly` modifier, meaning they cannot be reassigned. To make properties `readonly` on one level, use
  [`Readonly<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype)
- [`DeepRequired<Type>`](/lib/deep-required) - Constructs a type by picking all properties from type `Type` recursively
  and setting as required. To make properties required on one level, use
  [`Required<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#requiredtype)
- [`DeepUndefinable<Type>`](/lib/deep-undefinable) - Constructs a type by picking all properties from type `Type`
  recursively and include `undefined` property values for all of them
- [`DeepWritable<Type>`](/lib/deep-writable) - Constructs a type by picking all properties from type `Type` recursively
  and removing `readonly` modifier, meaning they can be reassigned. To make properties writable on one level, use
  `Writable<Type>`
- [`StrictDeepOmit<Type, Filter>`](/lib/strict-deep-omit) - Constructs a type by picking all properties from type `Type`
  and removing properties which values are `never` or `true` in type `Filter`. The type `Filter` is validated against a
  structure of `Type`.
- [`StrictDeepPick<Type, Filter>`](/lib/strict-deep-pick) - Constructs a type by picking set of properties, which have
  property values `never` or `true` in type `Filter`, from type `Type`. The type `Filter` is validated against a
  structure of `Type`.

### Key types

- [`OptionalKeys<Type>`](/lib/optional-keys) - Constructs a union type by picking all optional properties of object type
  `Type`
- [`PickKeys<Type, Value>`](/lib/pick-keys) - Constructs a union type by picking all properties of object type `Type`
  which values are assignable to type `Value`
- [`ReadonlyKeys<Type>`](/lib/readonly-keys) - Constructs a union type by picking all `readonly` properties of object
  type `Type`, meaning their values cannot be reassigned
- [`RequiredKeys<Type>`](/lib/required-keys) - Constructs a union type by picking all required properties of object type
  `Type`
- [`WritableKeys<Type>`](/lib/writable-keys) - Constructs a union type by picking all writable properties of object type
  `Type`, meaning their values can be reassigned

### Type checkers

- [`Exact<Type, Shape>`](/lib/exact) - Returns `Type` when type `Type` and `Shape` are identical. Otherwise returns
  `never`
- [`IsAny<Type>`](/lib/is-any) - Returns `true` when type `Type` is `any`. Otherwise returns `false`
- [`IsNever<Type>`](/lib/is-never) - Returns `true` when type `Type` is `never`. Otherwise returns `false`
- [`IsUnknown<Type>`](/lib/is-unknown) - Returns `true` when type `Type` is `unknown`. Otherwise returns `false`
- [`IsTuple<Type>`](/lib/is-tuple) - Returns `Type` when type `Type` is tuple. Otherwise returns `never`
- [`NonEmptyObject<Object>`](/lib/non-empty-object) - Returns `Object` when `Object` has at least one key. Otherwise
  returns `never`

### Arrays and Tuples

- [`AnyArray<Type?>`](/lib/any-array) - Matches `Array` or `ReadonlyArray` (`Type` is `any` by default)
- [`ArrayOrSingle<Type>`](/lib/array-or-single) - Matches `Type` or `Type[]`
- [`ElementOf<Type>`](/lib/element-of) - Constructs a type which equals to array element type for type `Type`
- [`Head<Type>`](/lib/head) - Constructs a type which equals to first element in type `Type`
- [`NonEmptyArray<Type>`](/lib/non-empty-array) - Matches array with at least one element of type `Type`
- [`ReadonlyArrayOrSingle`](/lib/readonly-array-or-single) - Matches `Type` or `readonly Type[]`
- [`Tail<Type>`](/lib/tail) - Constructs a type which equals to elements but first one in type `Type`
- [`Tuple<Type?>`](/lib/tuple) - Matches type constraint for tuple with elements of type `Type` (`any` by default)

### Change case

- [`CamelCase<Type>`](/lib/camel-case) - Converts type `Type` to camel case (e.g. `camelCase`)
- [`DeepCamelCaseProperties<Type>`](/lib/deep-camel-case-properties) - Constructs a type by picking all properties from
  type `Type` recursively and converting all of them to camel case

### Function types

- [`AnyFunction<Args?, ReturnType?>`](/lib/any-function) - Matches function type with arguments type `Args` (`any[]` by
  default) and return type `ReturnType` (`any` by default)
- [`PredicateFunction`](/lib/predicate-function) - Matches type constraint for type guard, meaning first argument is
  used in return type and return type is
  [type predicate](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- [`PredicateType<Type>`](/lib/predicate-type) - Constructs a type which equals to narrowed type in predicate function
  `Type`

### Utility functions

⚠️ Make sure you add `ts-essentials` to your `dependencies` (`npm install --save ts-essentials`) to avoid runtime errors

- [`new UnreachableCaseError(value)`](/lib/functions/unreachable-case-error) - Matches runtime class instance type that
  helps check exhaustiveness for `value`. When `value` isn't `never`, it shows TypeScript error
- [`assert(condition, message?)`](/lib/functions/assert) - Matches runtime function that helps assert `condition`. When
  `condition` is falsy, it throws an error with `Assertion Error: ${message}` (message is
  `"no additional info provided"` by default)
- [`createFactoryWithConstraint<Constraint>()(value)`](/lib/functions/create-factory-with-constraint) - Matches runtime
  function, which validates that type of `value` matches `Constraint` without changing resulting type of `value`.
  Ponyfill for
  [`satisfies` operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [`isExact<Expected>()(actual)`](/lib/functions/is-exact) - Matches runtime function, which validates that type of
  `actual` equals to `Expected`. Otherwise shows TypeScript error
- [`noop(..._args)`](/lib/functions/noop) - Matches runtime function that does nothing with arguments `_args`

## Search

When one of utility types is known by a different name, kindly ask adding it here for the better search.

- `ArrayValues` - [`ValueOf<Type>`](/lib/value-of)
- `Branded` - [`Opaque<Type, Token>`](/lib/opaque)
- `ConditionalKeys` - [`PickKeys<Type, Value>`](/lib/pick-keys)
- `Except` - [`StrictOmit<Type, Keys>`](/lib/strict-omit)
- `Get` - [`PathValue<Type, Path>`](/lib/path-value)
- `Mutable` - [`Writable<Type>`](/lib/writable)
- `Nominal` - [`Opaque<Type, Token>`](/lib/opaque)
- `Set*`, e.g. `SetOptional` - `Mark*`, e.g. [`MarkReadonly<Type, Keys>`](/lib/mark-readonly)
- `Unwrap` - [`Prettify<Type>`](/lib/prettify/)
- `ValueOf` - `DictionaryValues`

## Built-in types

TypeScript provides several [utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html) to
facilitate common type transformations. These utilities are available globally.

- [`Awaited<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#awaitedtype) - This type is meant to
  model operations like `await` in `async` functions, or the `.then()` method on `Promise`s - specifically, the way that
  they recursively unwrap `Promise`s
- [`Capitalize<StringType>`](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html#capitalizestringtype) -
  Converts the first character in the string to an uppercase equivalent
- [`ConstructParameters<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#constructorparameterstype) -
  Constructs a tuple or array type from the types of a constructor function type `Type`
- [`Exclude<UnionType, ExcludedMembers>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#excludeuniontype-excludedmembers) -
  Constructs a type by excluding from `UnionType` all union members that are assignable to `ExcludedMembers`
- [`Extract<Type, Union>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#extracttype-union) -
  Constructs a type by extracting from `Type` all union members that are assignable to `Union`
- [`InstanceType<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#instancetypetype) - Constructs
  a type consisting of the instance type of a constructor function in `Type`
- [`Lowercase<StringType>`](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html#lowercasestringtype) -
  Converts each character in the string to the lowercase equivalent
- [`NonNullable<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#nonnullabletype) - Constructs a
  type by excluding null and undefined from `Type`
- [`Omit<Type, Keys>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys) - Constructs a
  type by picking all properties from `Type` and then removing `Keys`
- [`Parameters<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#parameterstype) - Constructs a
  tuple type from the types used in the parameters of a function type `Type`
- [`Partial<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype) - Constructs a type
  with all properties of `Type` set to optional
- [`Pick<Type, Keys>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys) - Constructs a
  type by picking the set of properties `Keys` from `Type`
- [`Readonly<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype) - Constructs a type
  with all properties of `Type` set to `readonly`, meaning the properties of the constructed type cannot be reassigned
- [`Record<Keys, Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type) - Constructs
  an object type whose property keys are `Keys` and whose property values are `Type`
- [`Required<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#requiredtype) - Constructs a type
  consisting of all properties of `Type` set to required
- [`ReturnType<Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#returntypetype) - Constructs a
  type consisting of the return type of function type `Type` parameter
- [`Uncapitalize<StringType>`](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html#uncapitalizestringtype) -
  Converts the first character in the string to a lowercase equivalent
- [`Uppercase<StringType>`](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html#uppercasestringtype) -
  Converts each character in the string to the uppercase version

## TypeScript dependency table

| `ts-essentials` | `typescript` / type of dependency                                                     |
| --------------- | ------------------------------------------------------------------------------------- |
| `^10.0.0`       | `^4.5.0` / [peer optional](https://github.com/ts-essentials/ts-essentials/issues/370) |
| `^9.4.0`        | `^4.1.0` / [peer optional](https://github.com/ts-essentials/ts-essentials/issues/370) |
| `^8.0.0`        | `^4.1.0` / peer                                                                       |
| `^5.0.0`        | `^3.7.0` / peer                                                                       |
| `^3.0.1`        | `^3.5.0` / peer                                                                       |
| `^1.0.1`        | `^3.2.2` / dev                                                                        |
| `^1.0.0`        | `^3.0.3` / dev                                                                        |

## Limitations

- This project doesn't use `extends` Constraints on `infer` Type Variables as it's introduced in TypeScript 4.7, but currently ts-essentials supports versions below, e.g. TypeScript 4.5. Read more in https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#extends-constraints-on-infer-type-variables

## Contributors

Special shout-out to active contributors:

- [Kris Kaczor](https://x.com/krzkaczor) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=krzkaczor)
- [Xiao Liang](https://scholar.google.com/citations?user=3xZtvpAAAAAJ) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=yxliang01)
- [Mateusz Burzyński](https://x.com/AndaristRake) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=Andarist)
- [Artur Kozak](https://x.com/quezak2) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=quezak)
- [Zihua Wu](https://x.com/gabriel_wzh) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=lucifer1004)
- [Alexey Berezin](https://x.com/beraliv) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=Beraliv)
- [Som Shekhar Mukherjee](https://github.com/som-sm) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=som-sm)

And thanks goes to these wonderful people:

- [Maciej Bembenista](https://github.com/macbem) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=macbem)
- [Michael Tontchev](https://www.linkedin.com/in/michael-tontchev-7956a269/) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=MichaelTontchev)
- [Thomas den Hollander](https://github.com/ThomasdenH) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=ThomasdenH)
- [Esa-Matti Suuronen](https://x.com/esamatti)
- [Ilya Semenov](https://github.com/IlyaSemenov) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=IlyaSemenov)
- [Patricio Palladino](https://github.com/alcuadrado)
- [Kevin Peno](https://github.com/kevinpeno) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=kevinpeno)
- [Dom Parfitt](https://github.com/DomParfitt)
- [Eduardo Rafael](https://x.com/TheEduardoRFS) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=EduardoRFS)
- [Andrew C. Dvorak](https://github.com/acdvorak) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=acdvorak)
- [Adam Russell](https://github.com/a1russell) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=a1russell)
- [Piotr Szlachciak](https://github.com/sz-piotr) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=sz-piotr)
- [Mikhail Swift](https://github.com/mikhailswift) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=mikhailswift)
- [Ryan Zhang](https://github.com/DevilZh)
- [Francesco Borzì](https://www.linkedin.com/in/francesco-borzi/) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=FrancescoBorzi)
- [Marnick L'Eau](https://github.com/leaumar)
- [Egor Gorbachev](https://github.com/kubk)
- [Bill Barry](https://github.com/bbarry) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=bbarry)
- [Andrzej Wódkiewicz](https://github.com/akwodkiewicz) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=akwodkiewicz)
- [Christian Junker](https://www.linkedin.com/in/chjdev/)
- [Matthew Leffler](https://github.com/mattleff) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=mattleff)
- [studds](https://github.com/studds) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=studds)
- [Robert Vitonsky](https://github.com/vitonsky)
- [Itay Ronen](https://github.com/itayronen) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=itayronen)
- [Yaroslav Larin](https://github.com/cyberbiont)
- [liaoyinglong](https://github.com/liaoyinglong) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=liaoyinglong)
- [Yannick Stachelscheid](https://github.com/yss14) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=yss14)
- [Peter Smolinský](https://github.com/psmolinsky) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=psmolinsky)
- [Anurag Hazra](https://github.com/anuraghazra) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=anuraghazra)
- [Bishwajit Jha](https://github.com/ajitjha393) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=ajitjha393)
- [Sergey Ukustov](https://github.com/ukstv) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=ukstv)
- [Homa Wong](https://github.com/unional) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=unional)
- [polyipseity](https://github.com/polyipseity) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=polyipseity)
- [Kristóf Poduszló](https://github.com/kripod) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=kripod)
- [MT Lewis](https://github.com/mtlewis) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=mtlewis)
- [Daniel Bertocci](https://github.com/DanielBertocci) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=DanielBertocci)
- [Myles J](https://github.com/mylesj) / [💻](https://github.com/ts-essentials/ts-essentials/commits?author=mylesj)

💻 - contributions, i.e. links to commits by the user on this project

Contributions of any kind welcome! [Read more](./CONTRIBUTING.md)
