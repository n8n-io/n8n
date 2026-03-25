# @vitejs/plugin-legacy [![npm](https://img.shields.io/npm/v/@vitejs/plugin-legacy.svg)](https://npmjs.com/package/@vitejs/plugin-legacy)

Vite's default browser support baseline is [Native ESM](https://caniuse.com/es6-module), [native ESM dynamic import](https://caniuse.com/es6-module-dynamic-import), and [`import.meta`](https://caniuse.com/mdn-javascript_operators_import_meta). This plugin provides support for legacy browsers that do not support those features when building for production.

By default, this plugin will:

- Generate a corresponding legacy chunk for every chunk in the final bundle, transformed with [@babel/preset-env](https://babeljs.io/docs/en/babel-preset-env) and emitted as [SystemJS modules](https://github.com/systemjs/systemjs) (code splitting is still supported!).

- Generate a polyfill chunk including SystemJS runtime, and any necessary polyfills determined by specified browser targets and **actual usage** in the bundle.

- Inject `<script nomodule>` tags into generated HTML to conditionally load the polyfills and legacy bundle only in browsers without widely-available features support.

- Inject the `import.meta.env.LEGACY` env variable, which will only be `true` in the legacy production build, and `false` in all other cases.

## Usage

```js
// vite.config.js
import legacy from '@vitejs/plugin-legacy'

export default {
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
}
```

Terser must be installed because plugin-legacy uses Terser for minification.

```sh
npm add -D terser
```

## Options

### `targets`

- **Type:** `string | string[] | { [key: string]: string }`
- **Default:** [`'last 2 versions and not dead, > 0.3%, Firefox ESR'`](https://browsersl.ist/#q=last+2+versions+and+not+dead%2C+%3E+0.3%25%2C+Firefox+ESR)

  It's passed on to [`@babel/preset-env`](https://babeljs.io/docs/en/babel-preset-env#targets) when rendering **legacy chunks**.

  The query is also [Browserslist compatible](https://github.com/browserslist/browserslist). See [Browserslist Best Practices](https://github.com/browserslist/browserslist#best-practices) for more details.

  If it's not set, plugin-legacy will load [the browserslist config sources](https://github.com/browserslist/browserslist#queries) and then fallback to the default value.

### `modernTargets`

- **Type:** `string | string[]`
- **Default:** [`'edge>=79, firefox>=67, chrome>=64, safari>=12, chromeAndroid>=64, iOS>=12'`](https://browsersl.ist/#q=edge%3E%3D79%2C+firefox%3E%3D67%2C+chrome%3E%3D64%2C+safari%3E%3D12%2C+chromeAndroid%3E%3D64%2C+iOS%3E%3D12)

  It's passed on to [`@babel/preset-env`](https://babeljs.io/docs/en/babel-preset-env#targets) when collecting polyfills for **modern chunks**. The value set here will override the `build.target` option.

  The query is also [Browserslist compatible](https://github.com/browserslist/browserslist). See [Browserslist Best Practices](https://github.com/browserslist/browserslist#best-practices) for more details.

  If it's not set, plugin-legacy will fallback to the default value.

  Note that this options should not be set unless `renderLegacyChunks` is set to `false`.

### `polyfills`

- **Type:** `boolean | string[]`
- **Default:** `true`

  By default, a polyfills chunk is generated based on the target browser ranges and actual usage in the final bundle (detected via `@babel/preset-env`'s `useBuiltIns: 'usage'`).

  Set to a list of strings to explicitly control which polyfills to include. See [Polyfill Specifiers](#polyfill-specifiers) for details.

  Set to `false` to avoid generating polyfills and handle it yourself (will still generate legacy chunks with syntax transformations).

### `additionalLegacyPolyfills`

- **Type:** `string[]`

  Add custom imports to the legacy polyfills chunk. Since the usage-based polyfill detection only covers ES language features, it may be necessary to manually specify additional DOM API polyfills using this option.

### `additionalModernPolyfills`

- **Type:** `string[]`

  Add custom imports to the modern polyfills chunk. Since the usage-based polyfill detection only covers ES language features, it may be necessary to manually specify additional DOM API polyfills using this option.

### `modernPolyfills`

- **Type:** `boolean | string[]`
- **Default:** `false`

  Defaults to `false`. Enabling this option will generate a separate polyfills chunk for the modern build (targeting [browsers that support widely-available features](#browsers-that-supports-esm-but-does-not-support-widely-available-features)).

  Set to a list of strings to explicitly control which polyfills to include. See [Polyfill Specifiers](#polyfill-specifiers) for details.

  If `modernTargets` is not set, it is **not recommended** to use the `true` value (which uses auto-detection) because `core-js@3` is very aggressive in polyfill inclusions due to all the bleeding edge features it supports. Even when targeting native ESM support, it injects 15kb of polyfills!

  If you don't have hard reliance on bleeding edge runtime features, it is not that hard to avoid having to use polyfills in the modern build altogether. Alternatively, consider setting `modernTargets` or using an on-demand service like https://cdnjs.cloudflare.com/polyfill/ to only inject necessary polyfills based on actual browser user-agents (most modern browsers will need nothing!).

### `renderLegacyChunks`

- **Type:** `boolean`
- **Default:** `true`

  Set to `false` to disable legacy chunks. This is only useful if you are using `modernPolyfills`, which essentially allows you to use this plugin for injecting polyfills to the modern build only:

  ```js
  import legacy from '@vitejs/plugin-legacy'

  export default {
    plugins: [
      legacy({
        modernPolyfills: [
          /* ... */
        ],
        renderLegacyChunks: false,
      }),
    ],
  }
  ```

### `externalSystemJS`

- **Type:** `boolean`
- **Default:** `false`

  Defaults to `false`. Enabling this option will exclude `systemjs/dist/s.min.js` inside polyfills-legacy chunk.

### `renderModernChunks`

- **Type:** `boolean`
- **Default:** `true`

  Set to `false` to only output the legacy bundles that support all target browsers.

  This is also useful when running the project locally using `file:` protocol, as loading modern chunks with `type="module"` may trigger CORS restrictions. To avoid this issue, simply set `renderModernChunks` to `false` to exclusively use legacy chunks instead.

## Browsers that supports ESM but does not support widely-available features

The legacy plugin offers a way to use widely-available features natively in the modern build, while falling back to the legacy build in browsers with native ESM but without those features supported (e.g. Legacy Edge). This feature works by injecting a runtime check and loading the legacy bundle with SystemJs runtime if needed. There are the following drawbacks:

- Modern bundle is downloaded in all ESM browsers
- Modern bundle throws `SyntaxError` in browsers without those features support

The following syntax are considered as widely-available:

- dynamic import
- `import.meta`
- async generator

## Polyfill Specifiers

Polyfill specifier strings for `polyfills` and `modernPolyfills` can be either of the following:

- Any [`core-js` 3 sub import paths](https://unpkg.com/browse/core-js@latest/) - e.g. `es/map` will import `core-js/es/map`

- Any [individual `core-js` 3 modules](https://unpkg.com/browse/core-js@latest/modules/) - e.g. `es.array.iterator` will import `core-js/modules/es.array.iterator.js`

**Example**

```js
import legacy from '@vitejs/plugin-legacy'

export default {
  plugins: [
    legacy({
      polyfills: ['es.promise.finally', 'es/map', 'es/set'],
      modernPolyfills: ['es.promise.finally'],
    }),
  ],
}
```

## Content Security Policy

The legacy plugin requires inline scripts for [Safari 10.1 `nomodule` fix](https://gist.github.com/samthor/64b114e4a4f539915a95b91ffd340acc), SystemJS initialization, and dynamic import fallback. If you have a strict CSP policy requirement, you will need to [add the corresponding hashes to your `script-src` list](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe_inline_script).

The hash values (without the `sha256-` prefix) can be retrieved via:

```js
import { cspHashes } from '@vitejs/plugin-legacy'
```

The current values are:

- `sha256-MS6/3FCg4WjP9gwgaBGwLpRCY6fZBgwmhVCdrPrNf3E=`
- `sha256-tQjf8gvb2ROOMapIxFvFAYBeUJ0v1HCbOcSmDNXGtDo=`
- `sha256-ZxAi3a7m9Mzbc+Z1LGuCCK5Xee6reDkEPRas66H9KSo=`
- `sha256-+5XkZFazzJo8n0iOP4ti/cLCMUudTf//Mzkb7xNPXIc=`

<!--
Run `node --input-type=module -e "import {cspHashes} from '@vitejs/plugin-legacy'; console.log(cspHashes.map(h => 'sha256-'+h))"` to retrieve the value.
-->

Note that these values could change between minor versions. Thus, we recommend generating the CSP header from the exported `cspHashes` variable. If you copy the values manually, then you should pin the minor version using `~`.

When using the `regenerator-runtime` polyfill, it will attempt to use the `globalThis` object to register itself. If `globalThis` is not available (it is [fairly new](https://caniuse.com/?search=globalThis) and not widely supported, including IE 11), it attempts to perform dynamic `Function(...)` call which violates the CSP. To avoid dynamic `eval` in the absence of `globalThis` consider adding `core-js/proposals/global-this` to `additionalLegacyPolyfills` to define it.

## References

- [Vue CLI modern mode](https://cli.vuejs.org/guide/browser-compatibility.html#modern-mode)
- [Using Native JavaScript Modules in Production Today](https://philipwalton.com/articles/using-native-javascript-modules-in-production-today/)
- [rollup-native-modules-boilerplate](https://github.com/philipwalton/rollup-native-modules-boilerplate)
