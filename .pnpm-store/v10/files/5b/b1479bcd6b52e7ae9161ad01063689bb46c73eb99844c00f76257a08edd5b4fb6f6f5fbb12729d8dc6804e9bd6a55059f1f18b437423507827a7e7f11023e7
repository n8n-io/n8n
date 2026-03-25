# 🧀 Magicast

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![Codecov][codecov-src]][codecov-href]
[![License][license-src]][license-href]
[![JSDocs][jsdocs-src]][jsdocs-href]

Programmatically modify JavaScript and TypeScript source codes with a simplified, elegant and familiar syntax. Built on top of the [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) parsed by [recast](https://github.com/benjamn/recast) and [babel](https://babeljs.io/).

❯ 🧙🏼 **Magical** modify a JS/TS file and write back magically just like JSON!<br>
❯ 🔀 **Exports/Import** manipulate module's imports and exports at ease<br>
❯ 💼 **Function Arguments** easily manipulate arguments passed to a function call, like `defineConfig()`<br>
❯ 🎨 **Smart Formatting** preseves the formatting style (quotes, tabs, etc.) from the original code<br>
❯ 🧑‍💻 **Readable** get rid of the complexity of AST manipulation and make your code super readable<br>

## Install

Install npm package:

```sh
# using yarn
yarn add --dev magicast

# using npm
npm install -D magicast

# using pnpm
pnpm add -D magicast
```

Import utilities:

```js
// ESM / Bundler
import { parseModule, generateCode, builders, createNode } from "magicast";

// CommonJS
const { parseModule, generateCode, builders, createNode } = require("magicast");
```

## Examples

**Example:** Modify a file:

`config.js`:

```js
export default {
  foo: ["a"],
};
```

Code to modify and append `b` to `foo` prop of defaultExport:

```js
import { loadFile, writeFile } from "magicast";

const mod = await loadFile("config.js");

mod.exports.default.foo.push("b");

await writeFile(mod, "config.js");
```

Updated `config.js`:

```js
export default {
  foo: ["a", "b"],
};
```

**Example:** Directly use AST utils:

```js
import { parseModule, generateCode } from "magicast";

// Parse to AST
const mod = parseModule(`export default { }`);

// Ensure foo is an array
mod.exports.default.foo ||= [];
// Add a new array member
mod.exports.default.foo.push("b");
mod.exports.default.foo.unshift("a");

// Generate code
const { code, map } = generateCode(mod);
```

Generated code:

```js
export default {
  foo: ["a", "b"],
};
```

**Example:** Get the AST directly:

```js
import { parseModule, generateCode } from "magicast";

const mod = parseModule(`export default { }`);

const ast = mod.exports.default.$ast;
// do something with ast
```

**Example:** Function arguments:

```js
import { parseModule, generateCode } from "magicast";

const mod = parseModule(`export default defineConfig({ foo: 'bar' })`);

// Support for both bare object export and `defineConfig` wrapper
const options =
  mod.exports.default.$type === "function-call"
    ? mod.exports.default.$args[0]
    : mod.exports.default;

console.log(options.foo); // bar
```

**Example:** Create a function call:

```js
import { parseModule, generateCode, builders } from "magicast";

const mod = parseModule(`export default {}`);

const options = (mod.exports.default.list = builders.functionCall(
  "create",
  [1, 2, 3],
));

console.log(mod.generateCode()); // export default { list: create([1, 2, 3]) }
```

## Notes

As JavaScript is a very dynamic language, you should be aware that Magicast's convention **CAN NOT cover all possible cases**. Magicast serves as a simple and maintainable interface to update static-ish JavaScript code. When interacting with Magicast node, be aware that every option might have chance to throw an error depending on the input code. We recommend to always wrap the code in a `try/catch` block (even better to do some defensive coding), for example:

```ts
import { loadFile, writeFile } from "magicast";

function updateConfig() {
  try {
    const mod = await loadFile("config.js");

    mod.exports.default.foo.push("b");

    await writeFile(mod);
  } catch {
    console.error("Unable to update config.js");
    console.error(
      "Please update it manually with the following instructions: ...",
    );
    // handle error
  }
}
```

## High Level Helpers

We also experiment to provide a few high level helpers to make common tasks easier. You could import them from `magicast/helpers`. They might be moved to a separate package in the future.

```js
import {
  deepMergeObject,
  addNuxtModule,
  addVitePlugin,
  // ...
} from "magicast/helpers";
```

We recommend to check out the [source code](./src/helpers) and [test cases](./test/helpers) for more details.

## Development

- Clone this repository
- Install latest LTS version of [Node.js](https://nodejs.org/en/)
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

## License

Made with 💛

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/magicast?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/magicast
[npm-downloads-src]: https://img.shields.io/npm/dm/magicast?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/magicast
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/magicast/main?style=flat&colorA=18181B&colorB=F0DB4F
[codecov-href]: https://codecov.io/gh/unjs/magicast
[bundle-src]: https://img.shields.io/bundlephobia/minzip/magicast?style=flat&colorA=18181B&colorB=F0DB4F
[bundle-href]: https://bundlephobia.com/result?p=magicast
[license-src]: https://img.shields.io/github/license/unjs/magicast.svg?style=flat&colorA=18181B&colorB=F0DB4F
[license-href]: https://github.com/unjs/magicast/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsDocs.io-reference-18181B?style=flat&colorA=18181B&colorB=F0DB4F
[jsdocs-href]: https://www.jsdocs.io/package/magicast
