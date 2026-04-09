# vue

## Which dist file to use?

### From CDN or without a Bundler

- **`vue(.runtime).global(.prod).js`**:
  - For direct use via `<script src="...">` in the browser. Exposes the `Vue` global.
  - Note that global builds are not [UMD](https://github.com/umdjs/umd) builds. They are built as [IIFEs](https://developer.mozilla.org/en-US/docs/Glossary/IIFE) and are only meant for direct use via `<script src="...">`.
  - In-browser template compilation:
    - **`vue.global.js`** is the "full" build that includes both the compiler and the runtime so it supports compiling templates on the fly.
    - **`vue.runtime.global.js`** contains only the runtime and requires templates to be pre-compiled during a build step.
  - Inlines all Vue core internal packages - i.e. it's a single file with no dependencies on other files. This means you **must** import everything from this file and this file only to ensure you are getting the same instance of code.
  - Contains hard-coded prod/dev branches, and the prod build is pre-minified. Use the `*.prod.js` files for production.

- **`vue(.runtime).esm-browser(.prod).js`**:
  - For usage via native ES modules imports (in browser via `<script type="module">`).
  - Shares the same runtime compilation, dependency inlining and hard-coded prod/dev behavior with the global build.

### With a Bundler

- **`vue(.runtime).esm-bundler.js`**:
  - For use with bundlers like `webpack`, `rollup` and `parcel`.
  - Leaves prod/dev branches with `process.env.NODE_ENV` guards (must be replaced by bundler)
  - Does not ship minified builds (to be done together with the rest of the code after bundling)
  - Imports dependencies (e.g. `@vue/runtime-core`, `@vue/compiler-core`)
    - Imported dependencies are also `esm-bundler` builds and will in turn import their dependencies (e.g. `@vue/runtime-core` imports `@vue/reactivity`)
    - This means you **can** install/import these deps individually without ending up with different instances of these dependencies, but you must make sure they all resolve to the same version.
  - In-browser template compilation:
    - **`vue.runtime.esm-bundler.js` (default)** is runtime only, and requires all templates to be pre-compiled. This is the default entry for bundlers (via `module` field in `package.json`) because when using a bundler templates are typically pre-compiled (e.g. in `*.vue` files).
    - **`vue.esm-bundler.js`**: includes the runtime compiler. Use this if you are using a bundler but still want runtime template compilation (e.g. in-DOM templates or templates via inline JavaScript strings). You will need to configure your bundler to alias `vue` to this file.

#### Bundler Build Feature Flags

[Detailed Reference on vuejs.org](https://vuejs.org/api/compile-time-flags.html)

`esm-bundler` builds of Vue expose global feature flags that can be overwritten at compile time:

- `__VUE_OPTIONS_API__`
  - Default: `true`
  - Enable / disable Options API support

- `__VUE_PROD_DEVTOOLS__`
  - Default: `false`
  - Enable / disable devtools support in production

- `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__`
  - Default: `false`
  - Enable / disable detailed warnings for hydration mismatches in production

The build will work without configuring these flags, however it is **strongly recommended** to properly configure them in order to get proper tree-shaking in the final bundle.

### For Server-Side Rendering

- **`vue.cjs(.prod).js`**:
  - For use in Node.js server-side rendering via `require()`.
  - If you bundle your app with webpack with `target: 'node'` and properly externalize `vue`, this is the build that will be loaded.
  - The dev/prod files are pre-built, but the appropriate file is automatically required based on `process.env.NODE_ENV`.
