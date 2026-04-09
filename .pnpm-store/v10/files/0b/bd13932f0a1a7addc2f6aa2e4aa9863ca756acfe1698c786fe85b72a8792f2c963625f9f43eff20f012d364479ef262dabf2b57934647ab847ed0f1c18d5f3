# stable-hash-x

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/un-ts/stable-hash-x/ci.yml?branch=main)](https://github.com/un-ts/stable-hash-x/actions/workflows/ci.yml?query=branch%3Amain)
[![Codecov](https://img.shields.io/codecov/c/github/un-ts/stable-hash-x.svg)](https://codecov.io/gh/un-ts/stable-hash-x)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fun-ts%2Fstable-hash-x%2Fmain%2Fpackage.json)](https://github.com/plantain-00/type-coverage)
[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/un-ts/stable-hash-x)](https://coderabbit.ai)
[![npm](https://img.shields.io/npm/v/stable-hash-x.svg)](https://www.npmjs.com/package/stable-hash-x)
[![GitHub Release](https://img.shields.io/github/release/un-ts/stable-hash-x)](https://github.com/un-ts/stable-hash-x/releases)

[![Conventional Commits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![changesets](https://img.shields.io/badge/maintained%20with-changesets-176de3.svg)](https://github.com/changesets/changesets)

A tiny and fast (600B <sup>[unpkg](https://unpkg.com/stable-hash-x@latest/lib/index.js)</sup>) lib for "stably hashing" a JavaScript value, works with cross-realm objects. Originally created for [SWR](https://github.com/vercel/swr) by [Shu Ding][] at [`stable-hash`](https://github.com/shuding/stable-hash), we forked it because the original one is a bit out of maintenance for a long time.

It's similar to `JSON.stringify(value)`, but:

1. Supports any JavaScript value (`BigInt`, `NaN`, `Symbol`, `function`, `class`, ...)
2. Sorts object keys (stable)
3. Supports circular objects

## TOC <!-- omit in toc -->

- [Use](#use)
- [Examples](#examples)
  - [Primitive Value](#primitive-value)
  - [Regex](#regex)
  - [Date](#date)
  - [Array](#array)
  - [Object](#object)
  - [`Function`, `Class`, `Set`, `Map`, `Buffer`...](#function-class-set-map-buffer)
  - [Cross-realm](#cross-realm)
- [Benchmark](#benchmark)
- [Notes](#notes)
- [Sponsors and Backers](#sponsors-and-backers)
  - [Sponsors](#sponsors)
  - [Backers](#backers)
- [Changelog](#changelog)
- [License](#license)

## Use

```bash
yarn add stable-hash-x
```

```js
import { hash } from 'stable-hash-x'

hash(anyJavaScriptValueHere) // returns a string

hash(anyJavaScriptValueHere, true) // if you're running in cross-realm environment, it's disabled by default for performance
```

## Examples

### Primitive Value

```js
hash(1)
hash('foo')
hash(true)
hash(undefined)
hash(null)
hash(NaN)
```

BigInt:

```js
hash(1) === hash(1n)
hash(1) !== hash(2n)
```

Symbol:

```js
hash(Symbol.for('foo')) === hash(Symbol.for('foo'))
hash(Symbol.for('foo')) === hash(Symbol('foo'))
hash(Symbol('foo')) === hash(Symbol('foo'))
hash(Symbol('foo')) !== hash(Symbol('bar'))
```

_Since `Symbol`s cannot be serialized, `stable-hash-x` simply uses its description as the hash._

### Regex

```js
hash(/foo/) === hash(/foo/)
hash(/foo/) !== hash(/bar/)
```

### Date

```js
hash(new Date(1)) === hash(new Date(1))
```

### Array

```js
hash([1, '2', [new Date(3)]]) === hash([1, '2', [new Date(3)]])
hash([1, 2]) !== hash([2, 1])
```

Circular:

```js
const foo = []
foo.push(foo)
hash(foo) === hash(foo)
```

### Object

```js
hash({ foo: 'bar' }) === hash({ foo: 'bar' })
hash({ foo: { bar: 1 } }) === hash({ foo: { bar: 1 } })
```

Stable:

```js
hash({ a: 1, b: 2, c: 3 }) === hash({ c: 3, b: 2, a: 1 })
```

Circular:

```js
const foo = {}
foo.foo = foo
hash(foo) === hash(foo)
```

### `Function`, `Class`, `Set`, `Map`, `Buffer`...

`stable-hash-x` guarantees reference consistency (`===`) for objects that the constructor isn't `Object`.

```js
const foo = () => {}
hash(foo) === hash(foo)
hash(foo) !== hash(() => {})
```

```js
class Foo {}
hash(Foo) === hash(Foo)
hash(Foo) !== hash(class {})
```

```js
const foo = new Set([1])
hash(foo) === hash(foo)
hash(foo) !== hash(new Set([1]))
```

### Cross-realm

```js
import { runInNewContext } from 'node:vm'

const obj1 = {
  a: 1,
  b: new Date('2022-06-25T01:55:27.743Z'),
  c: /test/,
  f: Symbol('test'),
}
const obj2 = runInNewContext(`({
  a: 1,
  b: new Date('2022-06-25T01:55:27.743Z'),
  c: /test/,
  f: Symbol('test'),
})`)

obj1 === obj2 // false
hash(obj1) === hash(obj2, true) // true
```

## Benchmark

```log
┌─────────┬────────────────────────────────┬──────────────────┬───────────────────┬────────────────────────┬────────────────────────┬─────────┐
│ (index) │ Task name                      │ Latency avg (ns) │ Latency med (ns)  │ Throughput avg (ops/s) │ Throughput med (ops/s) │ Samples │
├─────────┼────────────────────────────────┼──────────────────┼───────────────────┼────────────────────────┼────────────────────────┼─────────┤
│ 0       │ 'stable-hash-x'                │ '7877.4 ± 1.57%' │ '7042.0 ± 167.00' │ '138708 ± 0.05%'       │ '142005 ± 3449'        │ 126975  │
│ 1       │ 'hash-object'                  │ '17632 ± 0.73%'  │ '16708 ± 458.00'  │ '58820 ± 0.07%'        │ '59852 ± 1600'         │ 56716   │
│ 2       │ 'json-stringify-deterministic' │ '10901 ± 0.83%'  │ '10250 ± 250.00'  │ '95860 ± 0.05%'        │ '97561 ± 2439'         │ 91739   │
│ 3       │ 'stable-hash'                  │ '8318.5 ± 3.27%' │ '7042.0 ± 208.00' │ '138347 ± 0.06%'       │ '142005 ± 4074'        │ 120214  │
└─────────┴────────────────────────────────┴──────────────────┴───────────────────┴────────────────────────┴────────────────────────┴─────────┘
```

## Notes

This function does something similar to `JSON.stringify`, but more than it. It doesn't generate a secure checksum, which usually has a fixed length and is hard to be reversed. With `stable-hash-x` it's still possible to get the original data. Also, the output might include any charaters, not just alphabets and numbers like other hash algorithms. So:

- Use another encoding layer on top of it if you want to display the output.
- Use another crypto layer on top of it if you want to have a secure and fixed length hash.

```js
import crypto from 'node:crypto'

import { hash } from 'stable-hash-x'

const weakHash = hash(anyJavaScriptValueHere)
const encodedHash = Buffer.from(weakHash).toString('base64')
const safeHash = crypto.createHash('MD5').update(weakHash).digest('hex')
```

Also, the consistency of this lib is sometimes guaranteed by the singularity of the WeakMap instance. So it might not generate the consistent results when running in different runtimes, e.g. server/client or parent/worker scenarios.

## Sponsors and Backers

[![Sponsors](https://raw.githubusercontent.com/1stG/static/master/sponsors.svg)](https://github.com/sponsors/JounQin)

### Sponsors

| 1stG                                                                                                                   | RxTS                                                                                                                   | UnRS                                                                                                                   | UnTS                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [![1stG Open Collective sponsors](https://opencollective.com/1stG/organizations.svg)](https://opencollective.com/1stG) | [![RxTS Open Collective sponsors](https://opencollective.com/rxts/organizations.svg)](https://opencollective.com/rxts) | [![UnRS Open Collective sponsors](https://opencollective.com/unrs/organizations.svg)](https://opencollective.com/unrs) | [![UnTS Open Collective sponsors](https://opencollective.com/unts/organizations.svg)](https://opencollective.com/unts) |

### Backers

| 1stG                                                                                                                | RxTS                                                                                                                | UnRS                                                                                                                | UnTS                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [![1stG Open Collective backers](https://opencollective.com/1stG/individuals.svg)](https://opencollective.com/1stG) | [![RxTS Open Collective backers](https://opencollective.com/rxts/individuals.svg)](https://opencollective.com/rxts) | [![UnRS Open Collective backers](https://opencollective.com/unrs/individuals.svg)](https://opencollective.com/unrs) | [![UnTS Open Collective backers](https://opencollective.com/unts/individuals.svg)](https://opencollective.com/unts) |

## Changelog

Detailed changes for each release are documented in [CHANGELOG.md](./CHANGELOG.md).

## License

Originally created by [Shu Ding].

[MIT][] © [JounQin][]@[1stG.me][]

[1stG.me]: https://www.1stG.me
[MIT]: http://opensource.org/licenses/MIT
[JounQin]: https://github.com/JounQin
[Shu Ding]: https://github.com/shuding
