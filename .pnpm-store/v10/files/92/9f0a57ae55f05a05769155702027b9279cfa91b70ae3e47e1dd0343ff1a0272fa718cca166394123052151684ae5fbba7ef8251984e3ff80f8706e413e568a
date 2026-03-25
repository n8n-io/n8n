<h1 align="center">TS-Pattern</h1>

<p align="center">
The exhaustive Pattern Matching library for <a href="https://github.com/microsoft/TypeScript">TypeScript</a>
with smart type inference.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ts-pattern">
    <img src="https://img.shields.io/npm/dm/ts-pattern.svg" alt="downloads" height="18">
  </a>
  <a href="https://www.npmjs.com/package/ts-pattern">
    <img src="https://img.shields.io/npm/v/ts-pattern.svg" alt="npm version" height="18">
  </a>
  <a href="https://github.com/gvergnaud/ts-pattern">
    <img src="https://img.shields.io/npm/l/ts-pattern.svg" alt="MIT license" height="18">
  </a>
</p>

```tsx
import { match, P } from 'ts-pattern';

type Data =
  | { type: 'text'; content: string }
  | { type: 'img'; src: string };

type Result =
  | { type: 'ok'; data: Data }
  | { type: 'error'; error: Error };

const result: Result = ...;

const html = match(result)
  .with({ type: 'error' }, () => <p>Oups! An error occured</p>)
  .with({ type: 'ok', data: { type: 'text' } }, (res) => <p>{res.data.content}</p>)
  .with({ type: 'ok', data: { type: 'img', src: P.select() } }, (src) => <img src={src} />)
  .exhaustive();
```

## About

Write **better** and **safer conditions**. Pattern matching lets you express complex conditions in a single, compact expression. Your code becomes **shorter** and **more readable**. Exhaustiveness checking ensures you haven’t forgotten **any possible case**.

