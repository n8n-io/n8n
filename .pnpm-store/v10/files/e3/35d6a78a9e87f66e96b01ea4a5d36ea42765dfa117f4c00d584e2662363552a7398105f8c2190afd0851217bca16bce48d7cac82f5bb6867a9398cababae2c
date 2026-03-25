# dependency-tree

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-dependency-tree/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-dependency-tree/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/dependency-tree?logo=npm&logoColor=fff)](https://www.npmjs.com/package/dependency-tree)
[![npm downloads](https://img.shields.io/npm/dm/dependency-tree)](https://www.npmjs.com/package/dependency-tree)

> Get the dependency tree of a module

```sh
npm install dependency-tree
```

* Works for JS (AMD, CommonJS, ES6 modules), TypeScript, and CSS preprocessors (CSS (PostCSS), Sass, Stylus, and Less); basically, any module type supported by [Precinct](https://github.com/dependents/node-precinct).
  - For CommonJS modules, 3rd party dependencies (npm installed dependencies) are included in the tree by default
  - Dependency path resolutions are handled by [filing-cabinet](https://github.com/dependents/node-filing-cabinet)
  - Supports RequireJS and Webpack loaders
* All core Node modules (assert, path, fs, etc) are removed from the dependency list by default

## Usage

```js
const dependencyTree = require('dependency-tree');

// Returns a dependency tree object for the given file
const tree = dependencyTree({
  filename: 'path/to/a/file',
  directory: 'path/to/all/files',
  requireConfig: 'path/to/requirejs/config', // optional
  webpackConfig: 'path/to/webpack/config', // optional
  tsConfig: 'path/to/typescript/config', // optional
  nodeModulesConfig: {
    entry: 'module'
  }, // optional
  filter: path => path.indexOf('node_modules') === -1, // optional
  nonExistent: [], // optional
  noTypeDefinitions: false // optional
});

// Returns a post-order traversal (list form) of the tree with duplicate sub-trees pruned.
// This is useful for bundling source files, because the list gives the concatenation order.
// Note: you can pass the same arguments as you would to dependencyTree()
const list = dependencyTree.toList({
  filename: 'path/to/a/file',
  directory: 'path/to/all/files'
});
```

### Options

* `requireConfig`: path to a requirejs config for AMD modules (allows for the result of aliased module paths)
* `webpackConfig`: path to a webpack config for aliased modules
* `tsConfig`: path to a typescript config (or a preloaded object representing the typescript config)
* `tsConfigPath`: a (virtual) path to typescript config file when `tsConfig` option is given as an object, not a string. Needed to calculate [Path Mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping). If not given when `tsConfig` is an object, **Path Mapping** is ignored. This is not needed when `tsConfig` is given as a path string.
* `nodeModulesConfig`: config for resolving entry file for node_modules
* `visited`: object used for avoiding redundant subtree generations via memoization.
* `nonExistent`: array used for storing the list of partial paths that do not exist
* `filter`: a function used to determine if a module (and its subtree) should be included in the dependency tree
 - The first argument given to the filter is an absolute filepath to the dependency and the second is the filepath to the currently traversed file. Should return a `Boolean`. If it returns `true`, the module is included in the resulting tree.
* `detective`: object with configuration specific to detectives used to find dependencies of a file
  - for example `detective.amd.skipLazyLoaded: true` tells the AMD detective to omit inner requires
  - See [precinct's usage docs](https://github.com/dependents/node-precinct#usage) for the list of module types you can pass options to.
* `noTypeDefinitions`: For TypeScript imports, whether to resolve to `*.js` instead of `*.d.ts`.

### Format Details

The object form is a mapping of the dependency tree to the filesystem –
where every key is an absolute filepath and the value is another object/subtree.

Example:

```js
{
  '/Users/mrjoelkemp/Documents/node-dependency-tree/test/example/extended/a.js': {
    '/Users/mrjoelkemp/Documents/node-dependency-tree/test/example/extended/b.js': {
      '/Users/mrjoelkemp/Documents/node-dependency-tree/test/example/extended/d.js': {},
      '/Users/mrjoelkemp/Documents/node-dependency-tree/test/example/extended/e.js': {}
    },
    '/Users/mrjoelkemp/Documents/node-dependency-tree/test/example/extended/c.js': {
      '/Users/mrjoelkemp/Documents/node-dependency-tree/test/example/extended/f.js': {},
      '/Users/mrjoelkemp/Documents/node-dependency-tree/test/example/extended/g.js': {}
    }
  }
}
```

This structure was chosen to serve as a visual representation of the dependency tree
for use in the [Dependents](https://github.com/mrjoelkemp/sublime-dependents) plugin.

### CLI version

* Assumes a global install: `npm install -g dependency-tree`

```
dependency-tree --directory=path/to/all/supported/files [--list-form] [-c path/to/require/config] [-w path/to/webpack/config] filename
```

Prints the dependency tree of the given filename as stringified json (by default).

* You can alternatively print out the list form one element per line using the `--list-form` option.

## How does this work?

Dependency tree takes in a starting file, extracts its declared dependencies via [precinct](https://github.com/dependents/node-precinct/), resolves each of those dependencies to a file on the filesystem via [filing-cabinet](https://github.com/dependents/node-filing-cabinet), then recursively performs those steps until there are no more dependencies to process.

In more detail, the starting file is passed to precinct to extract dependencies. Dependency-tree doesn't care about how to extract dependencies, so it delegates that work to precinct: which is a multi-language dependency extractor; we'll focus on JavaScript tree generation for this example. To do the extraction, precinct delegates the abstract-syntax-tree (AST) generation to the default parser for [node-source-walk](https://github.com/dependents/node-source-walk). Precinct uses the AST to determine what type of JS module the file is (Commonjs, AMD, or ES6) and then delegates to the "detective" that's appropriate for that module type. The "detective" contains the logic for how to extract dependencies based on the module syntax format; i.e., the way dependencies are declared in commonjs is different than in AMD (which has 4 ways of doing that, for example).

After using the detective to get the (raw, like './foobar') dependency strings, precinct passes that back to dependency-tree. Of course, in order to find the dependencies in './foobar', we need to resolve that dependency to a real file on the filesystem. To do this, dependency-tree delegates that task to filing-cabinet: which is a multi-language dependency resolver.

Filing-cabinet reuses (for performance) the AST that precinct made node-source-walk generate. It then does a similar check on the AST to see which module type (commonjs, amd, or es6) is being used in the file (again, we're assuming a regular JS file for this example) and then delegates to the appropriate resolver for that module type. We need different resolvers because a dependency name in AMD could be aliased via a requirejs config. Similarly, commonjs has its own algorithm for resolving dependencies.

So after the appropriate resolver finds the file on the filesystem, filing-cabinet has successfully mapped a raw dependency name to a file on the filesystem. Now, dependency-tree has a file that it can also traverse (repeating exactly what was done for the starting file).

At the end of traversing every file (in a depth-first fashion), we have a fully populated dependency tree. :dancers:

## FAQ

### Why aren't some some dependencies being detected?

If there are bugs in [precinct](https://github.com/dependents/node-precinct) or if the `requireConfig`/`webpackConfig`/`tsConfig` options are incomplete,
some dependencies may not be resolved. The optional array passed to the `nonExistent` option will be populated with paths
that could not be resolved. You can check this array to see where problems might exist.

You can also use the `NODE_DEBUG=*` env variable along with the cli version to see debugging information explaining where resolution went wrong.
Example: `NODE_DEBUG=* dependency-tree -w path/to/webpack.config.json path/to/a/file`
