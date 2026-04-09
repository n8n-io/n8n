# package-manager-detector

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Package manager detector is based on lock files and the `packageManager` field in the current project's `package.json` file.

It will detect your `yarn.lock` / `pnpm-lock.yaml` / `package-lock.json` / `bun.lock` / `bun.lockb` / `deno.lock` to know the current package manager and use the `packageManager` field in your `package.json` if present.

## Install

```sh
# pnpm
pnpm add package-manager-detector

# npm
npm i package-manager-detector

# yarn
yarn add package-manager-detector
```

## Usage

### ESM

To check the file system for which package manager is used:

```js
import { detect } from 'package-manager-detector/detect'
```

or sync version:

```js
import { detectSync } from 'package-manager-detector/detect'
```

or to get the currently running package manager:

```js
import { getUserAgent } from 'package-manager-detector/detect'
```

### CommonJS

To check the file system for which package manager is used:

```js
const { detect } = require('package-manager-detector/detect')
```

or sync version:

```js
const { detectSync } = require('package-manager-detector/detect')
```

or to get the currently running package manager:

```js
const { getUserAgent } = require('package-manager-detector/detect')
```

## Agents and Commands

This package includes package manager agents and their corresponding commands for:

- `'agent'` - run the package manager with no arguments
- `'install'` - install dependencies
- `'frozen'` - install dependencies using frozen lockfile
- `'add'` - add dependencies
- `'uninstall'` - remove dependencies
- `'global'` - install global packages
- `'global_uninstall'` - remove global packages
- `'upgrade'` - upgrade dependencies
- `'upgrade-interactive'` - upgrade dependencies interactively: not available for `npm` and `bun`
- `'execute'` - download & execute binary scripts
- `'execute-local'` - execute binary scripts (from package locally installed)
- `'run'` - run `package.json` scripts

### Using Agents and Commands

A `resolveCommand` function is provided to resolve the command for a specific agent.

```ts
import { resolveCommand } from 'package-manager-detector/commands'
import { detect } from 'package-manager-detector/detect'

const pm = await detect()
if (!pm)
  throw new Error('Could not detect package manager')

const { command, args } = resolveCommand(pm.agent, 'add', ['@antfu/ni']) // { command: 'pnpm', args: ['add', '@antfu/ni'] }
console.log(`Detected the ${pm.agent} package manager. You can run a install with ${command} ${args.join(' ')}`)
```

You can check the source code or the [JSDocs](https://www.jsdocs.io/package/package-manager-detector) for more information.

## License

[MIT](./LICENSE) License © 2020-PRESENT [Anthony Fu](https://github.com/antfu)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/package-manager-detector?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/package-manager-detector
[npm-downloads-src]: https://img.shields.io/npm/dm/package-manager-detector?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/package-manager-detector
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=18181B&colorB=F0DB4F
[jsdocs-href]: https://www.jsdocs.io/package/package-manager-detector
[license-src]: https://img.shields.io/github/license/antfu-collective/package-manager-detector.svg?style=flat&colorA=18181B&colorB=F0DB4F
[license-href]: https://github.com/antfu-collective/package-manager-detector/blob/main/LICENSE
