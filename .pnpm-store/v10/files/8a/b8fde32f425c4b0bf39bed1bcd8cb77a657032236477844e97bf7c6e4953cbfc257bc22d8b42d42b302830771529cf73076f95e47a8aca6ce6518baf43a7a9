# eslint-plugin-import-x

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/un-ts/eslint-plugin-import-x/ci.yml?branch=master)](https://github.com/un-ts/eslint-plugin-import-x/actions/workflows/ci.yml?query=branch%3Amaster)
[![Codecov](https://img.shields.io/codecov/c/github/un-ts/eslint-plugin-import-x.svg)](https://codecov.io/gh/un-ts/eslint-plugin-import-x)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fun-ts%2Fsynckit%2Fmain%2Fpackage.json)](https://github.com/plantain-00/type-coverage)
[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/un-ts/eslint-plugin-import-x)](https://coderabbit.ai)
[![npm](https://img.shields.io/npm/v/eslint-plugin-import-x.svg)](https://www.npmjs.com/package/eslint-plugin-import-x)
[![GitHub Release](https://img.shields.io/github/release/un-ts/eslint-plugin-import-x)](https://github.com/un-ts/eslint-plugin-import-x/releases)

[![Conventional Commits](https://img.shields.io/badge/conventional%20commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

This plugin intends to support linting of ES2015+ (ES6+) import/export syntax, and prevent issues with misspelling of file paths and import names. All the goodness that the ES2015+ static module syntax intends to provide, marked up in your editor.

It started as a fork of [`eslint-plugin-import`] using [`get-tsconfig`] to replace [`tsconfig-paths`] and heavy [`typescript`] under the hood, making it faster, through less [heavy dependency on Typescript](https://github.com/import-js/eslint-plugin-import/blob/da5f6ec13160cb288338db0c2a00c34b2d932f0d/src/exportMap/typescript.js#L16), and cleaner dependencies altogether.

[`eslint-plugin-i` is now `eslint-plugin-import-x`](https://github.com/un-ts/eslint-plugin-import-x/issues/24#issuecomment-1991605123)

**IF YOU ARE USING THIS WITH SUBLIME**: see the [bottom section](#sublimelinter-eslint) for important info.

## TOC <!-- omit in toc -->

- [Why](#why)
- [Differences](#differences)
- [Installation](#installation)
- [Configuration (new: `eslint.config.*`)](#configuration-new-eslintconfig)
  - [JS example](#js-example)
  - [Typescript example](#typescript-example)
  - [As a standalone ESLint plugin](#as-a-standalone-eslint-plugin)
  - [Using `defineConfig`](#using-defineconfig)
- [Configuration (legacy: `.eslintrc*`)](#configuration-legacy-eslintrc)
  - [TypeScript](#typescript)
- [Rules](#rules)
  - [Helpful warnings](#helpful-warnings)
  - [Module systems](#module-systems)
  - [Static analysis](#static-analysis)
  - [Style guide](#style-guide)
- [Resolvers](#resolvers)
  - [`import-x/resolver-next`](#import-xresolver-next)
  - [`import-x/resolver`](#import-xresolver)
- [Settings](#settings)
  - [`import-x/extensions`](#import-xextensions)
  - [`import-x/ignore`](#import-xignore)
  - [`import-x/core-modules`](#import-xcore-modules)
  - [`import-x/external-module-folders`](#import-xexternal-module-folders)
  - [`import-x/parsers`](#import-xparsers)
  - [`import-x/resolver` and `import-x/resolver-next`](#import-xresolver-and-import-xresolver-next)
  - [`import-x/cache`](#import-xcache)
  - [`import-x/internal-regex`](#import-xinternal-regex)
- [SublimeLinter-eslint](#sublimelinter-eslint)
- [Sponsors and Backers](#sponsors-and-backers)
  - [Sponsors](#sponsors)
  - [Backers](#backers)
- [Changelog](#changelog)
- [License](#license)
- [Star History](#star-history)

## Why

Many issues cannot be fixed easily without API changes. For example, see:

- <https://github.com/import-js/eslint-plugin-import/issues/1479>
- <https://github.com/import-js/eslint-plugin-import/issues/2108>
- <https://github.com/import-js/eslint-plugin-import/issues/2111>

[`eslint-plugin-import`] refused to accept BREAKING CHANGES for these issues, so we had to fork it.

[`eslint-plugin-import`] now claims in <https://github.com/un-ts/eslint-plugin-import-x/issues/170> that it will accept BREAKING CHANGES. However, still nothing is happening: <https://github.com/import-js/eslint-plugin-import/pull/3091>.

[`eslint-plugin-import`] refuses to support the `exports` feature, and the maintainer even locked the feature request issue <https://github.com/import-js/eslint-plugin-import/issues/1810> to prevent future discussion. In the meantime, `eslint-plugin-import-x` now provides first-party support for the `exports` feature <https://github.com/un-ts/eslint-plugin-import-x/pull/209>, which will become the default in the next major version (v5).

We haven't resolved all the issues yet, but we are working on them, which could happen in the next major version (v5): <https://github.com/un-ts/eslint-plugin-import-x/issues/235>.

## Differences

So what are the differences from `eslint-plugin-import` exactly?

- we target [Node `^18.18.0 || ^20.9.0 || >=21.1.0`](https://github.com/un-ts/eslint-plugin-import-x/blob/8b2d6d3b612eb57fb68c3fddec25b02fc622df7c/package.json#L12) + [ESLint `^8.57.0 || ^9.0.0`](https://github.com/un-ts/eslint-plugin-import-x/blob/8b2d6d3b612eb57fb68c3fddec25b02fc622df7c/package.json#L71), while `eslint-plugin-import` targets [Node `>=4`](https://github.com/import-js/eslint-plugin-import/blob/da5f6ec13160cb288338db0c2a00c34b2d932f0d/package.json#L6) and [ESLint `^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9`](https://github.com/import-js/eslint-plugin-import/blob/da5f6ec13160cb288338db0c2a00c34b2d932f0d/package.json#L115C16-L115C64)
- we don't depend on old and outdated dependencies, so [we have 16 dependencies](https://npmgraph.js.org/?q=eslint-plugin-import-x) compared to [117 dependencies for `eslint-plugin-import`](https://npmgraph.js.org/?q=eslint-plugin-import)
- `eslint-plugin-import` uses `tsconfig-paths` + `typescript` itself to load `tsconfig`s while we use the single `get-tsconfig` instead, which is much faster and cleaner
- `eslint-plugin-import` uses [`resolve`] which doesn't support the `exports` field in `package.json` while we build our own rust-based resolver [`unrs-resolver`] instead, which is feature-rich and way more performant.
- Our [v3 resolver](./resolvers/README.md#v3) interface shares a single `resolver` instance by default which is used all across resolving chains so it would benefit from caching and memoization out-of-the-box
- ...

The list could be longer in the future, but we don't want to make it too long here. Hope you enjoy and let's get started.

## Installation

```sh
# inside your project's working tree
npm install eslint-plugin-import-x --save-dev
```

## Configuration (new: `eslint.config.*`)

From [`v8.21.0`](https://github.com/eslint/eslint/releases/tag/v8.21.0), ESLint announced a new config system.
In the new system, `.eslintrc*` is no longer used. `eslint.config.*` would be the default config file name.

### JS example

```js
import js from '@eslint/js'
import { importX } from 'eslint-plugin-import-x'

export default [js.configs.recommended, importX.flatConfigs.recommended]
```

### Typescript example

You have to install `eslint-import-resolver-typescript`:

```sh
npm install eslint-import-resolver-typescript --save-dev
```

```js
import js from '@eslint/js'
import { importX } from 'eslint-plugin-import-x'
import tsParser from '@typescript-eslint/parser'

export default [
  js.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'import-x/no-dynamic-require': 'warn',
      'import-x/no-nodejs-modules': 'warn',
    },
  },
]
```

> [!NOTE]
> A complete list of available configuration can be found in [config/flat folders](src/config/flat)

### As a standalone ESLint plugin

```js
import { importX } from 'eslint-plugin-import-x'

export default [
  {
    plugins: {
      'import-x': importX,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'import-x/no-dynamic-require': 'warn',
      'import-x/no-nodejs-modules': 'warn',
    },
  },
]
```

### Using `defineConfig`

```js
import { importX } from 'eslint-plugin-import-x'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    plugins: {
      'import-x': importX,
    },
    extends: ['import-x/flat/recommended'],
    rules: {
      'import-x/no-dynamic-require': 'warn',
    },
  },
])
```

## Configuration (legacy: `.eslintrc*`)

> [!TIP]
> If your eslint is `>=8.23.0`, you're 100% ready to use the new config system.
> See dedicated section above.

> [!NOTE]
> All rules are off by default. However, you may configure them manually
> in your `.eslintrc.(yml|json|js)`, or extend one of the canned configs:

```yaml
extends:
  - eslint:recommended
  - plugin:import-x/recommended
  # alternatively, 'recommended' is the combination of these two rule sets:
  - plugin:import-x/errors
  - plugin:import-x/warnings

# or configure manually:
plugins:
  - import-x

rules:
  import-x/no-unresolved: [2, { commonjs: true, amd: true }]
  import-x/named: 2
  import-x/namespace: 2
  import-x/default: 2
  import-x/export: 2
  # etc...
```

### TypeScript

You may use the following snippet or assemble your own config using the granular settings described below it.

> [!WARNING]
> Make sure you have installed [`@typescript-eslint/parser`] and [`eslint-import-resolver-typescript`] which are used in the following configuration.

```yaml
extends:
  - eslint:recommended
  - plugin:import-x/recommended
  # the following lines do the trick
  - plugin:import-x/typescript
settings:
  import-x/resolver:
    # You will also need to install and configure the TypeScript resolver
    # See also https://github.com/import-js/eslint-import-resolver-typescript#configuration
    typescript: true
```

## Rules

<!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
⚠️ Configurations set to warn in.\
🚫 Configurations disabled in.\
❗ Set in the `errors` configuration.\
❗ Set in the `flat/errors` configuration.\
☑️ Set in the `flat/recommended` configuration.\
⌨️ Set in the `flat/typescript` configuration.\
🚸 Set in the `flat/warnings` configuration.\
☑️ Set in the `recommended` configuration.\
⌨️ Set in the `typescript` configuration.\
🚸 Set in the `warnings` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).\
❌ Deprecated.

### Helpful warnings

| Name                                                                   | Description                                                                           | 💼          | ⚠️          | 🚫  | 🔧  | 💡  | ❌  |
| :--------------------------------------------------------------------- | :------------------------------------------------------------------------------------ | :---------- | :---------- | :-- | :-- | :-- | :-- |
| [export](docs/rules/export.md)                                         | Forbid any invalid exports, i.e. re-export of the same name.                          | ❗ ❗ ☑️ ☑️ |             |     |     |     |     |
| [no-deprecated](docs/rules/no-deprecated.md)                           | Forbid imported names marked with `@deprecated` documentation tag.                    |             |             |     |     |     |     |
| [no-empty-named-blocks](docs/rules/no-empty-named-blocks.md)           | Forbid empty named import blocks.                                                     |             |             |     | 🔧  | 💡  |     |
| [no-extraneous-dependencies](docs/rules/no-extraneous-dependencies.md) | Forbid the use of extraneous packages.                                                |             |             |     |     |     |     |
| [no-mutable-exports](docs/rules/no-mutable-exports.md)                 | Forbid the use of mutable exports with `var` or `let`.                                |             |             |     |     |     |     |
| [no-named-as-default](docs/rules/no-named-as-default.md)               | Forbid use of exported name as identifier of default export.                          |             | ☑️ 🚸 ☑️ 🚸 |     |     |     |     |
| [no-named-as-default-member](docs/rules/no-named-as-default-member.md) | Forbid use of exported name as property of default export.                            |             | ☑️ 🚸 ☑️ 🚸 |     |     |     |     |
| [no-rename-default](docs/rules/no-rename-default.md)                   | Forbid importing a default export by a different name.                                |             | 🚸 🚸       |     |     |     |     |
| [no-unused-modules](docs/rules/no-unused-modules.md)                   | Forbid modules without exports, or exports without matching import in another module. |             |             |     |     |     |     |

### Module systems

| Name                                                               | Description                                                          | 💼  | ⚠️  | 🚫  | 🔧  | 💡  | ❌  |
| :----------------------------------------------------------------- | :------------------------------------------------------------------- | :-- | :-- | :-- | :-- | :-- | :-- |
| [no-amd](docs/rules/no-amd.md)                                     | Forbid AMD `require` and `define` calls.                             |     |     |     |     |     |     |
| [no-commonjs](docs/rules/no-commonjs.md)                           | Forbid CommonJS `require` calls and `module.exports` or `exports.*`. |     |     |     |     |     |     |
| [no-import-module-exports](docs/rules/no-import-module-exports.md) | Forbid import statements with CommonJS module.exports.               |     |     |     | 🔧  |     |     |
| [no-nodejs-modules](docs/rules/no-nodejs-modules.md)               | Forbid Node.js builtin modules.                                      |     |     |     |     |     |     |
| [unambiguous](docs/rules/unambiguous.md)                           | Forbid potentially ambiguous parse goal (`script` vs. `module`).     |     |     |     |     |     |     |

### Static analysis

| Name                                                                   | Description                                                                          | 💼          | ⚠️  | 🚫    | 🔧  | 💡  | ❌  |
| :--------------------------------------------------------------------- | :----------------------------------------------------------------------------------- | :---------- | :-- | :---- | :-- | :-- | :-- |
| [default](docs/rules/default.md)                                       | Ensure a default export is present, given a default import.                          | ❗ ❗ ☑️ ☑️ |     |       |     |     |     |
| [named](docs/rules/named.md)                                           | Ensure named imports correspond to a named export in the remote file.                | ❗ ❗ ☑️ ☑️ |     | ⌨️ ⌨️ |     |     |     |
| [namespace](docs/rules/namespace.md)                                   | Ensure imported namespaces contain dereferenced properties as they are dereferenced. | ❗ ❗ ☑️ ☑️ |     |       |     |     |     |
| [no-absolute-path](docs/rules/no-absolute-path.md)                     | Forbid import of modules using absolute paths.                                       |             |     |       | 🔧  |     |     |
| [no-cycle](docs/rules/no-cycle.md)                                     | Forbid a module from importing a module with a dependency path back to itself.       |             |     |       |     |     |     |
| [no-dynamic-require](docs/rules/no-dynamic-require.md)                 | Forbid `require()` calls with expressions.                                           |             |     |       |     |     |     |
| [no-internal-modules](docs/rules/no-internal-modules.md)               | Forbid importing the submodules of other modules.                                    |             |     |       |     |     |     |
| [no-relative-packages](docs/rules/no-relative-packages.md)             | Forbid importing packages through relative paths.                                    |             |     |       | 🔧  |     |     |
| [no-relative-parent-imports](docs/rules/no-relative-parent-imports.md) | Forbid importing modules from parent directories.                                    |             |     |       |     |     |     |
| [no-restricted-paths](docs/rules/no-restricted-paths.md)               | Enforce which files can be imported in a given folder.                               |             |     |       |     |     |     |
| [no-self-import](docs/rules/no-self-import.md)                         | Forbid a module from importing itself.                                               |             |     |       |     |     |     |
| [no-unresolved](docs/rules/no-unresolved.md)                           | Ensure imports point to a file/module that can be resolved.                          | ❗ ❗ ☑️ ☑️ |     |       |     |     |     |
| [no-useless-path-segments](docs/rules/no-useless-path-segments.md)     | Forbid unnecessary path segments in import and require statements.                   |             |     |       | 🔧  |     |     |
| [no-webpack-loader-syntax](docs/rules/no-webpack-loader-syntax.md)     | Forbid webpack loader syntax in imports.                                             |             |     |       |     |     |     |

### Style guide

| Name                                                                             | Description                                                                 | 💼  | ⚠️          | 🚫  | 🔧  | 💡  | ❌  |
| :------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- | :-- | :---------- | :-- | :-- | :-- | :-- |
| [consistent-type-specifier-style](docs/rules/consistent-type-specifier-style.md) | Enforce or ban the use of inline type-only markers for named imports.       |     |             |     | 🔧  |     |     |
| [dynamic-import-chunkname](docs/rules/dynamic-import-chunkname.md)               | Enforce a leading comment with the webpackChunkName for dynamic imports.    |     |             |     |     | 💡  |     |
| [exports-last](docs/rules/exports-last.md)                                       | Ensure all exports appear after other statements.                           |     |             |     |     |     |     |
| [extensions](docs/rules/extensions.md)                                           | Ensure consistent use of file extension within the import path.             |     |             |     | 🔧  | 💡  |     |
| [first](docs/rules/first.md)                                                     | Ensure all imports appear before other statements.                          |     |             |     | 🔧  |     |     |
| [group-exports](docs/rules/group-exports.md)                                     | Prefer named exports to be grouped together in a single export declaration. |     |             |     |     |     |     |
| [imports-first](docs/rules/imports-first.md)                                     | Replaced by `import-x/first`.                                               |     |             |     | 🔧  |     | ❌  |
| [max-dependencies](docs/rules/max-dependencies.md)                               | Enforce the maximum number of dependencies a module can have.               |     |             |     |     |     |     |
| [newline-after-import](docs/rules/newline-after-import.md)                       | Enforce a newline after import statements.                                  |     |             |     | 🔧  |     |     |
| [no-anonymous-default-export](docs/rules/no-anonymous-default-export.md)         | Forbid anonymous values as default exports.                                 |     |             |     |     |     |     |
| [no-default-export](docs/rules/no-default-export.md)                             | Forbid default exports.                                                     |     |             |     |     |     |     |
| [no-duplicates](docs/rules/no-duplicates.md)                                     | Forbid repeated import of the same module in multiple places.               |     | ☑️ 🚸 ☑️ 🚸 |     | 🔧  |     |     |
| [no-named-default](docs/rules/no-named-default.md)                               | Forbid named default exports.                                               |     |             |     |     |     |     |
| [no-named-export](docs/rules/no-named-export.md)                                 | Forbid named exports.                                                       |     |             |     |     |     |     |
| [no-namespace](docs/rules/no-namespace.md)                                       | Forbid namespace (a.k.a. "wildcard" `*`) imports.                           |     |             |     | 🔧  |     |     |
| [no-unassigned-import](docs/rules/no-unassigned-import.md)                       | Forbid unassigned imports.                                                  |     |             |     |     |     |     |
| [order](docs/rules/order.md)                                                     | Enforce a convention in module import order.                                |     |             |     | 🔧  |     |     |
| [prefer-default-export](docs/rules/prefer-default-export.md)                     | Prefer a default export if module exports a single name or multiple names.  |     |             |     |     |     |     |

<!-- end auto-generated rules list -->

## Resolvers

With the advent of module bundlers and the current state of modules and module
syntax specs, it's not always obvious where `import x from 'module'` should look
to find the file behind `module`.

Up through v0.10ish, this plugin has directly used substack's [`resolve`] plugin,
which implements Node's import behavior. This works pretty well in most cases.

However, webpack allows a number of things in import module source strings that
Node does not, such as loaders (`import 'file!./whatever'`) and a number of
aliasing schemes, such as [`externals`]: mapping a module id to a global name at
runtime (allowing some modules to be included more traditionally via script tags).

In the interest of supporting both of these, v0.11 introduces resolvers.

Currently [Node] and [webpack] resolution have been implemented, but the
resolvers are just npm packages, so [third party packages are supported](https://github.com/import-js/eslint-plugin-import/wiki/Resolvers) (and encouraged!).

You can reference resolvers in several ways (in order of precedence):

- as a conventional `eslint-import-resolver` name, like `eslint-import-resolver-foo`:

### `import-x/resolver-next`

> [!warning]
>
> Only available in the new flat config system. If you are using the legacy config system, please use `import-x/resolver` instead.

```js
// eslint.config.js

import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import { createNodeResolver } from 'eslint-plugin-import-x'

export default [
  {
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver(/* Your override options go here */),
        createNodeResolver(/* Your override options go here */),
      ],
    },
  },
]
```

### `import-x/resolver`

```yaml
# .eslintrc.yml
settings:
  # uses 'eslint-import-resolver-foo':
  import-x/resolver: foo
```

```js
// .eslintrc.js
module.exports = {
  settings: {
    'import-x/resolver': {
      foo: { someConfig: value },
    },
  },
}
```

- with a full npm module name, like `my-awesome-npm-module`:

```yaml
# .eslintrc.yml
settings:
  import-x/resolver: 'my-awesome-npm-module'
```

```js
// .eslintrc.js
module.exports = {
  settings: {
    'import-x/resolver': {
      'my-awesome-npm-module': { someConfig: value },
    },
  },
}
```

- with a filesystem path to resolver, defined in this example as a `computed property` name:

```js
// .eslintrc.js
module.exports = {
  settings: {
    'import-x/resolver': {
      [path.resolve('../../../my-resolver')]: { someConfig: value },
    },
  },
}
```

- use the `import` or `require` syntax to directly import the resolver object:

```js
// .eslintrc.mjs
import * as tsResolver from 'eslint-import-resolver-typescript'

export default {
  settings: {
    'import-x/resolver': {
      name: 'tsResolver', // required, could be any string you like
      // enable: false, // optional, defaults to true
      // optional, options to pass to the resolver https://github.com/import-js/eslint-import-resolver-typescript#configuration
      options: {
        bun: true, // optional, resolve Bun modules https://github.com/import-js/eslint-import-resolver-typescript#bun
      },
      resolver: tsResolver, // required, the resolver object
    },
  },
}
```

```js
// .eslintrc.cjs
const tsResolver = require('eslint-import-resolver-typescript')

module.exports = {
  settings: {
    'import-x/resolver': {
      name: 'tsResolver', // required, could be any string you like
      // enable: false, // optional, defaults to true
      // optional, options to pass to the resolver https://github.com/import-js/eslint-import-resolver-typescript#configuration
      options: {
        bun: true, // optional, resolve Bun modules https://github.com/import-js/eslint-import-resolver-typescript#bun
      },
      resolver: tsResolver, // required, the resolver object
    },
  },
}
```

Relative paths will be resolved relative to the source's nearest `package.json` or
the process's current working directory if no `package.json` is found.

If you are interesting in writing a resolver, see the [spec](./resolvers/README.md) for more details.

## Settings

You may set the following settings in your `.eslintrc`:

### `import-x/extensions`

A list of file extensions that will be parsed as modules and inspected for
`export`s.

This defaults to `['.js']`, unless you are using the `react` shared config,
in which case it is specified as `['.js', '.jsx']`. Despite the default,
if you are using TypeScript (without the `plugin:import-x/typescript` config
described above) you must specify the new extensions (`.ts`, and also `.tsx`
if using React).

```js
"settings": {
  "import-x/extensions": [
    ".js",
    ".jsx"
  ]
}
```

If you require more granular extension definitions, you can use:

```js
"settings": {
  "import-x/resolver": {
    "node": {
      "extensions": [
        ".js",
        ".jsx"
      ]
    }
  }
}
```

Note that this is different from (and likely a subset of) any `import-x/resolver`
extensions settings, which may include `.json`, `.coffee`, etc. which will still
factor into the `no-unresolved` rule.

Also, the following `import-x/ignore` patterns will overrule this list.

### `import-x/ignore`

A list of regex strings that, if matched by a path, will
not report the matching module if no `export`s are found.
In practice, this means rules other than [`no-unresolved`](./docs/rules/no-unresolved.md#ignore) will not report on any
`import`s with (absolute filesystem) paths matching this pattern.

`no-unresolved` has its own [`ignore`](./docs/rules/no-unresolved.md#ignore) setting.

```yaml
settings:
  import-x/ignore:
    - \.coffee$ # fraught with parse errors
    - \.(scss|less|css)$ # can't parse unprocessed CSS modules, either
```

### `import-x/core-modules`

An array of additional modules to consider as "core" modules--modules that should
be considered resolved but have no path on the filesystem. Your resolver may
already define some of these (for example, the Node resolver knows about `fs` and
`path`), so you need not redefine those.

For example, Electron exposes an `electron` module:

```js
import 'electron' // without extra config, will be flagged as unresolved!
```

that would otherwise be unresolved. To avoid this, you may provide `electron` as a
core module:

```yaml
# .eslintrc.yml
settings:
  import-x/core-modules: [electron]
```

In Electron's specific case, there is a shared config named `electron`
that specifies this for you.

Contribution of more such shared configs for other platforms are welcome!

### `import-x/external-module-folders`

An array of folders. Resolved modules only from those folders will be considered as "external". By default - `["node_modules"]`. Makes sense if you have configured your path or webpack to handle your internal paths differently and want to consider modules from some folders, for example `bower_components` or `jspm_modules`, as "external".

This option is also useful in a monorepo setup: list here all directories that contain monorepo's packages and they will be treated as external ones no matter which resolver is used.

If you are using `yarn` PnP as your package manager, add the `.yarn` folder and all your installed dependencies will be considered as `external`, instead of `internal`.

Each item in this array is either a folder's name, its subpath, or its absolute prefix path:

- `jspm_modules` will match any file or folder named `jspm_modules` or which has a direct or non-direct parent named `jspm_modules`, e.g. `/home/me/project/jspm_modules` or `/home/me/project/jspm_modules/some-pkg/index.js`.

- `packages/core` will match any path that contains these two segments, for example `/home/me/project/packages/core/src/utils.js`.

- `/home/me/project/packages` will only match files and directories inside this directory, and the directory itself.

Please note that incomplete names are not allowed here so `components` won't match `bower_components` and `packages/ui` won't match `packages/ui-utils` (but will match `packages/ui/utils`).

### `import-x/parsers`

A map from parsers to file extension arrays. If a file extension is matched, the
dependency parser will require and use the map key as the parser instead of the
configured ESLint parser. This is useful if you're inter-op-ing with TypeScript
directly using webpack, for example:

```yaml
# .eslintrc.yml
settings:
  import-x/parsers:
    '@typescript-eslint/parser': [.ts, .tsx]
```

In this case, [`@typescript-eslint/parser`](https://www.npmjs.com/package/@typescript-eslint/parser)
must be installed and require-able from the running `eslint` module's location
(i.e., install it as a peer of ESLint).

This is currently only tested with `@typescript-eslint/parser` (and its predecessor,
`typescript-eslint-parser`) but should theoretically work with any moderately
ESTree-compliant parser.

It's difficult to say how well various plugin features will be supported, too,
depending on how far down the rabbit hole goes. Submit an issue if you find strange
behavior beyond here, but steel your heart against the likely outcome of closing
with `wontfix`.

### `import-x/resolver` and `import-x/resolver-next`

See [resolvers](#resolvers).

### `import-x/cache`

Settings for cache behavior. Memoization is used at various levels to avoid the copious amount of `fs.statSync`/module parse calls required to correctly report errors.

For normal `eslint` console runs, the cache lifetime is irrelevant, as we can strongly assume that files should not be changing during the lifetime of the linter process (and thus, the cache in memory)

For long-lasting processes, like [`eslint_d`] or [`eslint-loader`], however, it's important that there be some notion of staleness.

If you never use [`eslint_d`] or [`eslint-loader`], you may set the cache lifetime to `Infinity` and everything should be fine:

```yaml
# .eslintrc.yml
settings:
  import-x/cache:
    lifetime: ∞ # or Infinity
```

Otherwise, set some integer, and cache entries will be evicted after that many seconds have elapsed:

```yaml
# .eslintrc.yml
settings:
  import-x/cache:
    lifetime: 5 # 30 is the default
```

### `import-x/internal-regex`

A regex for packages should be treated as internal. Useful when you are utilizing a monorepo setup or developing a set of packages that depend on each other.

By default, any package referenced from [`import-x/external-module-folders`](#import-xexternal-module-folders) will be considered as "external", including packages in a monorepo like yarn workspace or lerna environment. If you want to mark these packages as "internal" this will be useful.

For example, if your packages in a monorepo are all in `@scope`, you can configure `import-x/internal-regex` like this

```yaml
# .eslintrc.yml
settings:
  import-x/internal-regex: ^@scope/
```

## SublimeLinter-eslint

SublimeLinter-eslint introduced a change to support `.eslintignore` files
which altered the way file paths are passed to ESLint when linting during editing.
This change sends a relative path instead of the absolute path to the file (as ESLint
normally provides), which can make it impossible for this plugin to resolve dependencies
on the filesystem.

This workaround should no longer be necessary with the release of ESLint 2.0, when
`.eslintignore` will be updated to work more like a `.gitignore`, which should
support proper ignoring of absolute paths via `--stdin-filename`.

In the meantime, see [roadhump/SublimeLinter-eslint#58](https://github.com/roadhump/SublimeLinter-eslint/issues/58)
for more details and discussion, but essentially, you may find you need to add the following
`SublimeLinter` config to your Sublime project file:

```json
{
  "folders": [
    {
      "path": "code"
    }
  ],
  "SublimeLinter": {
    "linters": {
      "eslint": {
        "chdir": "${project}/code"
      }
    }
  }
}
```

Note that `${project}/code` matches the `code` provided at `folders[0].path`.

The purpose of the `chdir` setting, in this case, is to set the working directory
from which ESLint is executed to be the same as the directory on which SublimeLinter-eslint
bases the relative path it provides.

See the SublimeLinter docs on [`chdir`](https://www.sublimelinter.com/en/latest/linter_settings.html#chdir)
for more information, in case this does not work with your project.

If you are not using `.eslintignore`, or don't have a Sublime project file, you can also
do the following via a `.sublimelinterrc` file in some ancestor directory of your
code:

```json
{
  "linters": {
    "eslint": {
      "args": ["--stdin-filename", "@"]
    }
  }
}
```

I also found that I needed to set `rc_search_limit` to `null`, which removes the file
hierarchy search limit when looking up the directory tree for `.sublimelinterrc`:

In Package Settings / SublimeLinter / User Settings:

```json
{
  "user": {
    "rc_search_limit": null
  }
}
```

I believe this defaults to `3`, so you may not need to alter it depending on your
project folder max depth.

## Sponsors and Backers

[![Sponsors and Backers](https://raw.githubusercontent.com/1stG/static/master/sponsors.svg)](https://github.com/sponsors/JounQin)

### Sponsors

| 1stG                                                                                                                   | RxTS                                                                                                                   | UnTS                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [![1stG Open Collective sponsors](https://opencollective.com/1stG/organizations.svg)](https://opencollective.com/1stG) | [![RxTS Open Collective sponsors](https://opencollective.com/rxts/organizations.svg)](https://opencollective.com/rxts) | [![UnTS Open Collective sponsors](https://opencollective.com/unts/organizations.svg)](https://opencollective.com/unts) |

### Backers

| 1stG                                                                                                                | RxTS                                                                                                                | UnTS                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [![1stG Open Collective backers](https://opencollective.com/1stG/individuals.svg)](https://opencollective.com/1stG) | [![RxTS Open Collective backers](https://opencollective.com/rxts/individuals.svg)](https://opencollective.com/rxts) | [![UnTS Open Collective backers](https://opencollective.com/unts/individuals.svg)](https://opencollective.com/unts) |

## Changelog

Detailed changes for each release are documented in [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT][] © [JounQin][]@[1stG.me][]

## Star History

<a href="https://www.star-history.com/#un-ts/eslint-plugin-import-x&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=un-ts/eslint-plugin-import-x&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=un-ts/eslint-plugin-import-x&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=un-ts/eslint-plugin-import-x&type=Date" />
 </picture>
</a>

[`@typescript-eslint/parser`]: https://github.com/typescript-eslint/typescript-eslint/tree/HEAD/packages/parser
[`eslint-plugin-import`]: https://github.com/import-js/eslint-plugin-import
[`eslint-import-resolver-typescript`]: https://github.com/import-js/eslint-import-resolver-typescript
[`eslint_d`]: https://www.npmjs.com/package/eslint_d
[`eslint-loader`]: https://www.npmjs.com/package/eslint-loader
[`get-tsconfig`]: https://github.com/privatenumber/get-tsconfig
[`tsconfig-paths`]: https://github.com/dividab/tsconfig-paths
[`typescript`]: https://github.com/microsoft/TypeScript
[`unrs-resolver`]: https://github.com/unrs/unrs-resolver
[`resolve`]: https://www.npmjs.com/package/resolve
[`externals`]: https://webpack.github.io/docs/library-and-externals.html
[1stG.me]: https://www.1stG.me
[JounQin]: https://github.com/JounQin
[MIT]: http://opensource.org/licenses/MIT
[node]: https://www.npmjs.com/package/eslint-import-resolver-node
[webpack]: https://www.npmjs.com/package/eslint-import-resolver-webpack
