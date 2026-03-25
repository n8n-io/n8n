[![Sponsor me](https://img.shields.io/badge/sponsor-DB61A2?style=for-the-badge&logo=GitHub-Sponsors&logoColor=white)](https://voracious.link/sponsor)
[![Donate](https://img.shields.io/badge/donate-FF5F5F?style=for-the-badge&logo=ko-fi&logoColor=white)](https://voracious.link/donate)

# vite-plugin-node-polyfills

A Vite plugin to polyfill Node's Core Modules for browser environments. Supports [`node:` protocol imports](https://nodejs.org/dist/latest-v16.x/docs/api/esm.html#node-imports).

## Why do I need this?

```
Module "stream" has been externalized for browser compatibility. Cannot access "stream.Readable" in client code.
```

Since browsers do not support Node's [Core Modules](https://nodejs.org/dist/latest-v16.x/docs/api/modules.html#core-modules), packages that use them must be polyfilled to function in browser environments. In an attempt to prevent runtime errors, Vite produces [errors](https://github.com/vitejs/vite/issues/9200) or [warnings](https://github.com/vitejs/vite/pull/9837) when your code references builtin modules such as `fs` or `path`.

## Getting Started

Install the package as a dev dependency.

```sh
# npm
npm install --save-dev vite-plugin-node-polyfills

# pnpm
pnpm install --save-dev vite-plugin-node-polyfills

# yarn
yarn add --dev vite-plugin-node-polyfills
```

Add the plugin to your `vite.config.ts` file.

```ts
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills(),
  ],
})
```

### Customizable when you need it

The following options are available to customize it for your needs.

```ts
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills({
      // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
      include: ['path'],
      // To exclude specific polyfills, add them to this list. Note: if include is provided, this has no effect
      exclude: [
        'http', // Excludes the polyfill for `http` and `node:http`.
      ],
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true, // can also be 'build', 'dev', or false
        global: true,
        process: true,
      },
      // Override the default polyfills for specific modules.
      overrides: {
        // Since `fs` is not supported in browsers, we can use the `memfs` package to polyfill it.
        fs: 'memfs',
      },
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
})
```

### All polyfills

- If protocolImports is true, also adds node:[module]

```js
[
  '_stream_duplex',
  '_stream_passthrough',
  '_stream_readable',
  '_stream_transform',
  '_stream_writable',
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'module',
  'net',
  'os',
  'path',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'timers/promises',
  'tls',
  'tty',
  'url',
  'util',
  'vm',
  'zlib',
]
```

## About the author

Hello! My name is David, and in my spare time, I build tools to help developers be more productive. If you find my work valuable, I would really appreciate a [sponsorship](https://voracious.link/sponsor) or [donation](https://voracious.link/donate). If you want to see more of my work, check out [davidmyers.dev](https://davidmyers.dev).

Thanks for your support! 🪴
