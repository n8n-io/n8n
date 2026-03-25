# z-vue-scan

A Vue scanning plugin that works with both Vue 2 and Vue 3. The component will flash with a red border when it will update.

[![NPM version](https://img.shields.io/npm/v/z-vue-scan?color=a1b858&label=)](https://www.npmjs.com/package/z-vue-scan)

## Features

- 🎯 Works with both Vue 2 and Vue 3
- 🔄 Powered by [vue-demi](https://github.com/vueuse/vue-demi)
- 📦 Lightweight
- 💪 Written in TypeScript

## Installation

```bash
# npm
npm install z-vue-scan

# yarn
yarn add z-vue-scan

# pnpm
pnpm add z-vue-scan
```

## Usage

```ts
interface Options {
  enable?: boolean
  hideCompnentName?: boolean
}
```

### Vue 3

```ts
// vue3
import { createApp } from 'vue'
import VueScan, { type VueScanOptions } from 'z-vue-scan/src'

import App from './App.vue'

const app = createApp(App)
app.use<VueScanOptions>(VueScan, {})
app.mount('#app')
```

### Vue 2

```ts
// vue2
import Vue from 'vue'
import VueScan, { type VueScanBaseOptions } from 'z-vue-scan/vue2'
import App from './App.vue'

Vue.use<VueScanBaseOptions>(VueScan, {})

new Vue({
  render: h => h(App),
}).$mount('#app')
```

### Nuxt Module

```bash
# npm
npm install z-vue-scan-nuxt-module

# yarn
yarn add z-vue-scan-nuxt-module

# pnpm
pnpm add z-vue-scan-nuxt-module
```

You can use z-vue-scan in your Nuxt project by adding it to the `modules` section in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['z-vue-scan-nuxt-module'],
  vueScan: {
    // options
    enable: true,
    hideCompnentName: false
  }
})
```

## Development

```bash
# Install dependencies
pnpm install

# Run development server with Vue 3 example
pnpm dev

# Run development server with Vue 2 example
pnpm dev:vue2

# Build the package
pnpm build

# Run type check
pnpm typecheck

# Run linting
pnpm lint
```

## License

[MIT](./LICENSE) License  2024 [zcf0508](https://github.com/zcf0508)
