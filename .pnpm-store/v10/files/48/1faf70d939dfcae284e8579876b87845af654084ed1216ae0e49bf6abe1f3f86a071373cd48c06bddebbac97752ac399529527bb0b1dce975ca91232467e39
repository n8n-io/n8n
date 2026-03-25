# 🛣️ pathe

> Universal filesystem path utils

[![version][npm-v-src]][npm-v-href]
[![downloads][npm-d-src]][npm-d-href]
[![size][size-src]][size-href]

> **❓ Why**
>
> For [historical reasons](https://docs.microsoft.com/en-us/archive/blogs/larryosterman/why-is-the-dos-path-character), windows followed MS-DOS and using backslash for separating paths rather than slash used for macOS, Linux, and other Posix operating systems. Nowadays, [Windows](https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file?redirectedfrom=MSDN) supports both Slash and Backslash for paths. [Node.js's built in `path` module](https://nodejs.org/api/path.html) in the default operation of the path module varies based on the operating system on which a Node.js application is running. Specifically, when running on a Windows operating system, the path module will assume that Windows-style paths are being used. **This makes inconsistent code behavior between Windows and POSIX.**
> Compared to popular [upath](https://github.com/anodynos/upath), pathe is providing **identical exports** of Node.js with normalization on **all operations** and written in modern **ESM/Typescript** and has **no dependency on Node.js**!

This package is a drop-in replacement of the Node.js's [path module](https://nodejs.org/api/path.html) module and ensures paths are normalized with slash `/` and work in environments including Node.js.

## 💿 Usage

Install using npm or yarn:

```bash
# npm
npm i pathe

# yarn
yarn add pathe

# pnpm
pnpm i pathe
```

Import:

```js
// ESM / Typescript
import { resolve } from 'pathe'

// CommonJS
const { resolve } = require('pathe')
```

Read more about path utils from [Node.js documentation](https://nodejs.org/api/path.html) and rest assured behavior is ALWAYS like POSIX regardless of your input paths format and running platform!

### Extra utilties

Pathe exports some extra utilities that do not exist in standard Node.js [path module](https://nodejs.org/api/path.html).
In order to use them, you can import from `pathe/utils` subpath:

```js
import { filename, normalizeAliases, resolveAlias } from 'pathe/utils'
```

## License

MIT. Made with 💖

Some code used from Node.js project. See [LICENSE](./LICENSE).

<!-- Refs -->
[npm-v-src]: https://img.shields.io/npm/v/pathe?style=flat-square
[npm-v-href]: https://npmjs.com/package/pathe

[npm-d-src]: https://img.shields.io/npm/dm/pathe?style=flat-square
[npm-d-href]: https://npmjs.com/package/pathe

[github-actions-src]: https://img.shields.io/github/workflow/status/unjs/pathe/ci/main?style=flat-square
[github-actions-href]: https://github.com/unjs/pathe/actions?query=workflow%3Aci

[size-src]: https://packagephobia.now.sh/badge?p=pathe
[size-href]: https://packagephobia.now.sh/result?p=pathe
