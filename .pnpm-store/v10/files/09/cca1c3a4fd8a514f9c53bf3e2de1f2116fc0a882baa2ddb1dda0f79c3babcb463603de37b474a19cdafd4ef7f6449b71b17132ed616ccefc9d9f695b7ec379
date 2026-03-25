# peberminta

![lint status badge](https://github.com/mxxii/peberminta/workflows/lint/badge.svg)
![test status badge](https://github.com/mxxii/peberminta/workflows/test/badge.svg)
[![codecov](https://codecov.io/gh/mxxii/peberminta/branch/main/graph/badge.svg?token=TYwVNcTQJd)](https://codecov.io/gh/mxxii/peberminta)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/mxxii/peberminta/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/peberminta?logo=npm)](https://www.npmjs.com/package/peberminta)
[![npm](https://img.shields.io/npm/dw/peberminta?color=informational&logo=npm)](https://www.npmjs.com/package/peberminta)
[![deno](https://img.shields.io/badge/deno.land%2Fx%2F-peberminta-informational?logo=deno)](https://deno.land/x/peberminta)

Simple, transparent parser combinators toolkit that supports tokens of any type.

For when you wanna do weird things with parsers.


## Features

- **Well typed** - written in TypeScript and with a lot of attention to keep types well defined.

- **Highly generic** - no constraints on tokens, options (additional state data) and output types. Core module has not a single mention of strings as a part of normal flow. Some string-specific building blocks can be loaded from a separate module in case you need them.

- **Transparent**. Built on a very simple base idea - just a few type aliases. Whole parser state is accessible at any time.

- **Lightweight**. Zero dependencies. Just type aliases and functions.

- **Batteries included** - comes with a pretty big set of building blocks.

- **Easy to extend** - just follow the convention defined by type aliases when making your own building blocks. *(And maybe let me know what you think can be universally useful to be included in the package itself.)*

- **Easy to make configurable parsers**. Rather than dynamically composing parsers based on options or manually weaving options into a dynamic parser state, this package offers a standard way to treat options as a part of static data and access them at any moment for course correction.

- **Well tested** - comes with tests for everything including examples.

- **Practicality over "purity"**. To be understandable and self-consistent is more important than to follow an established encoding of abstract ideas. More on this below.

- **No streaming** - accepts a fixed array of tokens. It is simple, whole input can be accessed at any time if needed. More on this below.

- **Bring your own lexer/tokenizer** - if you need it. It doesn't matter how tokens are made - this package can consume anything you can type. I have a lexer as well, called [leac](https://github.com/mxxii/leac), and it is used in some examples, but there is nothing special about it to make it the best match (well, maybe the fact it is written in TypeScript, has equal level of maintenance and is made with arrays instead of iterators in mind as well).


## Changelog

Available here: [CHANGELOG.md](https://github.com/mxxii/peberminta/blob/main/CHANGELOG.md)


## Install

### Node

```shell
> npm i peberminta
```

```ts
import * as p from 'peberminta';
import * as pc from 'peberminta/char';
```

### Deno

```ts
import * as p from 'https://deno.land/x/peberminta@.../core.ts';
import * as pc from 'https://deno.land/x/peberminta@.../char.ts';
```


## Examples

- [JSON](https://github.com/mxxii/peberminta/blob/main/examples/json.ts);
- [CSV](https://github.com/mxxii/peberminta/blob/main/examples/csv.ts);
- [Hex Color](https://github.com/mxxii/peberminta/blob/main/examples/hexColor.ts);
- [Calc](https://github.com/mxxii/peberminta/blob/main/examples/calc.ts);
- [Brainfuck](https://github.com/mxxii/peberminta/blob/main/examples/bf1.ts) (and [another implementation](https://github.com/mxxii/peberminta/blob/main/examples/bf2.ts));
- [Non-decreasing sequences](https://github.com/mxxii/peberminta/blob/main/examples/nonDec.ts);
- *feel free to PR or request interesting compact grammar examples.*

### Published packages using `peberminta`

- [aspargvs](https://github.com/mxxii/aspargvs) - arg parser, CLI wrapper
- [parseley](https://github.com/mxxii/parseley) - CSS selectors parser


## API

Detailed API documentation with navigation and search:

- [core module](https://mxxii.github.io/peberminta/modules/core.html);
- [char module](https://mxxii.github.io/peberminta/modules/char.html).

### Convention

Whole package is built around these type aliases:

```typescript
export type Data<TToken,TOptions> = {
  tokens: TToken[],
  options: TOptions
};

export type Parser<TToken,TOptions,TValue> =
  (data: Data<TToken,TOptions>, i: number) => Result<TValue>;

export type Matcher<TToken,TOptions,TValue> =
  (data: Data<TToken,TOptions>, i: number) => Match<TValue>;

export type Result<TValue> = Match<TValue> | NonMatch;

export type Match<TValue> = {
  matched: true,
  position: number,
  value: TValue
};

export type NonMatch = {
  matched: false
};
```

- **Data** object holds tokens array and possibly an options object - it's just a container for all static data used by a parser. Parser position, on the other hand, has it's own life cycle and passed around separately.

- A **Parser** is a function that accepts Data object and a parser position, looks into the tokens array at the given position and returns either a Match with a parsed value (use `null` if there is no value) and a new position or a NonMatch.

- A **Matcher** is a special case of Parser that never fails and always returns a Match.

- **Result** object from a Parser can be either a Match or a NonMatch.

- **Match** is a result of successful parsing - it contains a parsed value and a new parser position.

- **NonMatch** is a result of unsuccessful parsing. It doesn't have any data attached to it.

- **TToken** can be any type.

- **TOptions** can be any type. Use it to make your parser customizable. Or set it as `undefined` and type as `unknown` if not needed.

### Building blocks

#### Core blocks

<div class="headlessTable">

| <!-- --> | <!-- --> | <!-- --> | <!-- -->
| -------- | -------- | -------- | --------
| [ab](https://mxxii.github.io/peberminta/modules/core.html#ab) | [abc](https://mxxii.github.io/peberminta/modules/core.html#abc) | [action](https://mxxii.github.io/peberminta/modules/core.html#action) | [ahead](https://mxxii.github.io/peberminta/modules/core.html#ahead)
| [all](https://mxxii.github.io/peberminta/modules/core.html#all) | _[and](https://mxxii.github.io/peberminta/modules/core.html#and)_ | [any](https://mxxii.github.io/peberminta/modules/core.html#any) | [chain](https://mxxii.github.io/peberminta/modules/core.html#chain)
| [chainReduce](https://mxxii.github.io/peberminta/modules/core.html#chainReduce) | [choice](https://mxxii.github.io/peberminta/modules/core.html#choice) | [condition](https://mxxii.github.io/peberminta/modules/core.html#condition) | [decide](https://mxxii.github.io/peberminta/modules/core.html#decide)
| _[discard](https://mxxii.github.io/peberminta/modules/core.html#discard)_ | _[eitherOr](https://mxxii.github.io/peberminta/modules/core.html#eitherOr)_ | [emit](https://mxxii.github.io/peberminta/modules/core.html#emit) | [end](https://mxxii.github.io/peberminta/modules/core.html#end)
| _[eof](https://mxxii.github.io/peberminta/modules/core.html#eof)_ | [error](https://mxxii.github.io/peberminta/modules/core.html#error) | [fail](https://mxxii.github.io/peberminta/modules/core.html#fail) | [flatten](https://mxxii.github.io/peberminta/modules/core.html#flatten)
| [flatten1](https://mxxii.github.io/peberminta/modules/core.html#flatten1) | [left](https://mxxii.github.io/peberminta/modules/core.html#left) | [leftAssoc1](https://mxxii.github.io/peberminta/modules/core.html#leftAssoc1) | [leftAssoc2](https://mxxii.github.io/peberminta/modules/core.html#leftAssoc2)
| [longest](https://mxxii.github.io/peberminta/modules/core.html#longest) | _[lookAhead](https://mxxii.github.io/peberminta/modules/core.html#lookAhead)_ | [make](https://mxxii.github.io/peberminta/modules/core.html#make) | [many](https://mxxii.github.io/peberminta/modules/core.html#many)
| [many1](https://mxxii.github.io/peberminta/modules/core.html#many1) | [map](https://mxxii.github.io/peberminta/modules/core.html#map) | [map1](https://mxxii.github.io/peberminta/modules/core.html#map1) | [middle](https://mxxii.github.io/peberminta/modules/core.html#middle)
| [not](https://mxxii.github.io/peberminta/modules/core.html#not) | _[of](https://mxxii.github.io/peberminta/modules/core.html#of)_ | [option](https://mxxii.github.io/peberminta/modules/core.html#option) | _[or](https://mxxii.github.io/peberminta/modules/core.html#or)_
| [otherwise](https://mxxii.github.io/peberminta/modules/core.html#otherwise) | [peek](https://mxxii.github.io/peberminta/modules/core.html#peek) | [recursive](https://mxxii.github.io/peberminta/modules/core.html#recursive) | [reduceLeft](https://mxxii.github.io/peberminta/modules/core.html#reduceLeft)
| [reduceRight](https://mxxii.github.io/peberminta/modules/core.html#reduceRight) | [right](https://mxxii.github.io/peberminta/modules/core.html#right) | [rightAssoc1](https://mxxii.github.io/peberminta/modules/core.html#rightAssoc1) | [rightAssoc2](https://mxxii.github.io/peberminta/modules/core.html#rightAssoc2)
| [satisfy](https://mxxii.github.io/peberminta/modules/core.html#satisfy) | [sepBy](https://mxxii.github.io/peberminta/modules/core.html#sepBy) | [sepBy1](https://mxxii.github.io/peberminta/modules/core.html#sepBy1) | [skip](https://mxxii.github.io/peberminta/modules/core.html#skip)
| _[some](https://mxxii.github.io/peberminta/modules/core.html#some)_ | [start](https://mxxii.github.io/peberminta/modules/core.html#start) | [takeUntil](https://mxxii.github.io/peberminta/modules/core.html#takeUntil) | [takeUntilP](https://mxxii.github.io/peberminta/modules/core.html#takeUntilP)
| [takeWhile](https://mxxii.github.io/peberminta/modules/core.html#takeWhile) | [takeWhileP](https://mxxii.github.io/peberminta/modules/core.html#takeWhileP) | [token](https://mxxii.github.io/peberminta/modules/core.html#token)

</div>

#### Core utilities

<div class="headlessTable">

| <!-- --> | <!-- --> | <!-- --> | <!-- -->
| -------- | -------- | -------- | --------
| [match](https://mxxii.github.io/peberminta/modules/core.html#match) | [parse](https://mxxii.github.io/peberminta/modules/core.html#parse) | [parserPosition](https://mxxii.github.io/peberminta/modules/core.html#parserPosition) | [remainingTokensNumber](https://mxxii.github.io/peberminta/modules/core.html#remainingTokensNumber)
| [tryParse](https://mxxii.github.io/peberminta/modules/char.html#tryParse)

</div>

#### Char blocks

<div class="headlessTable">

| <!-- --> | <!-- --> | <!-- --> | <!-- -->
| -------- | -------- | -------- | --------
| _[anyOf](https://mxxii.github.io/peberminta/modules/char.html#anyOf)_ | [char](https://mxxii.github.io/peberminta/modules/char.html#char) | [charTest](https://mxxii.github.io/peberminta/modules/char.html#charTest) | [concat](https://mxxii.github.io/peberminta/modules/char.html#concat)
| [noneOf](https://mxxii.github.io/peberminta/modules/char.html#noneOf) | [oneOf](https://mxxii.github.io/peberminta/modules/char.html#oneOf) | [str](https://mxxii.github.io/peberminta/modules/char.html#str)

</div>

#### Char utilities

<div class="headlessTable">

| <!-- --> | <!-- --> | <!-- --> | <!-- -->
| -------- | -------- | -------- | --------
| [match](https://mxxii.github.io/peberminta/modules/char.html#match) | [parse](https://mxxii.github.io/peberminta/modules/char.html#parse) | [parserPosition](https://mxxii.github.io/peberminta/modules/char.html#parserPosition) | [tryParse](https://mxxii.github.io/peberminta/modules/char.html#tryParse)

</div>


## What about ...?

- performance - The code is very simple but I won't put any unverified assumptions here. I'd be grateful to anyone who can set up a good benchmark project to compare different parser combinators.

- stable release - Current release is well thought out and tested. I leave a chance that some supplied functions may need an incompatible change. Before version 1.0.0 this will be done without a deprecation cycle.

- streams/iterators - Maybe some day, if the need to parse a stream of non-string data arise. For now I don't have a task that would force me to think well on how to design it. It would require a significant trade off and may end up being a separate module (like `char`) at best or even a separate package.

- Fantasy Land - You can find some familiar ideas here, especially when compared to Static Land. But I'm not concerned about compatibility with that spec - see "Practicality over "purity"" entry above. What I think might make sense is to add separate tests for laws applicable in context of this package. Low priority though.


## Some other parser combinator packages

- [arcsecond](https://github.com/francisrstokes/arcsecond);
- [parsimmon](https://github.com/jneen/parsimmon);
- [chevrotain](https://github.com/Chevrotain/chevrotain);
- [prsc.js](https://github.com/bwrrp/prsc.js);
- [lop](https://github.com/mwilliamson/lop);
- [parser-lang](https://github.com/disnet/parser-lang);
- *and more, with varied level of maintenance.*
