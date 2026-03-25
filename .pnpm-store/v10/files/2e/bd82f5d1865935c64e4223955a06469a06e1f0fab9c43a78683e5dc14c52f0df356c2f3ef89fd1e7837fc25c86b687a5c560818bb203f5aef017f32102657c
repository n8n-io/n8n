# Vite SVG loader
Vite plugin to load SVG files as Vue components, using SVGO for optimization.

<a href="https://www.npmjs.com/package/vite-svg-loader" target="_blank"><img src="https://img.shields.io/npm/v/vite-svg-loader?style=flat-square" alt="Version"></a>
<a href="https://www.npmjs.com/package/vite-svg-loader" target="_blank"><img src="https://img.shields.io/npm/dw/vite-svg-loader?style=flat-square" alt="Downloads"></a>
<a href="https://github.com/jpkleemans/vite-svg-loader/actions" target="_blank"><img src="https://img.shields.io/github/actions/workflow/status/jpkleemans/vite-svg-loader/e2e.yml?branch=main&label=tests&style=flat-square" alt="Tests"></a>
<a href="https://www.npmjs.com/package/vite-svg-loader" target="_blank"><img src="https://img.shields.io/npm/l/vite-svg-loader?style=flat-square" alt="License"></a>

```vue
<template>
  <MyIcon />
</template>

<script setup>
import MyIcon from './my-icon.svg'
</script>
```

### Install
```bash
npm install vite-svg-loader --save-dev
```

### Setup

#### `vite.config.js`
```js
import svgLoader from 'vite-svg-loader'

export default defineConfig({
  plugins: [vue(), svgLoader()]
})
```

### Import params
### URL
SVGs can be imported as URLs using the `?url` suffix:
```js
import iconUrl from './my-icon.svg?url'
// 'data:image/svg+xml...'
```

### Raw
SVGs can be imported as strings using the `?raw` suffix:
```js
import iconRaw from './my-icon.svg?raw'
// '<?xml version="1.0"?>...'
```

### Component
SVGs can be explicitly imported as Vue components using the `?component` suffix:
```js
import IconComponent from './my-icon.svg?component'
// <IconComponent />
```

### Default import config
When no explicit params are provided SVGs will be imported as Vue components by default.
This can be changed using the `defaultImport` config setting,
such that SVGs without params will be imported as URLs (or raw strings) instead.

#### `vite.config.js`
```js
svgLoader({
  defaultImport: 'url' // or 'raw'
})
```

### SVGO Configuration
#### `vite.config.js`
```js
svgLoader({
  svgoConfig: {
    multipass: true
  }
})
```

### Disable SVGO
#### `vite.config.js`
```js
svgLoader({
  svgo: false
})
```

### Skip SVGO for a single file
SVGO can be explicitly disabled for one file by adding the `?skipsvgo` suffix:
```js
import IconWithoutOptimizer from './my-icon.svg?skipsvgo'
// <IconWithoutOptimizer />
```

### Use with TypeScript
If you use the loader in a Typescript project, you'll need to reference the type definitions inside `vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />
```

## Sponsors

<a href="https://www.nexxtmove.nl/" target="_blank">
  <img src="https://raw.githubusercontent.com/jpkleemans/attribute-events/gh-pages/nexxtmove-logo.svg" alt="Nexxtmove Logo" width="200">
</a>

Thanks to <a href="https://www.nexxtmove.nl/" target="_blank">Nexxtmove</a> for sponsoring the development of this project.  
Your logo or name here? [Sponsor this project](https://github.com/sponsors/jpkleemans).
