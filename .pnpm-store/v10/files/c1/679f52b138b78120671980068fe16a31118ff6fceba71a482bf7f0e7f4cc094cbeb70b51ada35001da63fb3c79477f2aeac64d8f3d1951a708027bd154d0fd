# mlly

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Codecov][codecov-src]][codecov-href]

> Missing [ECMAScript module](https://nodejs.org/api/esm.html) utils for Node.js

While ESM Modules are evolving in Node.js ecosystem, there are still
many required features that are still experimental or missing or needed to support ESM. This package tries to fill in the gap.

## Usage

Install npm package:

```sh
# using yarn
yarn add mlly

# using npm
npm install mlly
```

**Note:** Node.js 14+ is recommended.

Import utils:

```js
// ESM
import {} from "mlly";

// CommonJS
const {} = require("mlly");
```

## Resolving ESM modules

Several utilities to make ESM resolution easier:

- Respecting [ECMAScript Resolver algorithm](https://nodejs.org/dist/latest-v14.x/docs/api/esm.html#esm_resolver_algorithm)
- Exposed from Node.js implementation
- Windows paths normalized
- Supporting custom `extensions` and `/index` resolution
- Supporting custom `conditions`
- Support resolving from multiple paths or urls

### `resolve` / `resolveSync`

Resolve a module by respecting [ECMAScript Resolver algorithm](https://nodejs.org/dist/latest-v14.x/docs/api/esm.html#esm_resolver_algorithm)
(using [wooorm/import-meta-resolve](https://github.com/wooorm/import-meta-resolve)).

Additionally supports resolving without extension and `/index` similar to CommonJS.

```js
import { resolve, resolveSync } from "mlly";

// file:///home/user/project/module.mjs
console.log(await resolve("./module.mjs", { url: import.meta.url }));
```

**Resolve options:**

- `url`: URL or string to resolve from (default is `pwd()`)
- `conditions`: Array of conditions used for resolution algorithm (default is `['node', 'import']`)
- `extensions`: Array of additional extensions to check if import failed (default is `['.mjs', '.cjs', '.js', '.json']`)

### `resolvePath` / `resolvePathSync`

Similar to `resolve` but returns a path instead of URL using `fileURLToPath`.

```js
import { resolvePath, resolveSync } from "mlly";

// /home/user/project/module.mjs
console.log(await resolvePath("./module.mjs", { url: import.meta.url }));
```

### `createResolve`

Create a `resolve` function with defaults.

```js
import { createResolve } from "mlly";

const _resolve = createResolve({ url: import.meta.url });

// file:///home/user/project/module.mjs
console.log(await _resolve("./module.mjs"));
```

**Example:** Ponyfill [import.meta.resolve](https://nodejs.org/api/esm.html#esm_import_meta_resolve_specifier_parent):

```js
import { createResolve } from "mlly";

import.meta.resolve = createResolve({ url: import.meta.url });
```

### `resolveImports`

Resolve all static and dynamic imports with relative paths to full resolved path.

```js
import { resolveImports } from "mlly";

// import foo from 'file:///home/user/project/bar.mjs'
console.log(
  await resolveImports(`import foo from './bar.mjs'`, { url: import.meta.url }),
);
```

## Syntax Analyzes

### `isValidNodeImport`

Using various syntax detection and heuristics, this method can determine if import is a valid import or not to be imported using dynamic `import()` before hitting an error!

When result is `false`, we usually need a to create a CommonJS require context or add specific rules to the bundler to transform dependency.

```js
import { isValidNodeImport } from "mlly";

// If returns true, we are safe to use `import('some-lib')`
await isValidNodeImport("some-lib", {});
```

**Algorithm:**

- Check import protocol - If is `data:` return `true` (✅ valid) - If is not `node:`, `file:` or `data:`, return `false` (
  ❌ invalid)
- Resolve full path of import using Node.js [Resolution algorithm](https://nodejs.org/api/esm.html#resolution-algorithm)
- Check full path extension
  - If is `.mjs`, `.cjs`, `.node` or `.wasm`, return `true` (✅ valid)
  - If is not `.js`, return `false` (❌ invalid)
  - If is matching known mixed syntax (`.esm.js`, `.es.js`, etc) return `false` (
    ❌ invalid)
- Read closest `package.json` file to resolve path
- If `type: 'module'` field is set, return `true` (✅ valid)
- Read source code of resolved path
- Try to detect CommonJS syntax usage
  - If yes, return `true` (✅ valid)
- Try to detect ESM syntax usage
  - if yes, return `false` (
    ❌ invalid)

**Notes:**

- There might be still edge cases algorithm cannot cover. It is designed with best-efforts.
- This method also allows using dynamic import of CommonJS libraries considering
  Node.js has [Interoperability with CommonJS](https://nodejs.org/api/esm.html#interoperability-with-commonjs).

### `hasESMSyntax`

Detect if code, has usage of ESM syntax (Static `import`, ESM `export` and `import.meta` usage)

```js
import { hasESMSyntax } from "mlly";

hasESMSyntax("export default foo = 123"); // true
```

### `hasCJSSyntax`

Detect if code, has usage of CommonJS syntax (`exports`, `module.exports`, `require` and `global` usage)

```js
import { hasCJSSyntax } from "mlly";

hasCJSSyntax("export default foo = 123"); // false
```

### `detectSyntax`

Tests code against both CJS and ESM.

`isMixed` indicates if both are detected! This is a common case with legacy packages exporting semi-compatible ESM syntax meant to be used by bundlers.

```js
import { detectSyntax } from "mlly";

// { hasESM: true, hasCJS: true, isMixed: true }
detectSyntax('export default require("lodash")');
```

## CommonJS Context

### `createCommonJS`

This utility creates a compatible CommonJS context that is missing in ECMAScript modules.

```js
import { createCommonJS } from "mlly";

const { __dirname, __filename, require } = createCommonJS(import.meta.url);
```

Note: `require` and `require.resolve` implementation are lazy functions. [`createRequire`](https://nodejs.org/api/module.html#module_module_createrequire_filename) will be called on first usage.

## Import/Export Analyzes

Tools to quickly analyze ESM syntax and extract static `import`/`export`

- Super fast Regex based implementation
- Handle most edge cases
- Find all static ESM imports
- Find all dynamic ESM imports
- Parse static import statement
- Find all named, declared and default exports

### `findStaticImports`

Find all static ESM imports.

Example:

```js
import { findStaticImports } from "mlly";

console.log(
  findStaticImports(`
// Empty line
import foo, { bar /* foo */ } from 'baz'
`),
);
```

Outputs:

```js
[
  {
    type: "static",
    imports: "foo, { bar /* foo */ } ",
    specifier: "baz",
    code: "import foo, { bar /* foo */ } from 'baz'",
    start: 15,
    end: 55,
  },
];
```

### `parseStaticImport`

Parse a dynamic ESM import statement previously matched by `findStaticImports`.

Example:

```js
import { findStaticImports, parseStaticImport } from "mlly";

const [match0] = findStaticImports(`import baz, { x, y as z } from 'baz'`);
console.log(parseStaticImport(match0));
```

Outputs:

```js
{
  type: 'static',
  imports: 'baz, { x, y as z } ',
  specifier: 'baz',
  code: "import baz, { x, y as z } from 'baz'",
  start: 0,
  end: 36,
  defaultImport: 'baz',
  namespacedImport: undefined,
  namedImports: { x: 'x', y: 'z' }
}
```

### `findDynamicImports`

Find all dynamic ESM imports.

Example:

```js
import { findDynamicImports } from "mlly";

console.log(
  findDynamicImports(`
const foo = await import('bar')
`),
);
```

### `findExports`

```js
import { findExports } from "mlly";

console.log(
  findExports(`
export const foo = 'bar'
export { bar, baz }
export default something
`),
);
```

Outputs:

```js
[
  {
    type: "declaration",
    declaration: "const",
    name: "foo",
    code: "export const foo",
    start: 1,
    end: 17,
  },
  {
    type: "named",
    exports: " bar, baz ",
    code: "export { bar, baz }",
    start: 26,
    end: 45,
    names: ["bar", "baz"],
  },
  { type: "default", code: "export default ", start: 46, end: 61 },
];
```

### `findExportNames`

Same as `findExports` but returns array of export names.

```js
import { findExportNames } from "mlly";

// [ "foo", "bar", "baz", "default" ]
console.log(
  findExportNames(`
export const foo = 'bar'
export { bar, baz }
export default something
`),
);
```

## `resolveModuleExportNames`

Resolves module and reads its contents to extract possible export names using static analyzes.

```js
import { resolveModuleExportNames } from "mlly";

// ["basename", "dirname", ... ]
console.log(await resolveModuleExportNames("mlly"));
```

## Evaluating Modules

Set of utilities to evaluate ESM modules using `data:` imports

- Automatic import rewrite to resolved path using static analyzes
- Allow bypass ESM Cache
- Stack-trace support
- `.json` loader

### `evalModule`

Transform and evaluates module code using dynamic imports.

```js
import { evalModule } from "mlly";

await evalModule(`console.log("Hello World!")`);

await evalModule(
  `
  import { reverse } from './utils.mjs'
  console.log(reverse('!emosewa si sj'))
`,
  { url: import.meta.url },
);
```

**Options:**

- all `resolve` options
- `url`: File URL

### `loadModule`

Dynamically loads a module by evaluating source code.

```js
import { loadModule } from "mlly";

await loadModule("./hello.mjs", { url: import.meta.url });
```

Options are same as `evalModule`.

### `transformModule`

- Resolves all relative imports will be resolved
- All usages of `import.meta.url` will be replaced with `url` or `from` option

```js
import { transformModule } from "mlly";
console.log(transformModule(`console.log(import.meta.url)`), {
  url: "test.mjs",
});
```

Options are same as `evalModule`.

## Other Utils

### `fileURLToPath`

Similar to [url.fileURLToPath](https://nodejs.org/api/url.html#url_url_fileurltopath_url) but also converts windows backslash `\` to unix slash `/` and handles if input is already a path.

```js
import { fileURLToPath } from "mlly";

// /foo/bar.js
console.log(fileURLToPath("file:///foo/bar.js"));

// C:/path
console.log(fileURLToPath("file:///C:/path/"));
```

### `pathToFileURL`

Similar to [url.pathToFileURL](https://nodejs.org/api/url.html#urlpathtofileurlpath) but also handles `URL` input and returns a **string** with `file://` protocol.

```js
import { pathToFileURL } from "mlly";

// /foo/bar.js
console.log(pathToFileURL("foo/bar.js"));

// C:/path
console.log(pathToFileURL("C:\\path"));
```

### `normalizeid`

Ensures id has either of `node:`, `data:`, `http:`, `https:` or `file:` protocols.

```js
import { ensureProtocol } from "mlly";

// file:///foo/bar.js
console.log(normalizeid("/foo/bar.js"));
```

### `loadURL`

Read source contents of a URL. (currently only file protocol supported)

```js
import { resolve, loadURL } from "mlly";

const url = await resolve("./index.mjs", { url: import.meta.url });
console.log(await loadURL(url));
```

### `toDataURL`

Convert code to [`data:`](https://nodejs.org/api/esm.html#esm_data_imports) URL using base64 encoding.

```js
import { toDataURL } from "mlly";

console.log(
  toDataURL(`
  // This is an example
  console.log('Hello world')
`),
);
```

### `interopDefault`

Return the default export of a module at the top-level, alongside any other named exports.

```js
// Assuming the shape { default: { foo: 'bar' }, baz: 'qux' }
import myModule from "my-module";

// Returns { foo: 'bar', baz: 'qux' }
console.log(interopDefault(myModule));
```

**Options:**

- `preferNamespace`: In case that `default` value exists but is not extendable (when is string for example), return input as-is (default is `false`, meaning `default`'s value is prefered even if cannot be extended)

### `sanitizeURIComponent`

Replace reserved characters from a segment of URI to make it compatible with [rfc2396](https://datatracker.ietf.org/doc/html/rfc2396).

```js
import { sanitizeURIComponent } from "mlly";

// foo_bar
console.log(sanitizeURIComponent(`foo:bar`));
```

### `sanitizeFilePath`

Sanitize each path of a file name or path with `sanitizeURIComponent` for URI compatibility.

```js
import { sanitizeFilePath } from "mlly";

// C:/te_st/_...slug_.jsx'
console.log(sanitizeFilePath("C:\\te#st\\[...slug].jsx"));
```

### `parseNodeModulePath`

Parses an absolute file path in `node_modules` to three segments:

- `dir`: Path to main directory of package
- `name`: Package name
- `subpath`: The optional package subpath

It returns an empty object (with partial keys) if parsing fails.

```js
import { parseNodeModulePath } from "mlly";

// dir: "/src/a/node_modules/"
// name: "lib"
// subpath: "./dist/index.mjs"
const { dir, name, subpath } = parseNodeModulePath(
  "/src/a/node_modules/lib/dist/index.mjs",
);
```

### `lookupNodeModuleSubpath`

Parses an absolute file path in `node_modules` and tries to reverse lookup (or guess) the original package exports subpath for it.

```js
import { lookupNodeModuleSubpath } from "mlly";

// subpath: "./utils"
const subpath = lookupNodeModuleSubpath(
  "/src/a/node_modules/lib/dist/utils.mjs",
);
```

## License

[MIT](./LICENSE) - Made with 💛

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/mlly?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/mlly
[npm-downloads-src]: https://img.shields.io/npm/dm/mlly?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/mlly
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/mlly/main?style=flat&colorA=18181B&colorB=F0DB4F
[codecov-href]: https://codecov.io/gh/unjs/mlly
