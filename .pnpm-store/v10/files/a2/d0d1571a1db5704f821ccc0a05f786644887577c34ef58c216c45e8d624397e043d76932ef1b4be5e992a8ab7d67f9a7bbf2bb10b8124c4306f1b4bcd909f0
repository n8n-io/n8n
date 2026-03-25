# filing-cabinet

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-filing-cabinet/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-filing-cabinet/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/filing-cabinet?logo=npm&logoColor=fff)](https://www.npmjs.com/package/filing-cabinet)
[![npm downloads](https://img.shields.io/npm/dm/filing-cabinet)](https://www.npmjs.com/package/filing-cabinet)

> Get the file associated with a dependency/partial's path

```sh
npm install filing-cabinet
```

## Usage

```js
const cabinet = require('filing-cabinet');

const result = cabinet({
  partial: 'somePartialPath',
  directory: 'path/to/all/files',
  filename: 'path/to/parent/file',
  ast: {}, // an optional AST representation of `filename`
  // Only for JavaScript files
  config: 'path/to/requirejs/config',
  webpackConfig: 'path/to/webpack/config',
  nodeModulesConfig: {
    entry: 'module'
  },
  tsConfig: 'path/to/tsconfig.json', // or an object
  tsConfigPath: 'path/to/tsconfig.json'
});

console.log(result); // /absolute/path/to/somePartialPath
```

* `partial`: the dependency path
  * This could be in any of the registered languages
* `directory`: the path to all files
* `filename`: the path to the file containing the `partial`
* `ast`: (optional) the parsed AST for `filename`.
  * Useful optimization for avoiding a parse of filename
* `config`: (optional) requirejs config for resolving aliased JavaScript modules
* `webpackConfig`: (optional) Webpack config for resolving aliased JavaScript modules. If exporting multiple configurations, the first configuration is used.
* `nodeModulesConfig`: (optional) config for resolving entry file for node_modules. This value overrides the `main` attribute in the package.json file; used in conjunction with the [packageFilter](https://github.com/browserify/resolve#resolveid-opts-cb) of the `resolve` package.
* `tsConfig`: (optional) path to a TypeScript configuration. Could also be an object representing a pre-parsed TypeScript config.
* `tsConfigPath`: (optional) A (virtual) path to TypeScript config file when `tsConfig` option is given as an object, not a string. Needed to calculate [Path Mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping). If not given when `tsConfig` is an object, **Path Mapping** is ignored. This is not need when `tsConfig` is given as string (path to the tsconfig file).
* `noTypeDefinitions`: (optional) For TypeScript files, whether to prefer `*.js` over `*.d.ts`.

## Registered languages

By default, filing-cabinet provides support for the following languages:

* JavaScript: CommonJS, AMD, ES6
* TypeScript
* CSS Preprocessors: Sass (`.scss` and `.sass`), Stylus (`.styl`), and Less (`.less`)
* Vue

You can register resolvers for new languages via `cabinet.register(extension, resolver)`.

* `extension`: the extension of the file that should use the custom resolver (ex: '.py', '.php')
* `resolver`: a function that accepts the following (ordered) arguments that were given to cabinet:
  * `partial`
  * `filename`
  * `directory`
  * `config`

For examples of resolver implementations, take a look at the default language resolvers:

* [sass-lookup](https://github.com/dependents/node-sass-lookup)
* [stylus-lookup](https://github.com/dependents/node-stylus-lookup)
* [amdLookup](https://github.com/dependents/node-module-lookup-amd)

If a given extension does not have a registered resolver, cabinet will use
a generic file resolver which is basically `require('path').join` with a bit of extension defaulting logic.

## CLI

Requires a global install with `npm install -g filing-cabinet`

```sh
filing-cabinet [options] <dependencyPath>
```

See `filing-cabinet --help` for details on the options.

## License

[MIT](LICENSE)