![ts-pattern](https://user-images.githubusercontent.com/9265418/231688650-7cd957a9-8edc-4db8-a5fe-61e1c2179d91.gif)

<p align="center"><i>Animation by <a target="_blank" href="https://twitter.com/nicoespeon/status/1644342570389061634?s=20">@nicoespeon</a></i></p>

## Features

- Pattern-match on **any data structure**: nested [Objects](#objects), [Arrays](#tuples-arrays), [Tuples](#tuples-arrays), [Sets](#pset-patterns), [Maps](#pmap-patterns) and all primitive types.
- **Typesafe**, with helpful [type inference](#type-inference).
- **Exhaustiveness checking** support, enforcing that you are matching every possible case with [`.exhaustive()`](#exhaustive).
- Use [patterns](#patterns) to **validate** the shape of your data with [`isMatching`](#ismatching).
- **Expressive API**, with catch-all and type specific **wildcards**: [`P._`](#p_-wildcard), [`P.string`](#pstring-wildcard), [`P.number`](#pnumber-wildcard), etc.
- Supports [**predicates**](#pwhen-patterns), [**unions**](#punion-patterns), [**intersections**](#pintersection-patterns) and [**exclusion**](#pnot-patterns) patterns for non-trivial cases.
- Supports properties selection, via the [`P.select(name?)`](#pselect-patterns) function.
- Tiny bundle footprint ([**only ~2kB**](https://bundlephobia.com/package/ts-pattern)).

## What is Pattern Matching?

[Pattern Matching](https://en.wikipedia.org/wiki/Pattern_matching) is a code-branching technique coming from functional programming languages that's more powerful and often less verbose than imperative alternatives (if/else/switch statements), especially for complex conditions.

Pattern Matching is implemented in Python, Rust, Swift, Elixir, Haskell and many other languages. There is [a tc39 proposal](https://github.com/tc39/proposal-pattern-matching) to add Pattern Matching to EcmaScript, but it is still in stage 1 and isn't likely to land before several years. Luckily, pattern matching can be implemented in userland. `ts-pattern` Provides a typesafe pattern matching implementation that you can start using today.

Read the introduction blog post: [Bringing Pattern Matching to TypeScript 🎨 Introducing TS-Pattern](https://dev.to/gvergnaud/bringing-pattern-matching-to-typescript-introducing-ts-pattern-v3-0-o1k)

## Installation

Via npm

```sh
npm install ts-pattern
```

You can also use your favorite package manager:

```sh
pnpm add ts-pattern
# OR
yarn add ts-pattern
# OR
bun add ts-pattern
# OR
npx jsr add @gabriel/ts-pattern
```

## Want to become a TypeScript Expert?

Check out 👉 [Type-Level TypeScript](https://type-level-typescript.com/), an online course teaching you how to unleash the full potential of TypeScript's Turing-complete type system. You already know how to code, and types are simply another programming language to master. This course bridges the gap, helping you apply your existing programming knowledge to TypeScript's type system, so you never again struggle with type errors or feel unable to type complex generic code correctly!

Type-Level TypeScript takes you on a deep dive into the most advanced features of the type system. By the end of this journey, you'll emerge as one of your company's best TypeScript developers. You'll know how to craft elegant code and create awesome libraries that your colleagues will love using!

# Documentation

- [Sandbox examples](#sandbox-examples)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
  - [`match`](#match)
  - [`.with`](#with)
  - [`.when`](#when)
  - [`.returnType`](#returntype)
  - [`.exhaustive`](#exhaustive)
  - [`.otherwise`](#otherwise)
  - [`.narrow`](#narrow)
  - [`isMatching`](#ismatching)
  - [Patterns](#patterns)
    - [Literals](#literals)
    - [Wildcards](#wildcards)
    - [Objects](#objects)
    - [Tuples (arrays)](#tuples-arrays)
    - [Sets](#pset-patterns)
    - [Maps](#pmap-patterns)
    - [`P.array` patterns](#parray-patterns)
    - [`P.when` patterns](#pwhen-patterns)
    - [`P.not` patterns](#pnot-patterns)
    - [`P.select` patterns](#pselect-patterns)
    - [`P.optional` patterns](#poptional-patterns)
    - [`P.instanceOf` patterns](#pinstanceof-patterns)
    - [`P.union` patterns](#punion-patterns)
    - [`P.intersection` patterns](#pintersection-patterns)
    - [`P.string` predicates](#pstring-predicates)
    - [`P.number` and `P.bigint` predicates](#pnumber-and-pbigint-predicates)
  - [Types](#types)
    - [`P.infer`](#pinfer)
    - [`P.Pattern`](#pPattern)
    - [Type inference](#type-inference)
- [Inspirations](#inspirations)

## Sandbox examples

- [Basic Demo](https://stackblitz.com/edit/vitejs-vite-qrk8po?file=src%2Fexamples%2Fbasic.tsx)
- [React gif fetcher app Demo](https://stackblitz.com/edit/ts-pattern-gifs?file=src%2FApp.tsx)
- [React.useReducer Demo](https://stackblitz.com/edit/ts-pattern-reducer?file=src%2FApp.tsx)
- [Handling untyped API response Demo](https://stackblitz.com/edit/vitejs-vite-qrk8po?file=src%2Fexamples%2Fapi.tsx)
- [`P.when` Guard Demo](https://stackblitz.com/edit/vitejs-vite-qrk8po?file=src%2Fexamples%2Fwhen.tsx)
- [`P.not` Pattern Demo](https://stackblitz.com/edit/vitejs-vite-qrk8po?file=src%2Fexamples%2Fnot.tsx)
- [`P.select` Pattern Demo](https://stackblitz.com/edit/vitejs-vite-qrk8po?file=src%2Fexamples%2Fselect.tsx)
- [`P.union` Pattern Demo](https://stackblitz.com/edit/vitejs-vite-qrk8po?file=src%2Fexamples%2Funion.tsx)

## Getting Started

As an example, let's create a state reducer for a frontend application that fetches some data.

### Example: a state reducer with ts-pattern

Our application can be in four different states: `idle`, `loading`,
`success` and `error`. Depending on which state we are in, some events
can occur. Here are all the possible types of event our application
can respond to: `fetch`, `success`, `error` and `cancel`.

I use the word `event` but you can replace it with `action` if you are used
to Redux's terminology.

```ts
type State =
  | { status: 'idle' }
  | { status: 'loading'; startTime: number }
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };

type Event =
  | { type: 'fetch' }
  | { type: 'success'; data: string }
  | { type: 'error'; error: Error }
  | { type: 'cancel' };
```

Even though our application can handle 4 events, **only a subset** of these
events **make sense for each given state**. For instance we can only `cancel`
a request if we are currently in the `loading` state.
To avoid unwanted state changes that could lead to bugs, we want our state reducer function to branch on **both the state and the event**, and return a new state.

This is a case where `match` really shines. Instead of writing nested switch statements, we can use pattern matching to simultaneously check the state and the event object:

<!-- prettier-ignore -->
```ts
import { match, P } from 'ts-pattern';

const reducer = (state: State, event: Event) =>
  match([state, event])
    .returnType<State>()
    .with(
      [{ status: 'loading' }, { type: 'success' }],
      ([_, event]) => ({ status: 'success', data: event.data })
    )
    .with(
      [{ status: 'loading' }, { type: 'error', error: P.select() }],
      (error) => ({ status: 'error', error })
    )
    .with(
      [{ status: P.not('loading') }, { type: 'fetch' }],
      () => ({ status: 'loading', startTime: Date.now() })
    )
    .with(
      [
        {
          status: 'loading',
          startTime: P.when((t) => t + 2000 < Date.now()),
        },
        { type: 'cancel' },
      ],
      () => ({ status: 'idle' })
    )
    .with(P._, () => state)
    .exhaustive();
```

There's a lot going on, so **let's go through this code bit by bit:**

### match(value)

`match` takes a value and returns a [_builder_](https://en.wikipedia.org/wiki/Builder_pattern) on which you can add your pattern matching cases.

<!-- prettier-ignore -->
```ts
match([state, event])
```

It's also possible to specify the input and output type explicitly with `match<Input, Output>(...)`, but this is usually unnecessary, as TS-Pattern is able to infer them.

### .returnType\<OutputType\>()

`.returnType` is an optional method that you can call if you want to force all following code-branches to return a value of a specific type. It takes a single type parameter, provided between `<AngleBrackets>`.

```ts
  .returnType<State>()
```

Here, we use this method to make sure all branches return a valid `State` object.

### .with(pattern, handler)

Then we add a first `with` clause:

```ts
  .with(
    [{ status: 'loading' }, { type: 'success' }],
    ([state, event]) => ({
      // `state` is inferred as { status: 'loading' }
      // `event` is inferred as { type: 'success', data: string }
      status: 'success',
      data: event.data,
    })
  )
```

The first argument is the **pattern**: the **shape of value** you expect for this branch.

The second argument is the **handler function**: the code **branch** that will be called if the input value matches the pattern.

The handler function takes the input value as first parameter with its type **narrowed down** to what the pattern matches.

### P.select(name?)

In the second `with` clause, we use the `P.select` function:

```ts
  .with(
    [
      { status: 'loading' },
      { type: 'error', error: P.select() }
    ],
    (error) => ({ status: 'error', error })
  )
```

`P.select()` lets you **extract** a piece of your input value and **inject** it into your handler. It is pretty useful when pattern matching on deep data structures because it avoids the hassle of destructuring your input in your handler.

Since we didn't pass any name to `P.select()`, It will inject the `event.error` property as first argument to the handler function. Note that you can still access **the full input value** with its type narrowed by your pattern as **second argument** of the handler function:

```ts
  .with(
    [
      { status: 'loading' },
      { type: 'error', error: P.select() }
    ],
    (error, stateAndEvent) => {
      // error: Error
      // stateAndEvent: [{ status: 'loading' }, { type: 'error', error: Error }]
    }
  )
```

In a pattern, we can only have a **single** anonymous selection. If you need to select more properties on your input data structure, you will need to give them **names**:

```ts
.with(
    [
      { status: 'success', data: P.select('prevData') },
      { type: 'error', error: P.select('err') }
    ],
    ({ prevData, err }) => {
      // Do something with (prevData: string) and (err: Error).
    }
  )
```

Each named selection will be injected inside a `selections` object, passed as first argument to the handler function. Names can be any strings.

### P.not(pattern)

If you need to match on everything **but** a specific value, you can use a `P.not(<pattern>)` pattern. it's a function taking a pattern and returning its opposite:

```ts
  .with(
    [{ status: P.not('loading') }, { type: 'fetch' }],
    () => ({ status: 'loading' })
  )
```

### `P.when()` and guard functions

Sometimes, we need to make sure our input value respects a condition that can't be expressed by a pattern. For example, imagine you need to check that a number is positive. In these cases, we can use **guard functions**: functions taking a value and returning a `boolean`.

With TS-Pattern, there are two ways to use a guard function:

- use `P.when(<guard function>)` inside one of your patterns
- pass it as second parameter to `.with(...)`

#### using P.when(predicate)

```ts
  .with(
    [
      {
        status: 'loading',
        startTime: P.when((t) => t + 2000 < Date.now()),
      },
      { type: 'cancel' },
    ],
    () => ({ status: 'idle' })
  )
```

#### Passing a guard function to `.with(...)`

`.with` optionally accepts a guard function as second parameter, between
the `pattern` and the `handler` callback:

```ts
  .with(
    [{ status: 'loading' }, { type: 'cancel' }],
    ([state, event]) => state.startTime + 2000 < Date.now(),
    () => ({ status: 'idle' })
  )
```

This pattern will only match if the guard function returns `true`.

### the `P._` wildcard

`P._` will match any value. You can use it either at the top level, or within another pattern.

```ts
  .with(P._, () => state)

  // You could also use it inside another pattern:
  .with([P._, P._], () => state)

  // at any level:
  .with([P._, { type: P._ }], () => state)

```

### .exhaustive(), .otherwise() and .run()

```ts
  .exhaustive();
```

`.exhaustive()` **executes** the pattern matching expression, and **returns the result**. It also enables **exhaustiveness checking**, making sure we don't forget any possible case in our input value. This extra type safety is very nice because forgetting a case is an easy mistake to make, especially in an evolving code-base.

Note that exhaustive pattern matching is **optional**. It comes with the trade-off of having slightly **longer compilation times** because the type checker has more work to do.

Alternatively, you can use `.otherwise()`, which takes an handler function returning a default value. `.otherwise(handler)` is equivalent to `.with(P._, handler).exhaustive()`.

```ts
  .otherwise(() => state);
```

### Matching several patterns

As you may know, `switch` statements allow handling several cases with
the same code block:

```ts
switch (type) {
  case 'text':
  case 'span':
  case 'p':
    return 'text';

  case 'btn':
  case 'button':
    return 'button';
}
```

Similarly, ts-pattern lets you pass several patterns to `.with()` and if
one of these patterns matches your input, the handler function will be called:

```ts
const sanitize = (name: string) =>
  match(name)
    .with('text', 'span', 'p', () => 'text')
    .with('btn', 'button', () => 'button')
    .otherwise(() => name);

sanitize('span'); // 'text'
sanitize('p'); // 'text'
sanitize('button'); // 'button'
```

As you might expect, this also works with more complex patterns than strings and exhaustiveness checking works as well.

## API Reference

### `match`

```ts
match(value);
```

Create a `Match` object on which you can later call `.with`, `.when`, `.otherwise` and `.run`.

#### Signature

```ts
function match<TInput, TOutput>(input: TInput): Match<TInput, TOutput>;
```

#### Arguments

- `input`
  - **Required**
  - the input value your patterns will be tested against.

### `.with`

```ts
match(...)
  .with(pattern, [...patterns], handler)
```

#### Signature

```ts
function with(
  pattern: Pattern<TInput>,
  handler: (selections: Selections<TInput>, value: TInput) => TOutput
): Match<TInput, TOutput>;

// Overload for multiple patterns
function with(
  pattern1: Pattern<TInput>,
  ...patterns: Pattern<TInput>[],
  // no selection object is provided when using multiple patterns
  handler: (value: TInput) => TOutput
): Match<TInput, TOutput>;

// Overload for guard functions
function with(
  pattern: Pattern<TInput>,
  when: (value: TInput) => unknown,
  handler: (
    selection: Selection<TInput>,
    value: TInput
  ) => TOutput
): Match<TInput, TOutput>;
```

#### Arguments

- `pattern: Pattern<TInput>`
  - **Required**
  - The pattern your input must match for the handler to be called.
  - [See all valid patterns below](#patterns)
  - If you provide several patterns before providing the `handler`, the `with` clause will match if one of the patterns matches.
- `when: (value: TInput) => unknown`
  - Optional
  - Additional condition the input must satisfy for the handler to be called.
  - The input will match if your guard function returns a truthy value.
  - `TInput` might be narrowed to a more precise type using the `pattern`.
- `handler: (selections: Selections<TInput>, value: TInput) => TOutput`
  - **Required**
  - Function called when the match conditions are satisfied.
  - All handlers on a single `match` case must return values of the same type, `TOutput`.
  - `selections` is an object of properties selected from the input with the [`select` function](#select-patterns).
  - `TInput` might be narrowed to a more precise type using the `pattern`.

### `.when`

```ts
match(...)
  .when(predicate, handler)
```

#### Signature

```ts
function when(
  predicate: (value: TInput) => unknown,
  handler: (value: TInput) => TOutput
): Match<TInput, TOutput>;
```

#### Arguments

- `predicate: (value: TInput) => unknown`
  - **Required**
  - Condition the input must satisfy for the handler to be called.
- `handler: (value: TInput) => TOutput`
  - **Required**
  - Function called when the predicate condition is satisfied.
  - All handlers on a single `match` case must return values of the same type, `TOutput`.

### `.returnType`

```ts
match(...)
  .returnType<string>()
  .with(..., () => "has to be a string")
  .with(..., () => "Oops".length)
  //               ~~~~~~~~~~~~~ ❌ `number` isn't a string!
```

The `.returnType<SomeType>()` method allows you to control the return type of all of your branches of code. It accepts a single type parameter that will be used as the return type of your `match` expression. All code branches must return values assignable to this type.

#### Signature

```ts
function returnType<TOutputOverride>(): Match<TInput, TOutputOverride>;
```

#### Type arguments

- `TOutputOverride`
  - The type that your `match` expression will return. All branches must return values assignable to it.

### `.exhaustive`

```ts
match(...)
  .with(...)
  .exhaustive()
```

Runs the pattern-matching expression and returns its result. It also enables exhaustiveness checking, making sure that we have handled all possible cases **at compile time**.

By default, `.exhaustive()` will throw an error if the input value wasn't handled by any `.with(...)` clause. This should only happen if your types are incorrect.

It is possible to pass your own handler function as a parameter to decide what should happen if an unexpected value has been received. You can for example throw your own custom error:

```ts
match(...)
  .with(...)
  .exhaustive((unexpected: unknown) => {
    throw MyCustomError(unexpected);
  })
```

Or log an error and return a default value:

```ts
match<string, number>(...)
  .with(P.string, (str) => str.length)
  .exhaustive((notAString: unknown) => {
    console.log(`received an unexpected value: ${notAString}`);
    return 0;
  })
```

#### Signature

```ts
function exhaustive(): TOutput;
function exhaustive(handler: (unexpectedValue: unknown) => TOutput): TOutput;
```

#### Example

```ts
type Permission = 'editor' | 'viewer';
type Plan = 'basic' | 'pro';

const fn = (org: Plan, user: Permission) =>
  match([org, user])
    .with(['basic', 'viewer'], () => {})
    .with(['basic', 'editor'], () => {})
    .with(['pro', 'viewer'], () => {})
    // Fails with `NonExhaustiveError<['pro', 'editor']>`
    // because the `['pro', 'editor']` case isn't handled.
    .exhaustive();

const fn2 = (org: Plan, user: Permission) =>
  match([org, user])
    .with(['basic', 'viewer'], () => {})
    .with(['basic', 'editor'], () => {})
    .with(['pro', 'viewer'], () => {})
    .with(['pro', 'editor'], () => {})
    .exhaustive(); // Works!
```

### `.otherwise`

```ts
match(...)
  .with(...)
  .otherwise(defaultHandler)
```

Runs the pattern-matching expression with a default handler which will be called if no previous `.with()` clause match the input value, and returns the result.

#### Signature

```ts
function otherwise(defaultHandler: (value: TInput) => TOutput): TOutput;
```

#### Arguments

- `defaultHandler: (value: TInput) => TOutput`
  - **Required**
  - Function called if no pattern matched the input value.
  - Think of it as the `default:` case of `switch` statements.
  - All handlers on a single `match` case must return values of the same type, `TOutput`.

### `.run`

```ts
match(...)
  .with(...)
  .run()
```

returns the result of the pattern-matching expression, or **throws** if no pattern matched the input. `.run()` is similar to `.exhaustive()`, but is **unsafe** because exhaustiveness is not checked at compile time, so you have no guarantees that all cases are indeed covered. Use at your own risks.

#### Signature

```ts
function run(): TOutput;
```

### `.narrow`

```ts
match(...)
  .with(...)
  .narrow()
  .with(...)
```

The `.narrow()` method deeply narrows the input type to exclude all values that have previously been handled. This is useful when you want to exclude cases from union types or nullable properties that are deeply nested.

Note that handled case of top-level union types are excluded by default, without calling `.narrow()`.

#### Signature

```ts
function narrow(): Match<Narrowed<TInput>, TOutput>;
```

#### Example

```ts
type Input = { color: 'red' | 'blue'; size: 'small' | 'large' };

declare const input: Input;

const result = match(input)
  .with({ color: 'red', size: 'small' }, (red) => `Red: ${red.size}`)
  .with({ color: 'blue', size: 'large' }, (red) => `Red: ${red.size}`)
  .narrow() // 👈
  .otherwise((narrowedInput) => {
    // narrowedInput:
    // | { color: 'red'; size: 'large' }
    // | { color: 'blue'; size: 'small' }
  });
```

### `isMatching`

```ts
if (isMatching(pattern, value))  {
  ...
}
```

`isMatching` is a type guard function which checks if a pattern matches a given value. It is _curried_, which means it can be used in two ways.

With a single argument:

```ts
import { isMatching, P } from 'ts-pattern';

const isBlogPost = isMatching({
  type: 'blogpost',
  title: P.string,
  description: P.string,
});

if (isBlogPost(value)) {
  // value: { type: 'blogpost', title: string, description: string }
}
```

With two arguments:

```ts
const blogPostPattern = {
  type: 'blogpost',
  title: P.string,
  description: P.string,
} as const;

if (isMatching(blogPostPattern, value)) {
  // value: { type: 'blogpost', title: string, description: string }
}
```

#### Signature

```ts
export function isMatching<p extends Pattern<any>>(
  pattern: p
): (value: any) => value is InvertPattern<p>;
export function isMatching<p extends Pattern<any>>(
  pattern: p,
  value: any
): value is InvertPattern<p>;
```

#### Arguments

- `pattern: Pattern<any>`
  - **Required**
  - The pattern a value should match.
- `value?: any`
  - **Optional**
  - if a value is given as second argument, `isMatching` will return a boolean telling us whether the pattern matches the value or not.
  - if we only give the pattern to the function, `isMatching` will return another **type guard function** taking a value and returning a boolean which tells us whether the pattern matches the value or not.

## Patterns

A pattern is a description of the expected shape of your input value.

Patterns can be regular JavaScript values (`"some string"`, `10`, `true`, ...), data structures ([objects](#objects), [arrays](#tuples-arrays), ...), wildcards ([`P._`](#p_-wildcard), [`P.string`](#pstring-wildcard), [`P.number`](#pnumber-wildcard), ...), or special matcher functions ([`P.not`](#pnot-patterns),
[`P.when`](#pwhen-patterns), [`P.select`](#pselect-patterns), ...).

All wildcards and matcher functions can be imported either as `Pattern` or as `P` from the `ts-pattern` module.

```ts
import { match, Pattern } from 'ts-pattern';

const toString = (value: unknown): string =>
  match(value)
    .with(Pattern.string, (str) => str)
    .with(Pattern.number, (num) => num.toFixed(2))
    .with(Pattern.boolean, (bool) => `${bool}`)
    .otherwise(() => 'Unknown');
```

Or

```ts
import { match, P } from 'ts-pattern';

const toString = (value: unknown): string =>
  match(value)
    .with(P.string, (str) => str)
    .with(P.number, (num) => num.toFixed(2))
    .with(P.boolean, (bool) => `${bool}`)
    .otherwise(() => 'Unknown');
```

If your input isn't typed, (if it's a `any` or a `unknown`), you are free to use any possible pattern. Your handler will infer the input type from the shape of your pattern.

### Literals

Literals are primitive JavaScript values, like `numbers`, `strings`, `booleans`, `bigints`, `symbols`, `null`, `undefined`, or `NaN`.

```ts
import { match } from 'ts-pattern';

const input: unknown = 2;

const output = match(input)
  .with(2, () => 'number: two')
  .with(true, () => 'boolean: true')
  .with('hello', () => 'string: hello')
  .with(undefined, () => 'undefined')
  .with(null, () => 'null')
  .with(NaN, () => 'number: NaN')
  .with(20n, () => 'bigint: 20n')
  .otherwise(() => 'something else');

console.log(output);
// => 'number: two'
```

### Objects

Patterns can be objects containing sub-patterns. An object pattern will match
If and only if the input value **is an object**, contains **all properties** the pattern defines
and each property **matches** the corresponding sub-pattern.

```ts
import { match } from 'ts-pattern';

type Input =
  | { type: 'user'; name: string }
  | { type: 'image'; src: string }
  | { type: 'video'; seconds: number };

let input: Input = { type: 'user', name: 'Gabriel' };

const output = match(input)
  .with({ type: 'image' }, () => 'image')
  .with({ type: 'video', seconds: 10 }, () => 'video of 10 seconds.')
  .with({ type: 'user' }, ({ name }) => `user of name: ${name}`)
  .otherwise(() => 'something else');

console.log(output);
// => 'user of name: Gabriel'
```

### Tuples (arrays)

In TypeScript, [Tuples](https://en.wikipedia.org/wiki/Tuple) are arrays with a fixed
number of elements that can be of different types. You can pattern-match on tuples
using a tuple pattern. A tuple pattern will match if the input value **is an array of the same length**,
and each item matches the corresponding sub-pattern.

```ts
import { match, P } from 'ts-pattern';

type Input =
  | [number, '+', number]
  | [number, '-', number]
  | [number, '*', number]
  | ['-', number];

const input = [3, '*', 4] as Input;

const output = match(input)
  .with([P._, '+', P._], ([x, , y]) => x + y)
  .with([P._, '-', P._], ([x, , y]) => x - y)
  .with([P._, '*', P._], ([x, , y]) => x * y)
  .with(['-', P._], ([, x]) => -x)
  .exhaustive();

console.log(output);
// => 12
```

### Wildcards

#### `P._` wildcard

The `P._` pattern will match any value. You can also use `P.any`, which is an alias to `P._`.

```ts
import { match, P } from 'ts-pattern';

const input = 'hello';

const output = match(input)
  .with(P._, () => 'It will always match')
  // OR
  .with(P.any, () => 'It will always match')
  .otherwise(() => 'This string will never be used');

console.log(output);
// => 'It will always match'
```

#### `P.string` wildcard

The `P.string` pattern will match any value of type `string`.

```ts
import { match, P } from 'ts-pattern';

const input = 'hello';

const output = match(input)
  .with('bonjour', () => 'Won‘t match')
  .with(P.string, () => 'it is a string!')
  .exhaustive();

console.log(output);
// => 'it is a string!'
```

#### `P.number` wildcard

The `P.number` pattern will match any value of type `number`.

```ts
import { match, P } from 'ts-pattern';

const input = 2;

const output = match<number | string>(input)
  .with(P.string, () => 'it is a string!')
  .with(P.number, () => 'it is a number!')
  .exhaustive();

console.log(output);
// => 'it is a number!'
```

#### `P.boolean` wildcard

The `P.boolean` pattern will match any value of type `boolean`.

```ts
import { match, P } from 'ts-pattern';

const input = true;

const output = match<number | string | boolean>(input)
  .with(P.string, () => 'it is a string!')
  .with(P.number, () => 'it is a number!')
  .with(P.boolean, () => 'it is a boolean!')
  .exhaustive();

console.log(output);
// => 'it is a boolean!'
```

#### `P.nullish` wildcard

The `P.nullish` pattern will match any value of type `null` or `undefined`.

Even though `null` and `undefined` can be used as literal patterns, sometimes they appear in a union together
(e.g. `null | undefined | string`) and you may want to treat them as equivalent using `P.nullish`.

```ts
import { match, P } from 'ts-pattern';

const input = null;

const output = match<number | null | undefined>(input)
  .with(P.number, () => 'it is a number!')
  .with(P.nullish, () => 'it is either null or undefined!')
  .exhaustive();

console.log(output);
// => 'it is either null or undefined!'
```

#### `P.nonNullable` wildcard

The `P.nonNullable` pattern will match any value except `null` or `undefined`.

```ts
import { match, P } from 'ts-pattern';

const input = null;

const output = match<number | null | undefined>(input)
  .with(P.nonNullable, () => 'it is a number!')
  .otherwise(() => 'it is either null or undefined!');

console.log(output);
// => 'it is either null or undefined!'
```

#### `P.bigint` wildcard

The `P.bigint` pattern will match any value of type `bigint`.

```ts
import { match, P } from 'ts-pattern';

const input = 20000000n;

const output = match<bigint | null>(input)
  .with(P.bigint, () => 'it is a bigint!')
  .otherwise(() => '?');

console.log(output);
// => 'it is a bigint!'
```

#### `P.symbol` wildcard

The `P.symbol` pattern will match any value of type `symbol`.

```ts
import { match, P } from 'ts-pattern';

const input = Symbol('some symbol');

const output = match<symbol | null>(input)
  .with(P.symbol, () => 'it is a symbol!')
  .otherwise(() => '?');

console.log(output);
// => 'it is a symbol!'
```

### `P.array` patterns

To match on arrays of unknown size, you can use `P.array(subpattern)`.
It takes a sub-pattern, and will match if **all elements** in the input
array match this sub-pattern.

```ts
import { match, P } from 'ts-pattern';

type Input = { title: string; content: string }[];

let input: Input = [
  { title: 'Hello world!', content: 'This is a very interesting content' },
  { title: 'Bonjour!', content: 'This is a very interesting content too' },
];

const output = match(input)
  .with(
    P.array({ title: P.string, content: P.string }),
    (posts) => 'a list of posts!'
  )
  .otherwise(() => 'something else');

console.log(output);
// => 'a list of posts!'
```

### Matching variadic tuples with `P.array`

In TypeScript, [Variadic Tuple Types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#variadic-tuple-types) are array types created with the `...` spread operator, like `[string, ...string[]]`, `[number, ...boolean[], string]` etc. You can match against variadic tuple types using array literals containing `...P.array(subpattern)`:

```ts
import { match, P } from 'ts-pattern';

type Input = (number | string)[];

declare const input: Input;

const output = match(input)
  // P.array's parameter is optional
  .with([P.string, ...P.array()], (input) => input) // input: [string, ...(number | string)[]]
  .with(['print', ...P.array(P.string)], (input) => input) // input: ['print', ...string[]]
  // you can put patterns on either side of `...P.array()`:
  .with([...P.array(P.string), 'end'], (input) => input) // input: [...string[], 'end']
  .with(['start', ...P.array(P.string), 'end'], (input) => input) // input: ['start', ...string[], 'end']
  .otherwise((input) => input);
```

### `P.set` patterns

To match a Set, you can use `P.set(subpattern)`.
It takes a sub-pattern, and will match if **all elements** inside the set
match this sub-pattern.

```ts
import { match, P } from 'ts-pattern';

type Input = Set<string | number>;

const input: Input = new Set([1, 2, 3]);

const output = match(input)
  .with(P.set(1), (set) => `Set contains only 1`)
  .with(P.set(P.string), (set) => `Set contains only strings`)
  .with(P.set(P.number), (set) => `Set contains only numbers`)
  .otherwise(() => '');

console.log(output);
// => "Set contains only numbers"
```

### `P.map` patterns

To match a Map, you can use `P.map(keyPattern, valuePattern)`.
It takes a subpattern to match against the key, a subpattern to match agains the value, and will match if **all elements** inside this map
match these two sub-patterns.

```ts
import { match, P } from 'ts-pattern';

type Input = Map<string, string | number>;

const input: Input = new Map([
  ['a', 1],
  ['b', 2],
  ['c', 3],
]);

const output = match(input)
  .with(P.map(P.string, P.number), (map) => `map's type is Map<string, number>`)
  .with(P.map(P.string, P.string), (map) => `map's type is Map<string, string>`)
  .with(
    P.map(P.union('a', 'c'), P.number),
    (map) => `map's type is Map<'a' | 'c', number>`
  )
  .otherwise(() => '');

console.log(output);
// => "map's type is Map<string, number>"
```

### `P.when` patterns

`P.when` lets you define your own logic to check if the pattern should match or not.
If the `predicate` function given to when returns a truthy value, then the pattern
will match for this input.

Note that you can narrow down the type of your input by providing a
[Type Guard function](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards) to `P.when`.

```ts
import { match, P } from 'ts-pattern';

type Input = { score: number };

const output = match<Input>({ score: 10 })
  .with(
    {
      score: P.when((score): score is 5 => score === 5),
    },
    (input) => '😐' // input is inferred as { score: 5 }
  )
  .with({ score: P.when((score) => score < 5) }, () => '😞')
  .otherwise(() => '🙂');

console.log(output);
// => '🙂'
```

### `P.not` patterns

`P.not` lets you match on everything **but** a specific value.
it's a function taking a pattern and returning the opposite pattern.

```ts
import { match, P } from 'ts-pattern';

type Input = boolean | number;

const toNumber = (input: Input) =>
  match(input)
    .with(P.not(P.boolean), (n) => n) // n: number
    .with(true, () => 1)
    .with(false, () => 0)
    .exhaustive();

console.log(toNumber(2));
// => 2
console.log(toNumber(true));
// => 1
```

### `P.select` patterns

`P.select` lets you pick a piece of your input data-structure
and injects it in your handler function.

It's especially useful when pattern matching on deep data structure to
avoid the hassle of destructuring it in the handler function.

Selections can be either named (with `P.select('someName')`) or anonymous (with `P.select()`).

You can have only one anonymous selection by pattern, and the selected value will be directly inject in your handler as first argument:

```ts
import { match, P } from 'ts-pattern';

type Input =
  | { type: 'post'; user: { name: string } }
  | { ... };

const input: Input = { type: 'post', user: { name: 'Gabriel' } }

const output = match(input)
    .with(
      { type: 'post', user: { name: P.select() } },
      username => username // username: string
    )
    .otherwise(() => 'anonymous');

console.log(output);
// => 'Gabriel'
```

If you need to select several things inside your input data structure, you can name your selections by giving a string to `P.select(<name>)`. Each selection will be passed as first argument to your handler in an object.

```ts
import { match, P } from 'ts-pattern';

type Input =
  | { type: 'post'; user: { name: string }, content: string }
  | { ... };

const input: Input = { type: 'post', user: { name: 'Gabriel' }, content: 'Hello!' }

const output = match(input)
    .with(
      { type: 'post', user: { name: P.select('name') }, content: P.select('body') },
      ({ name, body }) => `${name} wrote "${body}"`
    )
    .otherwise(() => '');

console.log(output);
// => 'Gabriel wrote "Hello!"'
```

You can also pass a sub-pattern to `P.select` if you want it to only
select values which match this sub-pattern:

```ts
type User = { age: number; name: string };
type Post = { body: string };
type Input = { author: User; content: Post };

declare const input: Input;

const output = match(input)
  .with(
    {
      author: P.select({ age: P.number.gt(18) }),
    },
    (author) => author // author: User
  )
  .with(
    {
      author: P.select('author', { age: P.number.gt(18) }),
      content: P.select(),
    },
    ({ author, content }) => author // author: User, content: Post
  )
  .otherwise(() => 'anonymous');
```

### `P.optional` patterns

`P.optional(subpattern)` lets you annotate a key in an object pattern as being optional,
but if it is defined it should match a given sub-pattern.

```ts
import { match, P } from 'ts-pattern';

type Input = { key?: string | number };

const output = match(input)
  .with({ key: P.optional(P.string) }, (a) => {
    return a.key; // string | undefined
  })
  .with({ key: P.optional(P.number) }, (a) => {
    return a.key; // number | undefined
  })
  .exhaustive();
```

### `P.instanceOf` patterns

The `P.instanceOf` function lets you build a pattern to check if
a value is an instance of a class:

```ts
import { match, P } from 'ts-pattern';

class A {
  a = 'a';
}
class B {
  b = 'b';
}

type Input = { value: A | B };

const input: Input = { value: new A() };

const output = match(input)
  .with({ value: P.instanceOf(A) }, (a) => {
    return 'instance of A!';
  })
  .with({ value: P.instanceOf(B) }, (b) => {
    return 'instance of B!';
  })
  .exhaustive();

console.log(output);
// => 'instance of A!'
```

### `P.union` patterns

`P.union(...subpatterns)` lets you test several patterns and will match if
one of these patterns do. It's particularly handy when you want to handle
some cases of a union type in the same code branch:

```ts
import { match, P } from 'ts-pattern';

type Input =
  | { type: 'user'; name: string }
  | { type: 'org'; name: string }
  | { type: 'text'; content: string }
  | { type: 'img'; src: string };

declare const input: Input;

const output = match(input)
  .with({ type: P.union('user', 'org') }, (userOrOrg) => {
    // userOrOrg: User | Org
    return userOrOrg.name;
  })
  .otherwise(() => '');
```

### `P.intersection` patterns

`P.intersection(...subpatterns)` lets you ensure that the input matches
**all** sub-patterns passed as parameters.

```ts
class A {
  constructor(public foo: 'bar' | 'baz') {}
}

class B {
  constructor(public str: string) {}
}

type Input = { prop: A | B };

declare const input: Input;

const output = match(input)
  .with(
    { prop: P.intersection(P.instanceOf(A), { foo: 'bar' }) },
    ({ prop }) => prop.foo // prop: A & { foo: 'bar' }
  )
  .with(
    { prop: P.intersection(P.instanceOf(A), { foo: 'baz' }) },
    ({ prop }) => prop.foo // prop: A & { foo: 'baz' }
  )
  .otherwise(() => '');
```

## `P.string` predicates

`P.string` has a number of methods to help you match on specific strings.

### `P.string.startsWith`

`P.string.startsWith(str)` matches strings that start with the provided string.

```ts
const fn = (input: string) =>
  match(input)
    .with(P.string.startsWith('TS'), () => '🎉')
    .otherwise(() => '❌');

console.log(fn('TS-Pattern')); // logs '🎉'
```

### `P.string.endsWith`

`P.string.endsWith(str)` matches strings that end with the provided string.

```ts
const fn = (input: string) =>
  match(input)
    .with(P.string.endsWith('!'), () => '🎉')
    .otherwise(() => '❌');

console.log(fn('Hola!')); // logs '🎉'
```

### `P.string.minLength`

`P.string.minLength(min)` matches strings with at least `min` characters.

```ts
const fn = (input: string) =>
  match(input)
    .with(P.string.minLength(2), () => '🎉')
    .otherwise(() => '❌');

console.log(fn('two')); // logs '🎉'
```

### `P.string.length`

`P.string.length(len)` matches strings with exactly `len` characters.

```ts
const fn = (input: string) =>
  match(input)
    .with(P.string.length(2), () => '🎉')
    .otherwise(() => '❌');

console.log(fn('ok')); // logs '🎉'
```

### `P.string.maxLength`

`P.string.maxLength(max)` matches strings with at most `max` characters.

```ts
const fn = (input: string) =>
  match(input)
    .with(P.string.maxLength(5), () => '🎉')
    .otherwise(() => 'too long');

console.log(fn('is this too long?')); // logs 'too long'
```

### `P.string.includes`

`P.string.includes(str)` matches strings that contain the provided substring.

```ts
const fn = (input: string) =>
  match(input)
    .with(P.string.includes('!'), () => '✅')
    .otherwise(() => '❌');

console.log(fn('Good job! 🎉')); // logs '✅'
```

### `P.string.regex`

`P.string.regex(RegExp)` matches strings if they match the provided regular expression.

```ts
const fn = (input: string) =>
  match(input)
    .with(P.string.regex(/^[a-z]+$/), () => 'single word')
    .otherwise(() => 'other strings');

console.log(fn('gabriel')); // logs 'single word'
```

## `P.number` and `P.bigint` predicates

`P.number` and `P.bigint` have several of methods to help you match on specific numbers and bigints.

### `P.number.between`

`P.number.between(min, max)` matches numbers between `min` and `max`.

```ts
const fn = (input: number) =>
  match(input)
    .with(P.number.between(1, 5), () => '✅')
    .otherwise(() => '❌');

console.log(fn(3), fn(1), fn(5), fn(7)); // logs '✅ ✅ ✅ ❌'
```

### `P.number.lt`

`P.number.lt(max)` matches numbers smaller than `max`.

```ts
const fn = (input: number) =>
  match(input)
    .with(P.number.lt(7), () => '✅')
    .otherwise(() => '❌');

console.log(fn(2), fn(7)); // logs '✅ ❌'
```

### `P.number.gt`

`P.number.gt(min)` matches numbers greater than `min`.

```ts
const fn = (input: number) =>
  match(input)
    .with(P.number.gt(7), () => '✅')
    .otherwise(() => '❌');

console.log(fn(12), fn(7)); // logs '✅ ❌'
```

### `P.number.lte`

`P.number.lte(max)` matches numbers smaller than or equal to `max`.

```ts
const fn = (input: number) =>
  match(input)
    .with(P.number.lte(7), () => '✅')
    .otherwise(() => '❌');

console.log(fn(7), fn(12)); // logs '✅ ❌'
```

### `P.number.gte`

`P.number.gte(min)` matches numbers greater than or equal to `min`.

```ts
const fn = (input: number) =>
  match(input)
    .with(P.number.gte(7), () => '✅')
    .otherwise(() => '❌');

console.log(fn(7), fn(2)); // logs '✅ ❌'
```

### `P.number.int`

`P.number.int()` matches integers.

```ts
const fn = (input: number) =>
  match(input)
    .with(P.number.int(), () => '✅')
    .otherwise(() => '❌');

console.log(fn(12), fn(-3.141592)); // logs '✅ ❌'
```

### `P.number.finite`

`P.number.finite()` matches all numbers except `Infinity` and `-Infinity`.

```ts
const fn = (input: number) =>
  match(input)
    .with(P.number.finite(), () => '✅')
    .otherwise(() => '❌');

console.log(fn(-3.141592), fn(Infinity)); // logs '✅ ❌'
```

### `P.number.positive`

`P.number.positive()` matches positive numbers.

```ts
const fn = (input: number) =>
  match(input)
    .with(P.number.positive(), () => '✅')
    .otherwise(() => '❌');

console.log(fn(7), fn(-3.141592)); // logs '✅ ❌'
```

### `P.number.negative`

`P.number.negative()` matches negative numbers.

```ts
const fn = (input: number) =>
  match(input)
    .with(P.number.negative(), () => '✅')
    .otherwise(() => '❌');

console.log(fn(-3.141592), fn(7)); // logs '✅ ❌'
```

## Types

### `P.infer`

`P.infer<typeof somePattern>` lets you infer a type of value from a type of pattern.

It's particularly useful when validating an API response.

```ts
const postPattern = {
  title: P.string,
  content: P.string,
  stars: P.number.between(1, 5).optional(),
  author: {
    firstName: P.string,
    lastName: P.string.optional(),
    followerCount: P.number,
  },
} as const;

type Post = P.infer<typeof postPattern>;

// posts: Post[]
const posts = await fetch(someUrl)
  .then((res) => res.json())
  .then((res: unknown): Post[] =>
    isMatching({ data: P.array(postPattern) }, res) ? res.data : []
  );
```

Although not strictly necessary, using `as const` after the pattern definition ensures that TS-Pattern infers the most precise types possible.

### `P.narrow`

`P.narrow<Input, typeof Pattern>` will narrow the input type to only keep the set of values that are compatible with the provided pattern type.

```ts
type Input = ['a' | 'b' | 'c', 'a' | 'b' | 'c'];
const Pattern = ['a', P.union('a', 'b')] as const;

type Narrowed = P.narrow<Input, typeof Pattern>;
//     ^? ['a', 'a' | 'b']
```

Note that most of the time, the `match` and `isMatching` functions perform narrowing for you, and you do not need to narrow types yourself.

### `P.Pattern`

`P.Pattern<T>` is the type of all possible pattern for a generic type `T`.

```ts
type User = { name: string; age: number };

const userPattern: Pattern<User> = {
  name: 'Alice',
};
```

### Type inference

TS-Pattern takes advantage the most advanced features of TypeScript to perform type narrowing and accurate exhaustive matching, even when matching on complex data-structures.

Here are some examples of TS-Pattern's type inference features.

#### Type narrowing

When pattern-matching on a input containing union types, TS-Pattern will infer the most precise type possible for the argument of your handler function using the pattern you provide.

```ts
type Text = { type: 'text'; data: string };
type Img = { type: 'img'; data: { src: string; alt: string } };
type Video = { type: 'video'; data: { src: string; format: 'mp4' | 'webm' } };
type Content = Text | Img | Video;

const formatContent = (content: Content): string =>
  match(content)
    .with({ type: 'text' }, (text /* : Text */) => '<p>...</p>')
    .with({ type: 'img' }, (img /* : Img */) => '<img ... />')
    .with({ type: 'video' }, (video /* : Video */) => '<video ... />')
    .with(
      { type: 'img' },
      { type: 'video' },
      (video /* : Img | Video */) => 'img or video'
    )
    .with(
      { type: P.union('img', 'video') },
      (video /* : Img | Video */) => 'img or video'
    )
    .exhaustive();
```

When using `P.select` in a pattern, TS-Pattern will find and inject the selected value in your handler. The type of your handler's argument is inferred accordingly.

```ts
const formatContent = (content: Content): string =>
  match(content)
    .with(
      { type: 'text', data: P.select() },
      (content /* : string */) => '<p>...</p>'
    )
    .with(
      { type: 'video', data: { format: P.select() } },
      (format /* : 'mp4' | 'webm' */) => '<video ... />'
    )
    .with(
      { type: P.union('img', 'video'), data: P.select() },
      (data /* : Img['data'] | Video['data'] */) => 'img or video'
    )
    .exhaustive();
```

#### Type guard function

If you pass a [type guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates) function to `P.when`, TS-Pattern will use its return type to narrow the input.

```ts
const isString = (x: unknown): x is string => typeof x === 'string';

const isNumber = (x: unknown): x is number => typeof x === 'number';

const fn = (input: { id: number | string }) =>
  match(input)
    .with({ id: P.when(isString) }, (narrowed /* : { id: string } */) => 'yes')
    .with({ id: P.when(isNumber) }, (narrowed /* : { id: number } */) => 'yes')
    .exhaustive();
```

#### Exhaustiveness checking

TS-Pattern will keep track of handled and unhandled cases of your input type. Even when pattern-matching on several union types at once, you only need to call `.exhaustive()` to make sure that all possible cases are correctly handled.

```ts
type Permission = 'editor' | 'viewer';
type Plan = 'basic' | 'pro';

const fn = (org: Plan, user: Permission): string =>
  match([org, user])
    .with(['basic', 'viewer'], () => {})
    .with(['basic', 'editor'], () => {})
    .with(['pro', 'viewer'], () => {})
    // Fails with `NonExhaustiveError<['pro', 'editor']>`
    // because the `['pro', 'editor']` case isn't handled.
    .exhaustive();
```

## Inspirations

This library has been heavily inspired by this great article by Wim Jongeneel:
[Pattern Matching in TypeScript with Record and Wildcard Patterns](https://medium.com/swlh/pattern-matching-in-typescript-with-record-and-wildcard-patterns-6097dd4e471d).
It made me realize pattern matching could be implemented in userland and we didn't have
to wait for it to be added to the language itself. I'm really grateful for that 🙏
