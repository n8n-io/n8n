# `create-require`

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

Polyfill for Node.js [`module.createRequire`](https://nodejs.org/api/modules.html#modules_module_createrequire_filename) (<= v12.2.0)

## Install

```sh
yarn add create-require

npm install create-require
```

## Usage

```ts
function createRequire (filename: string | URL): NodeRequire;
```

```js
const createRequire = require('create-require')

const myRequire = createRequire('path/to/test.js')
const myModule = myRequire('./test-sibling-module')
```

## License

[MIT](./LICENSE)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/create-require?style=flat-square
[npm-version-href]: https://npmjs.com/package/create-require

[npm-downloads-src]: https://img.shields.io/npm/dm/create-require?style=flat-square
[npm-downloads-href]: https://npmjs.com/package/create-require

[github-actions-src]: https://img.shields.io/github/workflow/status/nuxt-contrib/create-require/test/master?style=flat-square
[github-actions-href]: https://github.com/nuxt-contrib/create-require/actions?query=workflow%3Atest

[codecov-src]: https://img.shields.io/codecov/c/gh/nuxt-contrib/create-require/master?style=flat-square
[codecov-href]: https://codecov.io/gh/nuxt-contrib/create-require
