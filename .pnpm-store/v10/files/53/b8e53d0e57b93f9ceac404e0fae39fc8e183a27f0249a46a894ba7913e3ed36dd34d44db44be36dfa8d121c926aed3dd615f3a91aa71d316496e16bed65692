# package-manager-detector

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Package manager detector is based on lock files, the `package.json` `packageManager` field, and installation metadata to detect the package manager used in a project.

It supports `npm`, `yarn`, `pnpm`, `deno`, and `bun`.

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

To check the file system for which package manager is used:

```js
import { detect } from 'package-manager-detector/detect'
```

or to get the currently running package manager:

```js
import { getUserAgent } from 'package-manager-detector/detect'
```

## Customize Detection Strategy

By default, the `detect` API searches through the current directory for lock files, and if none exists, it looks for the `packageManager` field in `package.json`. If that also doesn't exist, it will check the `devEngines.packageManager` field in `package.json`. If all strategies couldn't detect the package manager, it'll crawl upwards to the parent directory and repeat the detection process until it reaches the root directory.

The strategies can be configured through `detect`'s `strategies` option with the following accepted strategies:

- `'lockfile'`: Look up for lock files.
- `'packageManager-field'`: Look up for the `packageManager` field in package.json.
- `'devEngines-field'`: Look up for the `devEngines.packageManager` field in package.json.
- `'install-metadata'`: Look up for installation metadata added by package managers.

The order of the strategies can also be changed to prioritize one strategy over another. For example, if you prefer to detect the package manager used for installation:

```js
import { detect } from 'package-manager-detector/detect'

const pm = await detect({
  strategies: ['install-metadata', 'lockfile', 'packageManager-field', 'devEngines-field']
})
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
- `'upgrade-interactive'` - upgrade dependencies interactively: not available for `npm`
- `'dedupe'` - deduplicate dependencies with overlapping ranges: not available for `deno` and `bun`
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
