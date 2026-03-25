# resolve.exports [![CI](https://github.com/lukeed/resolve.exports/workflows/CI/badge.svg)](https://github.com/lukeed/resolve.exports/actions) [![codecov](https://codecov.io/gh/lukeed/resolve.exports/branch/master/graph/badge.svg?token=4P7d4Omw2h)](https://codecov.io/gh/lukeed/resolve.exports)

> A tiny (952b), correct, general-purpose, and configurable `"exports"` and `"imports"` resolver without file-system reliance

***Why?***

Hopefully, this module may serve as a reference point (and/or be used directly) so that the varying tools and bundlers within the ecosystem can share a common approach with one another **as well as** with the native Node.js implementation.

With the push for ESM, we must be _very_ careful and avoid fragmentation. If we, as a community, begin propagating different _dialects_ of the resolution algorithm, then we're headed for deep trouble. It will make supporting (and using) `"exports"` nearly impossible, which may force its abandonment and along with it, its benefits.

Let's have nice things.

## Install

```sh
$ npm install resolve.exports
```

## Usage

> Please see [`/test/`](/test) for examples.

```js
import * as resolve from 'resolve.exports';

// package.json contents
const pkg = {
  "name": "foobar",
  "module": "dist/module.mjs",
  "main": "dist/require.js",
  "imports": {
    "#hash": {
      "import": {
        "browser": "./hash/web.mjs",
        "node": "./hash/node.mjs",
      },
      "default": "./hash/detect.js"
    }
  },
  "exports": {
    ".": {
      "import": "./dist/module.mjs",
      "require": "./dist/require.js"
    },
    "./lite": {
      "worker": {
        "browser": "./lite/worker.brower.js",
        "node": "./lite/worker.node.js"
      },
      "import": "./lite/module.mjs",
      "require": "./lite/require.js"
    }
  }
};

// ---
// Exports
// ---

// entry: "foobar" === "." === default
// conditions: ["default", "import", "node"]
resolve.exports(pkg);
resolve.exports(pkg, '.');
resolve.exports(pkg, 'foobar');
//=> ["./dist/module.mjs"]

// entry: "foobar/lite" === "./lite"
// conditions: ["default", "import", "node"]
resolve.exports(pkg, 'foobar/lite');
resolve.exports(pkg, './lite');
//=> ["./lite/module.mjs"]

// Enable `require` condition
// conditions: ["default", "require", "node"]
resolve.exports(pkg, 'foobar', { require: true }); //=> ["./dist/require.js"]
resolve.exports(pkg, './lite', { require: true }); //=> ["./lite/require.js"]

// Throws "Missing <entry> specifier in <name> package" Error
resolve.exports(pkg, 'foobar/hello');
resolve.exports(pkg, './hello/world');

// Add custom condition(s)
// conditions: ["default", "worker", "import", "node"]
resolve.exports(pkg, 'foobar/lite', {
  conditions: ['worker']
}); //=> ["./lite/worker.node.js"]

// Toggle "browser" condition
// conditions: ["default", "worker", "import", "browser"]
resolve.exports(pkg, 'foobar/lite', {
  conditions: ['worker'],
  browser: true
}); //=> ["./lite/worker.browser.js"]

// Disable non-"default" condition activate
// NOTE: breaks from Node.js default behavior
// conditions: ["default", "custom"]
resolve.exports(pkg, 'foobar/lite', {
  conditions: ['custom'],
  unsafe: true,
});
//=> Error: No known conditions for "./lite" specifier in "foobar" package

// ---
// Imports
// ---

// conditions: ["default", "import", "node"]
resolve.imports(pkg, '#hash');
resolve.imports(pkg, 'foobar/#hash');
//=> ["./hash/node.mjs"]

// conditions: ["default", "import", "browser"]
resolve.imports(pkg, '#hash', { browser: true });
resolve.imports(pkg, 'foobar/#hash');
//=> ["./hash/web.mjs"]

// conditions: ["default"]
resolve.imports(pkg, '#hash', { unsafe: true });
resolve.imports(pkg, 'foobar/#hash');
//=> ["./hash/detect.mjs"]

resolve.imports(pkg, '#hello/world');
resolve.imports(pkg, 'foobar/#hello/world');
//=> Error: Missing "#hello/world" specifier in "foobar" package

// ---
// Legacy
// ---

// prefer "module" > "main" (default)
resolve.legacy(pkg); //=> "dist/module.mjs"

// customize fields order
resolve.legacy(pkg, {
  fields: ['main', 'module']
}); //=> "dist/require.js"
```

## API

