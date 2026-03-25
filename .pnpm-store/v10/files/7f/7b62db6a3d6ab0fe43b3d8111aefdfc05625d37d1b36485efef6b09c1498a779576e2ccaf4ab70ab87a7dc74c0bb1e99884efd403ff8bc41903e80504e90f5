[![Tests](https://github.com/samthor/esm-resolve/workflows/Tests/badge.svg)](https://github.com/samthor/esm-resolve/actions)

An ESM import resolver for Node written in pure JS.
This is written to be part of an [ESM dev server](https://github.com/samthor/dhost) or build process, as Node's import process is impossible to introspect.
It also allows some cases which would otherwise be failures.

## Usage

Install and import "esm-resolve" via your favourite package manager.
Create a resolver based on the importing file.

```js
import buildResolver from 'esm-resolve';

const r = buildResolver('./path/to/js/file.js');

r('./relative');             // './relative.js'
r('foo-test-package-name');  // './node_modules/foo-test-package-name/index.js'
```

Resolution logic is actually the same for any files in the same directory, so resolver objects can be reused (and they have a small bit of cache).

## Notes

This implements modern Node resolution, i.e., [subpath exports](https://nodejs.org/api/packages.html#packages_subpath_exports) and [conditional exports](https://nodejs.org/api/packages.html#packages_conditional_exports).
By default, it will rewrite to the "browser", "import" or "default" keys (not "node", as it's expected that you'll use this for browser builds).

It fails gracefully in many ways, including falling back to real paths if exports aren't defined.
It will also remove imports that point purely to ".d.ts" files (you don't need to create [peer JS](https://whistlr.info/2021/check-js-with-ts/#import-your-types)).

You can [configure all these options](./types/external.d.ts) via the resolver's second argument, e.g.:

```js
// Resolves for Node, and allows .mjs files.
const r = buildResolver('./path/to/js/file.js', {
  constraints: 'node',
  matchNakedMjs: true,
});

// If there's a file "foo.mjs", this will now work:
r('./foo');                  // './foo.mjs'

// Or if we're importing package with a node constraint:
r('node-only');              // './node-modules/node-only/build-for-node.js'
```