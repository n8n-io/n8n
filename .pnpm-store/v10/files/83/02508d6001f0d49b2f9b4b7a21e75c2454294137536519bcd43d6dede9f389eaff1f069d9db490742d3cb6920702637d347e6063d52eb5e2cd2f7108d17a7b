# vue-i18n

Internationalization plugin for Vue.js

## Which dist file to use?

### From CDN or without a Bundler

- **`vue-i18n(.runtime).global(.prod).js`**:

  - For direct use via `<script src="...">` in the browser. Exposes the `VueI18n` global
  - Note that global builds are not [UMD](https://github.com/umdjs/umd) builds. They are built as [IIFEs](https://developer.mozilla.org/en-US/docs/Glossary/IIFE) and is only meant for direct use via `<script src="...">`
  - In-browser locale messages compilation:
    - **`vue-i18n.global.js`** is the "full" build that includes both the compiler and the runtime so it supports compiling locale messages on the fly
    - **`vue-i18n.runtime.global.js`** contains only the runtime and requires locale messages to be pre-compiled during a build step
  - Inlines internal the bellow packages - i.e. it’s a single file with no dependencies on other files. This means you **must** import everything from this file and this file only to ensure you are getting the same instance of code
    - `@intlify/shared`
    - `@intlify/message-compiler`
    - `@intlify/core`
  - Contains hard-coded prod/dev branches, and the prod build is pre-minified. Use the `*.prod.js` files for production

- **`vue-i18n(.runtime).esm-browser(.prod).js`**:
  - For usage via native ES modules imports (in browser via `<script type="module">`)
  - Shares the same runtime compilation, dependency inlining and hard-coded prod/dev behavior with the global build

### With a Bundler

- **`vue-i18n(.runtime).esm-bundler.js`**:
  - For use with bundlers like `webpack`, `rollup` and `parcel`
  - Leaves prod/dev branches with `process.env.NODE_ENV` guards (must be replaced by bundler)
  - Does not ship minified builds (to be done together with the rest of the code after bundling)
  - Imports dependencies (e.g. `@intlify/core-base`, `@intlify/message-compiler`)
    - Imported dependencies are also `esm-bundler` builds and will in turn import their dependencies (e.g. `@intlify/message-compiler` imports `@intlify/shared`)
    - This means you **can** install/import these deps individually without ending up with different instances of these dependencies, but you must make sure they all resolve to the same version
  - In-browser locale messages compilation:
    - **`vue-i18n.runtime.esm-bundler.js` (default)** is runtime only, and requires all locale messages to be pre-compiled. This is the default entry for bundlers (via `module` field in `package.json`) because when using a bundler templates are typically pre-compiled (e.g. in `*.json` files)
    - **`vue-i18n.esm-bundler.js`**: includes the runtime compiler. Use this if you are using a bundler but still want locale messages compilation (e.g. templates via inline JavaScript strings)

### For Node.js (Server-Side)

- **`vue-i18n.cjs(.prod).js`**:
  - For CommonJS usage in Node.js
  - For use in Node.js via `require()`
  - If you bundle your app with webpack with `target: 'node'` and properly externalize `vue-i18n`, this is the build that will be loaded
  - The dev/prod files are pre-built, but the appropriate file is automatically required based on `process.env.NODE_ENV`

- **`vue-i18n(.runtime).node.mjs`**:
  - For ES Moudles usage in Node.js
  - For use in Node.js via `import`
  - The dev/prod files are pre-built, but the appropriate file is automatically required based on `process.env.NODE_ENV`
  - This module is proxy module of `vue-i18n(.runtime).mjs`
    - **`vue-i18n.runtime.node.mjs`**: is runtime only
    - **`vue-i18n.node.mjs`**: includes the runtime compiler

> NOTE: ES Modules will be the future of the Node.js module system. The `vue-i18n.cjs(.prod).js` will be deprecated in the future. We recommend you would use `vue-i18n(.runtime).node.mjs`. 9.3+


## For Bundler feature flags

### Build Feature Flags

The `esm-bundler` builds now exposes global feature flags that can be overwritten at compile time:

- `__VUE_I18N_FULL_INSTALL__` (enable/disable, in addition to vue-i18n APIs, components and directives all fully support installation: `true`)
- `__VUE_I18N_LEGACY_API__` (enable/disable vue-i18n legacy style APIs support, default: `true`)
- `__INTLIFY_DROP_MESSAGE_COMPILER__`  (enable/disable whether to tree-shake message compiler when we will be bundling)

The build will work without configuring these flags, however it is **strongly recommended** to properly configure them in order to get proper tree shaking in the final bundle. To configure these flags:

- webpack: use [DefinePlugin](https://webpack.js.org/plugins/define-plugin/)
- Rollup: use [@rollup/plugin-replace](https://github.com/rollup/plugins/tree/master/packages/replace)
- Vite: configured by default, but can be overwritten using the [`define` option](https://github.com/vitejs/vite/blob/a4133c073e640b17276b2de6e91a6857bdf382e1/src/node/config.ts#L72-L76)

Note: the replacement value **must be boolean literals** and cannot be strings, otherwise the bundler/minifier will not be able to properly evaluate the conditions.

## ©️ License

[MIT](http://opensource.org/licenses/MIT)
