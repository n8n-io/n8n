# @vue/runtime-core

> This package is published only for typing and building custom renderers. It is NOT meant to be used in applications.

For full exposed APIs, see `src/index.ts`.

## Building a Custom Renderer

```ts
import { createRenderer } from '@vue/runtime-core'

const { render, createApp } = createRenderer({
  patchProp,
  insert,
  remove,
  createElement,
  // ...
})

// `render` is the low-level API
// `createApp` returns an app instance with configurable context shared
// by the entire app tree.
export { render, createApp }

export * from '@vue/runtime-core'
```

See `@vue/runtime-dom` for how a DOM-targeting renderer is implemented.