The [`resolve()`](#resolvepkg-entry-options), [`exports()`](#exportspkg-entry-options), and [`imports()`](#importspkg-target-options) functions share similar API signatures:

```ts
export function resolve(pkg: Package, entry?: string, options?: Options): string[] | undefined;
export function exports(pkg: Package, entry?: string, options?: Options): string[] | undefined;
export function imports(pkg: Package, target: string, options?: Options): string[] | undefined;
//                                         ^ not optional!
```

All three:
* accept a `package.json` file's contents as a JSON object
* accept a target/entry identifier
* may accept an [Options](#options) object
* return `string[]`, `string`, or `undefined`

The only difference is that `imports()` must accept a target identifier as there can be no inferred default.

See below for further API descriptions.

> **Note:** There is also a [Legacy Resolver API](#legacy-resolver)

---

### resolve(pkg, entry?, options?)
Returns: `string[]` or `undefined`

A convenience helper which automatically reroutes to [`exports()`](#exportspkg-entry-options) or [`imports()`](#importspkg-target-options) depending on the `entry` value.

When unspecified, `entry` defaults to the `"."` identifier, which means that `exports()` will be invoked.

```js
import * as r from 'resolve.exports';

let pkg = {
  name: 'foobar',
  // ...
};

r.resolve(pkg);
//~> r.exports(pkg, '.');

r.resolve(pkg, 'foobar');
//~> r.exports(pkg, '.');

r.resolve(pkg, 'foobar/subpath');
//~> r.exports(pkg, './subpath');

r.resolve(pkg, '#hash/md5');
//~> r.imports(pkg, '#hash/md5');

r.resolve(pkg, 'foobar/#hash/md5');
//~> r.imports(pkg, '#hash/md5');
```

### exports(pkg, entry?, options?)
Returns: `string[]` or `undefined`

Traverse the `"exports"` within the contents of a `package.json` file. <br>
If the contents _does not_ contain an `"exports"` map, then `undefined` will be returned.

Successful resolutions will always result in a `string` or `string[]` value. This will be the value of the resolved mapping itself – which means that the output is a relative file path.

This function may throw an Error if:

* the requested `entry` cannot be resolved (aka, not defined in the `"exports"` map)
* an `entry` _is_ defined but no known conditions were matched (see [`options.conditions`](#optionsconditions))

#### pkg
Type: `object` <br>
Required: `true`

The `package.json` contents.

#### entry
Type: `string` <br>
Required: `false` <br>
Default: `.` (aka, root)

The desired target entry, or the original `import` path.

When `entry` _is not_ a relative path (aka, does not start with `'.'`), then `entry` is given the `'./'` prefix.

When `entry` begins with the package name (determined via the `pkg.name` value), then `entry` is truncated and made relative.

When `entry` is already relative, it is accepted as is.

***Examples***

Assume we have a module named "foobar" and whose `pkg` contains `"name": "foobar"`.

| `entry` value | treated as | reason |
|-|-|-|
| `null` / `undefined` | `'.'` | default |
| `'.'` | `'.'` | value was relative |
| `'foobar'` | `'.'` | value was `pkg.name` |
| `'foobar/lite'` | `'./lite'` | value had `pkg.name` prefix |
| `'./lite'` | `'./lite'` | value was relative |
| `'lite'` | `'./lite'` | value was not relative & did not have `pkg.name` prefix |


### imports(pkg, target, options?)
Returns: `string[]` or `undefined`

Traverse the `"imports"` within the contents of a `package.json` file. <br>
If the contents _does not_ contain an `"imports"` map, then `undefined` will be returned.

Successful resolutions will always result in a `string` or `string[]` value. This will be the value of the resolved mapping itself – which means that the output is a relative file path.

This function may throw an Error if:

* the requested `target` cannot be resolved (aka, not defined in the `"imports"` map)
* an `target` _is_ defined but no known conditions were matched (see [`options.conditions`](#optionsconditions))

#### pkg
Type: `object` <br>
Required: `true`

The `package.json` contents.

#### target
Type: `string` <br>
Required: `true`

The target import identifier; for example, `#hash` or `#hash/md5`.

Import specifiers _must_ begin with the `#` character, as required by the resolution specification. However, if `target` begins with the package name (determined by the `pkg.name` value), then `resolve.exports` will trim it from the `target` identifier. For example, `"foobar/#hash/md5"` will be treated as `"#hash/md5"` for the `"foobar"` package.

## Options

The [`resolve()`](#resolvepkg-entry-options), [`imports()`](#importspkg-target-options), and [`exports()`](#exportspkg-entry-options) functions share these options. All properties are optional and you are not required to pass an `options` argument.

Collectively, the `options` are used to assemble a list of [conditions](https://nodejs.org/docs/latest-v18.x/api/packages.html#conditional-exports) that should be activated while resolving your target(s).

> **Note:** Although the Node.js documentation primarily showcases conditions alongside `"exports"` usage, they also apply to `"imports"` maps too. _([example](https://nodejs.org/docs/latest-v18.x/api/packages.html#subpath-imports))_

#### options.require
Type: `boolean` <br>
Default: `false`

When truthy, the `"require"` field is added to the list of allowed/known conditions. <br>
Otherwise the `"import"` field is added instead.

#### options.browser
Type: `boolean` <br>
Default: `false`

When truthy, the `"browser"` field is added to the list of allowed/known conditions. <br>
Otherwise the `"node"` field is added instead.

#### options.conditions
Type: `string[]` <br>
Default: `[]`

A list of additional/custom conditions that should be accepted when seen.

> **Important:** The order specified within `options.conditions` does not matter. <br>The matching order/priority is **always** determined by the `"exports"` map's key order.

For example, you may choose to accept a `"production"` condition in certain environments. Given the following `pkg` content:

```js
const pkg = {
  // package.json ...
  "exports": {
    "worker": "./$worker.js",
    "require": "./$require.js",
    "production": "./$production.js",
    "import": "./$import.mjs",
  }
};

resolve.exports(pkg, '.');
// Conditions: ["default", "import", "node"]
//=> ["./$import.mjs"]

resolve.exports(pkg, '.', {
  conditions: ['production']
});
// Conditions: ["default", "production", "import", "node"]
//=> ["./$production.js"]

resolve.exports(pkg, '.', {
  conditions: ['production'],
  require: true,
});
// Conditions: ["default", "production", "require", "node"]
//=> ["./$require.js"]

resolve.exports(pkg, '.', {
  conditions: ['production', 'worker'],
  require: true,
});
// Conditions: ["default", "production", "worker", "require", "node"]
//=> ["./$worker.js"]

resolve.exports(pkg, '.', {
  conditions: ['production', 'worker']
});
// Conditions: ["default", "production", "worker", "import", "node"]
//=> ["./$worker.js"]
```

#### options.unsafe
Type: `boolean` <br>
Default: `false`

> **Important:** You probably do not want this option! <br>It will break out of Node's default resolution conditions.

When enabled, this option will ignore **all other options** except [`options.conditions`](#optionsconditions). This is because, when enabled, `options.unsafe` **does not** assume or provide any default conditions except the `"default"` condition.

```js
resolve.exports(pkg, '.');
//=> Conditions: ["default", "import", "node"]

resolve.exports(pkg, '.', { unsafe: true });
//=> Conditions: ["default"]

resolve.exports(pkg, '.', { unsafe: true, require: true, browser: true });
//=> Conditions: ["default"]
```

In other words, this means that trying to use `options.require` or `options.browser` alongside `options.unsafe` will have no effect. In order to enable these conditions, you must provide them manually into the `options.conditions` list:

```js
resolve.exports(pkg, '.', {
  unsafe: true,
  conditions: ["require"]
});
//=> Conditions: ["default", "require"]

resolve.exports(pkg, '.', {
  unsafe: true,
  conditions: ["browser", "require", "custom123"]
});
//=> Conditions: ["default", "browser", "require", "custom123"]
```

## Legacy Resolver

Also included is a "legacy" method for resolving non-`"exports"` package fields. This may be used as a fallback method when for when no `"exports"` mapping is defined. In other words, it's completely optional (and tree-shakeable).

### legacy(pkg, options?)
Returns: `string` or `undefined`

You may customize the field priority via [`options.fields`](#optionsfields).

When a field is found, its value is returned _as written_. <br>
When no fields were found, `undefined` is returned. If you wish to mimic Node.js behavior, you can assume this means `'index.js'` – but this module does not make that assumption for you.

#### options.browser
Type: `boolean` or `string` <br>
Default: `false`

When truthy, ensures that the `'browser'` field is part of the acceptable `fields` list.

> **Important:** If your custom [`options.fields`](#optionsfields) value includes `'browser'`, then _your_ order is respected. <br>Otherwise, when truthy, `options.browser` will move `'browser'` to the front of the list, making it the top priority.

When `true` and `"browser"` is an object, then `legacy()` will return the the entire `"browser"` object.

You may also pass a string value, which will be treated as an import/file path. When this is the case and `"browser"` is an object, then `legacy()` may return:

* `false` – if the package author decided a file should be ignored; or
* your `options.browser` string value – but made relative, if not already

> See the [`"browser" field specification](https://github.com/defunctzombie/package-browser-field-spec) for more information.

#### options.fields
Type: `string[]` <br>
Default: `['module', 'main']`

A list of fields to accept. The order of the array determines the priority/importance of each field, with the most important fields at the beginning of the list.

By default, the `legacy()` method will accept any `"module"` and/or "main" fields if they are defined. However, if both fields are defined, then "module" will be returned.

```js
import { legacy } from 'resolve.exports';

// package.json
const pkg = {
  "name": "...",
  "worker": "worker.js",
  "module": "module.mjs",
  "browser": "browser.js",
  "main": "main.js",
};

legacy(pkg);
// fields = [module, main]
//=> "module.mjs"

legacy(pkg, { browser: true });
// fields = [browser, module, main]
//=> "browser.mjs"

legacy(pkg, {
  fields: ['missing', 'worker', 'module', 'main']
});
// fields = [missing, worker, module, main]
//=> "worker.js"

legacy(pkg, {
  fields: ['missing', 'worker', 'module', 'main'],
  browser: true,
});
// fields = [browser, missing, worker, module, main]
//=> "browser.js"

legacy(pkg, {
  fields: ['module', 'browser', 'main'],
  browser: true,
});
// fields = [module, browser, main]
//=> "module.mjs"
```

## License

MIT © [Luke Edwards](https://lukeed.com)
