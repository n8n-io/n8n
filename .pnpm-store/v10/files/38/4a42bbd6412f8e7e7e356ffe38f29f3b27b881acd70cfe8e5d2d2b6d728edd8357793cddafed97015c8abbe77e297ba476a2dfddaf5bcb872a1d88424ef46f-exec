[npm]: https://img.shields.io/npm/v/@rollup/pluginutils
[npm-url]: https://www.npmjs.com/package/@rollup/pluginutils
[size]: https://packagephobia.now.sh/badge?p=@rollup/pluginutils
[size-url]: https://packagephobia.now.sh/result?p=@rollup/pluginutils

[![npm][npm]][npm-url]
[![size][size]][size-url]
[![libera manifesto](https://img.shields.io/badge/libera-manifesto-lightgrey.svg)](https://liberamanifesto.com)

# @rollup/pluginutils

A set of utility functions commonly used by 🍣 Rollup plugins.

## Requirements

This plugin requires an [LTS](https://github.com/nodejs/Release) Node version (v8.0.0+) and Rollup v1.20.0+.

## Install

Using npm:

```console
npm install @rollup/pluginutils --save-dev
```

## Usage

```js
import utils from '@rollup/pluginutils';
//...
```

## API

Available utility functions are listed below:

_Note: Parameter names immediately followed by a `?` indicate that the parameter is optional._

### addExtension

Adds an extension to a module ID if one does not exist.

Parameters: `(filename: String, ext?: String)`<br>
Returns: `String`

```js
import { addExtension } from '@rollup/pluginutils';

export default function myPlugin(options = {}) {
  return {
    resolveId(code, id) {
      // only adds an extension if there isn't one already
      id = addExtension(id); // `foo` -> `foo.js`, `foo.js -> foo.js`
      id = addExtension(id, '.myext'); // `foo` -> `foo.myext`, `foo.js -> `foo.js`
    }
  };
}
```

### attachScopes

Attaches `Scope` objects to the relevant nodes of an AST. Each `Scope` object has a `scope.contains(name)` method that returns `true` if a given name is defined in the current scope or a parent scope.

Parameters: `(ast: Node, propertyName?: String)`<br>
Returns: `Object`

See [rollup-plugin-inject](https://github.com/rollup/rollup-plugin-inject) or [rollup-plugin-commonjs](https://github.com/rollup/rollup-plugin-commonjs) for an example of usage.

```js
import { attachScopes } from '@rollup/pluginutils';
import { walk } from 'estree-walker';

export default function myPlugin(options = {}) {
  return {
    transform(code) {
      const ast = this.parse(code);

      let scope = attachScopes(ast, 'scope');

      walk(ast, {
        enter(node) {
          if (node.scope) scope = node.scope;

          if (!scope.contains('foo')) {
            // `foo` is not defined, so if we encounter it,
            // we assume it's a global
          }
        },
        leave(node) {
          if (node.scope) scope = scope.parent;
        }
      });
    }
  };
}
```

### createFilter

Constructs a filter function which can be used to determine whether or not certain modules should be operated upon.

Parameters: `(include?: <minmatch>, exclude?: <minmatch>, options?: Object)`<br>
Returns: `String`

#### `include` and `exclude`

Type: `String | RegExp | Array[...String|RegExp]`<br>

A valid [`minimatch`](https://www.npmjs.com/package/minimatch) pattern, or array of patterns. If `options.include` is omitted or has zero length, filter will return `true` by default. Otherwise, an ID must match one or more of the `minimatch` patterns, and must not match any of the `options.exclude` patterns.

#### `options`

##### `resolve`

Type: `String | Boolean | null`

Optionally resolves the patterns against a directory other than `process.cwd()`. If a `String` is specified, then the value will be used as the base directory. Relative paths will be resolved against `process.cwd()` first. If `false`, then the patterns will not be resolved against any directory. This can be useful if you want to create a filter for virtual module names.

#### Usage

```js
import { createFilter } from '@rollup/pluginutils';

export default function myPlugin(options = {}) {
  // assume that the myPlugin accepts options of `options.include` and `options.exclude`
  var filter = createFilter(options.include, options.exclude, {
    resolve: '/my/base/dir'
  });

  return {
    transform(code, id) {
      if (!filter(id)) return;

      // proceed with the transformation...
    }
  };
}
```

### dataToEsm

Transforms objects into tree-shakable ES Module imports.

Parameters: `(data: Object)`<br>
Returns: `String`

#### `data`

Type: `Object`

An object to transform into an ES module.

#### Usage

```js
import { dataToEsm } from '@rollup/pluginutils';

const esModuleSource = dataToEsm(
  {
    custom: 'data',
    to: ['treeshake']
  },
  {
    compact: false,
    indent: '\t',
    preferConst: false,
    objectShorthand: false,
    namedExports: true
  }
);
/*
Outputs the string ES module source:
  export const custom = 'data';
  export const to = ['treeshake'];
  export default { custom, to };
*/
```

### extractAssignedNames

Extracts the names of all assignment targets based upon specified patterns.

Parameters: `(param: Node)`<br>
Returns: `Array[...String]`

#### `param`

Type: `Node`

An `acorn` AST Node.

#### Usage

```js
import { extractAssignedNames } from '@rollup/pluginutils';
import { walk } from 'estree-walker';

export default function myPlugin(options = {}) {
  return {
    transform(code) {
      const ast = this.parse(code);

      walk(ast, {
        enter(node) {
          if (node.type === 'VariableDeclarator') {
            const declaredNames = extractAssignedNames(node.id);
            // do something with the declared names
            // e.g. for `const {x, y: z} = ... => declaredNames = ['x', 'z']
          }
        }
      });
    }
  };
}
```

### makeLegalIdentifier

Constructs a bundle-safe identifier from a `String`.

Parameters: `(str: String)`<br>
Returns: `String`

#### Usage

```js
import { makeLegalIdentifier } from '@rollup/pluginutils';

makeLegalIdentifier('foo-bar'); // 'foo_bar'
makeLegalIdentifier('typeof'); // '_typeof'
```

## Meta

[CONTRIBUTING](/.github/CONTRIBUTING.md)

[LICENSE (MIT)](/LICENSE)
