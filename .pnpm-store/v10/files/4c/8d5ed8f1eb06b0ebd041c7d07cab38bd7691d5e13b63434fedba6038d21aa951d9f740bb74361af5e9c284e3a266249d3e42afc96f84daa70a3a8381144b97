# unrun

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Unit Test][unit-test-src]][unit-test-href]

unrun is a tool that enables running any module at runtime (TypeScript, ESM, CJS, JSX, etc.) by bundling it with [Rolldown](https://rolldown.rs/).

It is highly inspired by tools like :

- [jiti](https://github.com/unjs/jiti)
- [bundle-require](https://github.com/egoist/bundle-require)
- [tsx](https://tsx.is/)

## Install

```bash
npm i unrun
```

## Usage

### Programmatic API

- Async

```ts
import { unrun } from 'unrun'

const { module } = await unrun({
  path: './path/to/file.ts', // Path to the module to load
})
```

- Sync

```ts
import { unrunSync } from 'unrun'

const { module } = unrunSync({
  path: './path/to/file.ts', // Path to the module to load
})
```

### CLI

```bash
npx unrun ./path/to/file.ts
```

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/unrun.svg
[npm-version-href]: https://npmjs.com/package/unrun
[npm-downloads-src]: https://img.shields.io/npm/dm/unrun
[npm-downloads-href]: https://www.npmcharts.com/compare/unrun?interval=30
[unit-test-src]: https://github.com/gugustinette/unrun/actions/workflows/unit-test.yml/badge.svg
[unit-test-href]: https://github.com/gugustinette/unrun/actions/workflows/unit-test.yml
