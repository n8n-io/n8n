# Change Case

> Transform a string between `camelCase`, `PascalCase`, `Capital Case`, `snake_case`, `kebab-case`, `CONSTANT_CASE` and others.

## Installation

```
npm install change-case --save
```

## Usage

```js
import * as changeCase from "change-case";

changeCase.camelCase("TEST_VALUE"); //=> "testValue"
```

Included case functions:

| Method            | Result      |
| ----------------- | ----------- |
| `camelCase`       | `twoWords`  |
| `capitalCase`     | `Two Words` |
| `constantCase`    | `TWO_WORDS` |
| `dotCase`         | `two.words` |
| `kebabCase`       | `two-words` |
| `noCase`          | `two words` |
| `pascalCase`      | `TwoWords`  |
| `pascalSnakeCase` | `Two_Words` |
| `pathCase`        | `two/words` |
| `sentenceCase`    | `Two words` |
| `snakeCase`       | `two_words` |
| `trainCase`       | `Two-Words` |

All methods accept an `options` object as the second argument:

- `delimiter?: string` The character to use between words. Default depends on method, e.g. `_` in snake case.
- `locale?: string[] | string | false` Lower/upper according to specified locale, defaults to host environment. Set to `false` to disable.
- `split?: (value: string) => string[]` A function to define how the input is split into words. Defaults to `split`.
- `prefixCharacters?: string` Retain at the beginning of the string. Defaults to `""`. Example: use `"_"` to keep the underscores in `__typename`.
- `suffixCharacters?: string` Retain at the end of the string. Defaults to `""`. Example: use `"_"` to keep the underscore in `type_`.

By default, `pascalCase` and `snakeCase` separate ambiguous characters with `_`. For example, `V1.2` would become `V1_2` instead of `V12`. If you prefer them merged you can set `mergeAmbiguousCharacters` to `true`.

### Split

**Change case** exports a `split` utility which can be used to build other case functions. It accepts a string and returns each "word" as an array. For example:

```js
split("fooBar")
  .map((x) => x.toLowerCase())
  .join("_"); //=> "foo_bar"
```

## Change Case Keys

```js
import * as changeKeys from "change-case/keys";

changeKeys.camelCase({ TEST_KEY: true }); //=> { testKey: true }
```

**Change case keys** wraps around the core methods to transform object keys to any case.

### API

- **input: any** Any JavaScript value.
- **depth: number** Specify the depth to transfer for case transformation. Defaults to `1`.
- **options: object** Same as base case library.

## TypeScript and ESM

This package is a [pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) and ships with TypeScript definitions. It cannot be `require`'d or used with CommonJS module resolution in TypeScript.

## License

MIT
