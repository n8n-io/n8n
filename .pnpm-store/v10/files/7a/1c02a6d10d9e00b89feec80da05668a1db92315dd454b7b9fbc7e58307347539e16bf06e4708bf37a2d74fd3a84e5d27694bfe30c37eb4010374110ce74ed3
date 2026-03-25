vite-plugin-istanbul
==========================

[![Codacy grade](https://img.shields.io/codacy/grade/a0c628b128c044269faefc1da74382f7?style=for-the-badge&logo=codacy)](https://www.codacy.com/gh/iFaxity/vite-plugin-istanbul/dashboard)
[![npm (scoped)](https://img.shields.io/npm/v/vite-plugin-istanbul?style=for-the-badge&logo=npm)](https://npmjs.org/package/vite-plugin-istanbul)
[![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/vite-plugin-istanbul?label=Bundle%20size&style=for-the-badge)](https://npmjs.org/package/vite-plugin-istanbul)
[![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/vite-plugin-istanbul?label=Bundle%20size%20%28gzip%29&style=for-the-badge)](https://npmjs.org/package/vite-plugin-istanbul)

> This project is looking for new maintainers. See CONTRIBUTING.md

A Vite plugin to instrument your code for nyc/istanbul code coverage. In similar way as the Webpack Loader `istanbul-instrumenter-loader`. Only intended for use in development while running tests.

Only versions targeting the latest stable Vite version is actively developed.

Installation
--------------------------
`npm i -D vite-plugin-istanbul`

or if you use yarn

`yarn add -D vite-plugin-istanbul`

API
--------------------------

```js
import IstanbulPlugin from 'vite-plugin-istanbul';
```

### [IstanbulPlugin( [ opts ] )](#istanbul-plugin)

Creates the vite plugin from a set of optional plugin options.

**Returns:** Vite Plugin

#### Parameters

| Parameter              | Type               | Description                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cwd`                  | `string`           | Optional string of the current working directory, used for the include/exclude patterns. Defaults to `process.cwd()`.                                                                                                                                                                                                 |
| `include`              | `string\|string[]` | Optional string or array of strings of glob patterns to include.                                                                                                                                                                                                                                                      |
| `exclude`              | `string\|string[]` | Optional string or array of strings of glob patterns to exclude.                                                                                                                                                                                                                                                      |
| `extension`            | `string\|string[]` | Optional string or array of strings of extensions to include (dot prefixed like .js or .ts). By default this is set to `['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.vue']`.                                                                                                                                      |
| `requireEnv`           | `boolean`          | Optional boolean to require the environment variable (defaults to **VITE_COVERAGE**) to equal `true` in order to instrument the code. Otherwise it will instrument even if env variable is not set. However if `requireEnv` is not set the instrumentation will stop if the environment variable is equal to `false`. |
| `cypress`              | `boolean`          | Optional boolean to change the environment variable to **CYPRESS_COVERAGE** instead of **VITE_COVERAGE**. For ease of use with `@cypress/code-coverage`.                                                                                                                                                              |
| `checkProd`            | `boolean`          | Optional boolean to enforce the plugin to skip instrumentation for production environments. Looks at Vite's **isProduction** key from the `ResolvedConfig`.                                                                                                                                                           |
| `forceBuildInstrument` | `boolean`          | Optional boolean to enforce the plugin to add instrumentation in build mode. Defaults to false.                                                                                                                                                                                                                       |
| `nycrcPath`            | `string`           | Path to specific nyc config to use instead of automatically searching for a nycconfig. This parameter is just passed down to `@istanbuljs/load-nyc-config`.                                                                                                                                                           |
| `generatorOpts`        | `GeneratorOptions` | A set of generator options that are passed down to the Babel transformer. See [here](https://babeljs.io/docs/babel-generator#options) for reference. Defaults to empty object.                                                                                                                                        |

Notes
--------------------------

As of v2.1.0 you can toggle the coverage off by setting the env variable `VITE_COVERAGE='false'`, by default it will always instrument the code. To require the explicit definition of the variable, set the option `requireEnv` to **true**.

This plugin also requires the Vite configuration [build.sourcemap](https://vitejs.dev/config/#build-sourcemap) to be set to either **true**, **'inline'**, **'hidden'**.
But the plugin will automatically default to **true** if it is missing in order to give accurate code coverage.
The plugin will notify when this happens in order for a developer to fix it. This notification will show even when the plugin is disabled by e.g `opts.requireEnv`, `VITE_COVERAGE=false`. This is due to a limitation of the API for this kind of feature.

Examples
--------------------------

To use this plugin define it using vite.config.js

```js
// vite.config.js
import istanbul from 'vite-plugin-istanbul';

export default {
  open: true,
  port: 3000,
  plugins: [
    istanbul({
      include: 'src/*',
      exclude: ['node_modules', 'test/'],
      extension: ['.js', '.ts', '.vue'],
      requireEnv: true,
    }),
  ],
};
```

Looking for contributors and maintainers
---------------------------------------------

This project is not under active development, although we will continue to provide support for current users, but you can change that by joining the team (see CONTRIBUTING.md)

If you use this project and would like to develop it further, please introduce yourself on the [Maintainers wanted](https://github.com/iFaxity/vite-plugin-istanbul/issues/341) ticket.

License
--------------------------

[MIT](./LICENSE)
