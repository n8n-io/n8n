# pg-cloudflare

`pg-cloudflare` makes it easier to take an existing package that relies on `tls` and `net`, and make it work in environments where only `connect()` is supported, such as Cloudflare Workers.

`pg-cloudflare` wraps `connect()`, the [TCP Socket API](https://github.com/wintercg/proposal-sockets-api) proposed within WinterCG, and implemented in [Cloudflare Workers](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/), and exposes an interface with methods similar to what the `net` and `tls` modules in Node.js expose. (ex: `net.connect(path[, options][, callback])`). This minimizes the number of changes needed in order to make an existing package work across JavaScript runtimes.

## Installation

```
npm i --save-dev pg-cloudflare
```

The package uses conditional exports to support bundlers that don't know about
`cloudflare:sockets`, so the consumer code by default imports an empty file. To
enable the package, resolve to the `cloudflare` condition in your bundler's
config. For example:

- `webpack.config.js`
  ```js
  export default {
    ...,
    resolve: { conditionNames: [..., "workerd"] },
    plugins: [
      // ignore cloudflare:sockets imports
      new webpack.IgnorePlugin({
        resourceRegExp: /^cloudflare:sockets$/,
      }),
    ],
  }
  ```
- `vite.config.js`

  > [!NOTE]
  > If you are using the [Cloudflare Vite plugin](https://www.npmjs.com/package/@cloudflare/vite-plugin) then the following configuration is not necessary.

  ```js
  export default defineConfig({
    ...,
    resolve: {
      conditions: [..., "workerd"],
    },
    build: {
      ...,
      // don't try to bundle cloudflare:sockets
      rollupOptions: {
        external: [..., 'cloudflare:sockets'],
      },
    },
  })
  ```

- `rollup.config.js`
  ```js
  export default defineConfig({
    ...,
    plugins: [..., nodeResolve({ exportConditions: [..., 'workerd'] })],
    // don't try to bundle cloudflare:sockets
    external: [..., 'cloudflare:sockets'],
  })
  ```
- `esbuild.config.js`
  ```js
  await esbuild.build({
    ...,
    conditions: [..., 'workerd'],
  })
  ```

The concrete examples can be found in `packages/pg-bundler-test`.

## How to use conditionally, in non-Node.js environments

As implemented in `pg` [here](https://github.com/brianc/node-postgres/commit/07553428e9c0eacf761a5d4541a3300ff7859578#diff-34588ad868ebcb232660aba7ee6a99d1e02f4bc93f73497d2688c3f074e60533R5-R13), a typical use case might look as follows, where in a Node.js environment the `net` module is used, while in a non-Node.js environment, where `net` is unavailable, `pg-cloudflare` is used instead, providing an equivalent interface:

```js
module.exports.getStream = function getStream(ssl = false) {
  const net = require('net')
  if (typeof net.Socket === 'function') {
    return net.Socket()
  }
  const { CloudflareSocket } = require('pg-cloudflare')
  return new CloudflareSocket(ssl)
}
```

## Node.js implementation of the Socket API proposal

If you're looking for a way to rely on `connect()` as the interface you use to interact with raw sockets, but need this interface to be available in a Node.js environment, [`@arrowood.dev/socket`](https://github.com/Ethan-Arrowood/socket) provides a Node.js implementation of the Socket API.

### license

The MIT License (MIT)

Copyright (c) 2023 Brian M. Carlson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
