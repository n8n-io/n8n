# vite-plugin-static-copy

[![npm version](https://badge.fury.io/js/vite-plugin-static-copy.svg)](https://badge.fury.io/js/vite-plugin-static-copy) ![CI](https://github.com/sapphi-red/vite-plugin-static-copy/workflows/CI/badge.svg) [![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)

`rollup-plugin-copy` for Vite with dev server support.

> [!NOTE]
> Before you use this plugin, consider using [public directory](https://vitejs.dev/guide/assets.html#the-public-directory) or [`import` in JavaScript](https://vitejs.dev/guide/features.html#static-assets).
> In most cases, these will work.

## Install

```shell
npm i -D vite-plugin-static-copy # yarn add -D vite-plugin-static-copy
```

## Usage

Add `viteStaticCopy` plugin to `vite.config.js` / `vite.config.ts`.

```js
// vite.config.js / vite.config.ts
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default {
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'bin/example.wasm',
          dest: 'wasm-files'
        }
      ]
    })
  ]
}
```

For example, if you use the config above, you will be able to fetch `bin/example.wasm` with `fetch('/wasm-files/example.wasm')`.
So the file will be copied to `dist/wasm-files/example.wasm`.

> [!WARNING]
>
> If you are using Windows, make sure to use `normalizePath` after doing `path.resolve` or else.
> `\` is a escape charactor in `fast-glob` and you should use `/`.
>
> ```js
> import { normalizePath } from 'vite'
> import path from 'node:path'
>
> normalizePath(path.resolve(__dirname, './foo')) // C:/project/foo
>
> // instead of
> path.resolve(__dirname, './foo') // C:\project\foo
> ```
>
> See [`fast-glob` documentation about this](https://github.com/mrmlnc/fast-glob#how-to-write-patterns-on-windows) for more details.

### Options

See [options.ts](https://github.com/sapphi-red/vite-plugin-static-copy/blob/main/src/options.ts).

## Differences with `rollup-plugin-copy`

- Faster dev server start-up than using `rollup-plugin-copy` on `buildStart` hook.
  - Files are not copied and served directly from the server during dev to reduce start-up time.
- `dest` is relative to [`build.outDir`](https://vitejs.dev/config/build-options.html#build-outdir).
  - If you are going to copy files outside `build.outDir`, you could use `rollup-plugin-copy` instead. Because that does not require dev server support.
- [`fast-glob`](https://www.npmjs.com/package/fast-glob) is used instead of [`globby`](https://www.npmjs.com/package/globby).
  - Because `fast-glob` is used inside `vite`.
- `transform` could return `null` as a way to tell the plugin not to copy the file, this is similar to the [CopyWebpackPlugin#filter](https://webpack.js.org/plugins/copy-webpack-plugin/#filter) option, but it expects `transform` to return the original content in case you want it to be copied.
- `transform` can optionally be an object, with a `handler` property (with the same signature of the `rollup-plugin-copy` transform option) and an `encoding` property (`BufferEncoding | 'buffer'`) that will be used to read the file content so that the `handler`'s content argument will reflect the correct encoding (could be Buffer);
- `structured: true` preserves the directory structure. This is similar to `flatten: false` in `rollup-plugin-copy`, but it covers more edge cases.
