[![Tests](https://github.com/samthor/esm-resolve/workflows/Tests/badge.svg)](https://github.com/samthor/esm-resolve/actions)

Sync ESM import resolver for Node written in pure JS.
This is written to be part of an [ESM dev server](https://github.com/samthor/dhost) or build process.
It is permissive by default, allowing some cases which would normally be failures.

⚠️ This resolver was writtem before [`import.meta.resolve()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta/resolve) was widely available&mdash;it may work for you without adding _yet another_ dependency.
However, "esm-resolve" is a bit more permissive.

## Usage

Install and import "esm-resolve" via your favorite package manager.
Create a resolver based on the importing file.

```js
import buildResolver from 'esm-resolve';
import { buildResolver } from 'esm-resolve'; // also works

const r = buildResolver('./lib/file.js');

r('./relative'); // './relative.js'
r('foo-test-package-name'); // '../node_modules/foo-test-package-name/index.js'
```

Resolution logic is actually the same for any files in the same directory, so resolver objects can be reused (and they have a small bit of cache).

The resolved path is returned relative _to the importer_ of that file, not your process' current directory.
You can set the `resolveToAbsolute` option if you'd always like an absolute path.

## Notes

This implements modern Node resolution, i.e., [subpath exports](https://nodejs.org/api/packages.html#packages_subpath_exports), [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) and [conditional exports](https://nodejs.org/api/packages.html#packages_conditional_exports).
By default, it will rewrite to the "browser", "import" or "default" keys (not "node", as it's expected that you'll use this for browser builds).

It fails gracefully in many ways, including falling back to real paths if exports aren't defined.
It will also remove imports that point purely to ".d.ts" files (you don't need to create [peer JS](https://whistlr.info/2021/check-js-with-ts/#import-your-types)).

You can [configure all these options](./types/external.d.ts) via the resolver's second argument, e.g.:

```js
// Resolves for Node, and allows .mjs files.
const r = buildResolver('./lib/file.js', {
  constraints: 'node',
  matchNakedMjs: true,
});

// If there's a file "foo.mjs", this will now work:
r('./foo'); // './foo.mjs'

// Or if we're importing package with a node constraint:
r('node-only'); // '../node-modules/node-only/build-for-node.js'
```
