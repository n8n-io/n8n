# qrcode.vue

⚠️ Now when you are using Vue 3.x, please upgrade `qrcode.vue` to `3.x`

🔒 if you are using Vue 2.x, please keep using version `1.x`;

A Vue.js component to generate [QRCode](https://en.wikipedia.org/wiki/QR_code).

[![Build Status](https://travis-ci.org/scopewu/qrcode.vue.svg?branch=master)](https://travis-ci.org/scopewu/qrcode.vue)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/scopewu/qrcode.vue/blob/master/LICENSE)

[中文](./README-zh_cn.md)

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
  <qrcode-vue :value="value" :size="size" level="H" />
</template>
<script>
  import QrcodeVue from 'qrcode.vue'

  export default {
    data() {
      return {
        value: 'https://example.com',
        size: 300,
      }
    },
    components: {
      QrcodeVue,
    },
  }
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

- Type: `string('canvas' | 'svg')`
- Default: `canvas`

Generate QRcode as `canvas` or `svg`. The prop `svg` can work on SSR.

### `margin`

- Type: `number`
- Default: `0`

Define how much wide the quiet zone should be.

### `level`

- Type: `string('L' | 'M' | 'Q' | 'H')`
- Default: `H`

qrcode Error correction level (one of 'L', 'M', 'Q', 'H'). Know more, [wikipedia: QR_code](https://en.wikipedia.org/wiki/QR_code#Error_correction).

### `background`

- Type: `string`
- Default: `#ffffff`

The background color of qrcode.

### `foreground`

- Type: `string`
- Default: `#000000`

The foreground color of qrcode.

### `class`

- Type: `string`
- Default: `''`

The class name of qrcode element.

## License

copyright &copy; 2021 @scopewu, license by [MIT](https://github.com/scopewu/qrcode.vue/blob/master/LICENSE)
