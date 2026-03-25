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

A tiny and fast (460b <sup>[unpkg](https://unpkg.com/stable-hash-x@latest/lib/index.js)</sup>) lib for "stably hashing" a JavaScript value. Originally created for [SWR](https://github.com/vercel/swr) by [Shu Ding][] at [`stable-hash`](https://github.com/shuding/stable-hash), we forked it because the original one is a bit out of maintenance for a long time.

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

## Benchmark

```log
clk: ~2.91 GHz
cpu: Apple M1 Max
runtime: node 22.16.0 (arm64-darwin)

benchmark                   avg (min … max) p75 / p99    (min … top 1%)
------------------------------------------- -------------------------------
stable-hash-x                  7.87 µs/iter   7.38 µs   █
                      (6.67 µs … 749.13 µs)  11.42 µs  ▇█▃
                    (104.00  b … 859.30 kb)  10.89 kb ▁███▅▂▂▂▂▁▁▁▁▁▁▁▁▁▁▁▁
                  4.41 ipc (  1.81% stalls)  98.08% L1 data cache
         28.04k cycles 123.52k instructions  29.75% retired LD/ST ( 36.75k)

hash-object                   15.07 µs/iter  14.95 µs             █   █
                      (14.77 µs … 16.93 µs)  15.00 µs ▅  ▅      ▅▅█  ▅█▅  ▅
                    (659.78  b …   3.26 kb)   1.95 kb █▁▁█▁▁▁▁▁▁███▁▁███▁▁█
                  4.97 ipc (  1.22% stalls)  99.33% L1 data cache
         46.36k cycles 230.44k instructions  35.12% retired LD/ST ( 80.94k)

json-stringify-deterministic   8.37 µs/iter   8.41 µs        █
                        (8.29 µs … 8.50 µs)   8.44 µs     █  █
                    (  1.65 kb …   1.65 kb)   1.65 kb █▁████▁██▁█▁▁▁█▁█▁███
                  5.17 ipc (  1.28% stalls)  99.40% L1 data cache
         25.99k cycles 134.30k instructions  35.51% retired LD/ST ( 47.69k)

summary
  stable-hash-x
   1.06x faster than json-stringify-deterministic
   1.91x faster than hash-object
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
