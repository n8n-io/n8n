# ESLintRC Library

This repository contains the legacy ESLintRC configuration file format for ESLint. This package is not intended for use outside of the ESLint ecosystem. It is ESLint-specific and not intended for use in other programs.

**Note:** This package is frozen except for critical bug fixes as ESLint moves to a new config system.

## Installation

You can install the package as follows:

```shell
npm install @eslint/eslintrc -D
# or
yarn add @eslint/eslintrc -D
# or
pnpm install @eslint/eslintrc -D
# or
bun install @eslint/eslintrc -D
```

## Usage (ESM)

The primary class in this package is `FlatCompat`, which is a utility to translate ESLintRC-style configs into flat configs. Here's how you use it inside of your `eslint.config.js` file:

```js
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "path";
import { fileURLToPath } from "url";

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,                  // optional; default: process.cwd()
    resolvePluginsRelativeTo: __dirname,       // optional
    recommendedConfig: js.configs.recommended, // optional unless you're using "eslint:recommended"
    allConfig: js.configs.all,                 // optional unless you're using "eslint:all"
});

export default [

    // mimic ESLintRC-style extends
    ...compat.extends("standard", "example", "plugin:react/recommended"),

    // mimic environments
    ...compat.env({
        es2020: true,
        node: true
    }),

    // mimic plugins
    ...compat.plugins("jsx-a11y", "react"),

    // translate an entire config
    ...compat.config({
        plugins: ["jsx-a11y", "react"],
        extends: "standard",
        env: {
            es2020: true,
            node: true
        },
        rules: {
            semi: "error"
        }
    })
];
```

## Usage (CommonJS)

Using `FlatCompat` in CommonJS files is similar to ESM, but you'll use `require()` and `module.exports` instead of `import` and `export`. Here's how you use it inside of your `eslint.config.js` CommonJS file:

```js
const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
    baseDirectory: __dirname,                  // optional; default: process.cwd()
    resolvePluginsRelativeTo: __dirname,       // optional
    recommendedConfig: js.configs.recommended, // optional unless using "eslint:recommended"
    allConfig: js.configs.all,                 // optional unless using "eslint:all"
});

module.exports = [

    // mimic ESLintRC-style extends
    ...compat.extends("standard", "example", "plugin:react/recommended"),

    // mimic environments
    ...compat.env({
        es2020: true,
        node: true
    }),

    // mimic plugins
    ...compat.plugins("jsx-a11y", "react"),

    // translate an entire config
    ...compat.config({
        plugins: ["jsx-a11y", "react"],
        extends: "standard",
        env: {
            es2020: true,
            node: true
        },
        rules: {
            semi: "error"
        }
    })
];
```

## Troubleshooting

**TypeError: Missing parameter 'recommendedConfig' in FlatCompat constructor**

The `recommendedConfig` option is required when any config uses `eslint:recommended`, including any config in an `extends` clause. To fix this, follow the example above using `@eslint/js` to provide the `eslint:recommended` config.

**TypeError: Missing parameter 'allConfig' in FlatCompat constructor**

The `allConfig` option is required when any config uses `eslint:all`, including any config in an `extends` clause. To fix this, follow the example above using `@eslint/js` to provide the `eslint:all` config.


## License

MIT License
