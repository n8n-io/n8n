# qrcode.vue

⚠️ Now when you are using Vue 3.x, please upgrade `qrcode.vue` to `3.x`

🔒 if you are using Vue 2.x, please keep using version `1.x`;

A Vue.js component to generate [QRCode](https://en.wikipedia.org/wiki/QR_code). Both support Vue 2 and Vue 3.

[中文](./README-zh_cn.md) | [日本語](./README-ja.md)

## install

the `qrcode.vue` component can use in you Vue.js app.

```bash
npm install --save qrcode.vue # yarn add qrcode.vue
```

```
dist/
|--- qrcode.vue.cjs.js         // CommonJS
|--- qrcode.vue.esm.js         // ES module
|--- qrcode.vue.browser.js     // UMD for browser or require.js or CommonJS
|--- qrcode.vue.browser.min.js // UMD Minimum size
```

## Usage

e.g.

```javascript
import { createApp } from 'vue'
import QrcodeVue from 'qrcode.vue'

createApp({
  data: {
    value: 'https://example.com',
  },
  template: '<qrcode-vue :value="value"></qrcode-vue>',
  components: {
    QrcodeVue,
  },
}).mount('#root')
```

Or single-file components with a `*.vue` extension:

```html
<template>
  <qrcode-vue :value="value" :size="size" level="H" render-as="svg" />
  <qrcode-canvas :value="QRCODE.VUE 😄" :size="size" level="H" />
  <qrcode-svg value="QRCODE.VUE 😄" level="H" />
</template>
<script>
  import QrcodeVue, { QrcodeCanvas, QrcodeSvg } from 'qrcode.vue'

  export default {
    data() {
      return {
        value: 'https://example.com',
        size: 300,
      }
    },
    components: {
      QrcodeVue,
      QrcodeCanvas,
      QrcodeSvg,
    },
  }
</script>
```

When you use the component with Vue 3 with `TypeScript`:

```html
<template>
  <qrcode-vue
    :value="value"
    :level="level"
    :render-as="renderAs"
    :background="background"
    :foreground='foreground'
    :gradient="gradient"
    :gradient-type="gradientType"
    :gradient-start-color="gradientStartColor"
    :gradient-end-color="gradientEndColor"
    :image-settings='imageSettings'
  />
</template>
<script setup lang="ts">
  import { ref } from 'vue'
  import QrcodeVue from 'qrcode.vue'
  import type { Level, RenderAs, GradientType, ImageSettings } from 'qrcode.vue'

  const value = ref('qrcode')
  const level = ref<Level>('M')
  const renderAs = ref<RenderAs>('svg')
  const background = ref('#ffffff')
  const foreground = ref('#000000')
  const margin = ref(0)
  
  const imageSettings = ref<ImageSettings>({
    src: 'https://github.com/scopewu.png',
    width: 30,
    height: 30,
    // x: 10,
    // y: 10,
    excavate: true,
  })

  const gradient = ref(false)
  const gradientType = ref<GradientType>('linear')
  const gradientStartColor = ref('#000000')
  const gradientEndColor = ref('#38bdf8')
</script>
```

## Component props

### `value`

- Type: `string`
- Default: `''`

The value content of qrcode.

### `size`

- Type: `number`
- Default: `100`

The size of qrcode element.

### `render-as`

- Type: `RenderAs('canvas' | 'svg')`
- Default: `canvas`

Generate QRcode as `canvas` or `svg`. The prop `svg` can work on SSR.

### `margin`

- Type: `number`
- Default: `0`

Define how much wide the quiet zone should be.

### `level`

- Type: `Level('L' | 'M' | 'Q' | 'H')`
- Default: `L`

qrcode Error correction level (one of 'L', 'M', 'Q', 'H'). Know more, [wikipedia: QR_code](https://en.wikipedia.org/wiki/QR_code#Error_correction).

### `background`

- Type: `string`
- Default: `#ffffff`

The background color of qrcode.

### `foreground`

- Type: `string`
- Default: `#000000`

The foreground color of qrcode.

### `image-settings`

- Type: `ImageSettings`
- Default: `{}`

  ```ts
  export type ImageSettings = {
    src: string, // The URL of image.
    x?: number,  // The horizontal offset. When not specified, will center the image.
    y?: number,  // The vertical offset. When not specified, will center the image.
    height: number, // The height of image
    width: number,  // The height of image
    excavate?: boolean, // Whether or not to "excavate" the modules around the image.
    borderRadius?: number, // The border radius of image.
  }
  ```

The settings to support qrcode image logo.

### `gradient`

- Type: `boolean`
- Default: `false`

Enable gradient fill for the QR code.

### `gradient-type`

- Type: `GradientType('linear' | 'radial')`
- Default: `linear`

Specify the type of gradient.

### `gradient-start-color`

- Type: `string`
- Default: `#000000`

The start color of the gradient.

### `gradient-end-color`

- Type: `string`
- Default: `#ffffff`

The end color of the gradient.

### `class`

- Type: `string`
- Default: `''`

The class name of qrcode element.

## `QrcodeVue` 3.5+

`QrcodeVue` 3.5+ exports separate `QrcodeCanvas` and `QrcodeSvg` components, for which the rollup configuration has been modified:

```
// rollup.config.js

-    exports: 'default',
+    exports: 'named',
```

Direct references to `QrcodeVue` in common.js and cdn now require the `default` field:

```js
const QrcodeVue = require('qrcode.vue').default
const { default: QrcodeVue, QrcodeCanvas, QrcodeSvg } = require('qrcode.vue')
```

```html
<!--With HTML-->
<div id="root">
  <p class="flex space-x">
  <qrcode-vue :value="test" render-as="svg"></qrcode-vue>
  <qrcode-canvas :value="test"></qrcode-canvas>
  </p>
  <p><input v-model="test" /></p>
</div>
<script src="https://cdn.jsdelivr.net/npm/vue@3.5/dist/vue.global.prod.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode.vue@3.5/dist/qrcode.vue.browser.min.js"></script>

<script>
Vue.createApp({
  data() { return {
    test: 'Hello World',
  }},
  components: {
    QrcodeVue: QrcodeVue.default,
    QrcodeCanvas: QrcodeVue.QrcodeCanvas,
  },
}).mount('#root')
</script>
```

## License

copyright &copy; 2021 @scopewu, license by [MIT](https://github.com/scopewu/qrcode.vue/blob/main/LICENSE)
