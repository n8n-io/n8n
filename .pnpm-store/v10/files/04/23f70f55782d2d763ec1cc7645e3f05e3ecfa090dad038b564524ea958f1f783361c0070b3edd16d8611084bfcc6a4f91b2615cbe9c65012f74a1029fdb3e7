# qrcode.vue

⚠️ 如果你正在使用 Vue 3，请升级 `qrcode.vue` 到 `3.x`;

🔒 如果你正在使用 Vue 2，请保持 `qrcode.vue` 的版本为 `1.x`;

一款 Vue.js 二维码组件，同时支持 Vue 2 和 Vue 3.

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/scopewu/qrcode.vue/blob/main/LICENSE)

## 快速开始

快速添加 `qrcode.vue` 组件到项目中

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

## 使用

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

或者，在独有单文件扩展 `*.vue` 中使用：

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

在 Vue 3 中配合 `TypeScript` 使用：

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
  
  // 可传入二维码图片相关的属性，支持二维码 LOGO；
  const imageSettings = ref<ImageSettings>({
    src: 'https://github.com/scopewu.png',
    width: 30,
    height: 30,
    // x: 10,
    // y: 10,
    excavate: true,
  })

  // 可传入渐变相关的属性，支持渐变：
  const gradient = ref(false)
  const gradientType = ref<GradientType>('linear')
  const gradientStartColor = ref('#000000')
  const gradientEndColor = ref('#38bdf8')
</script>
```

## Component props

### `value`

- 类型：`string`
- 默认值：`''`

二维码的内容值。

### `size`

- 类型：`number`
- 默认值：`100`

二维码大小。

### `render-as`

- 类型：`RenderAs('canvas' | 'svg')`
- 默认值：`canvas`

生成二维码的 HTML 标签，可选 `canvas` 或 `svg`。其中 `svg` 可以用于 SSR。

### `margin`

- 类型：`number`
- 默认值：`0`

定义空白区的宽度应该是多少。

### `level`

- 类型：`Level('L' | 'M' | 'Q' | 'H')`
- 默认值：`L`

二维码的容错能力等级，取值为 'L', 'M', 'Q', 'H' 之一。了解更多，[维基百科：QR_code](https://en.wikipedia.org/wiki/QR_code#Error_correction)。

### `background`

- 类型：`string`
- 默认值：`#ffffff`

二维码背景颜色。

### `foreground`

- 类型：`string`
- 默认值：`#000000`

二维码前景颜色。

### `image-settings`

- 类型: `ImageSettings`
- 默认值: `{}`

  ```ts
  export type ImageSettings = {
    src: string, // 图片的地址。
    x?: number,  // 水平横向偏移。没有设定值时，图片剧中
    y?: number,  // 垂直竖向偏移。没有设定值时，图片剧中
    height: number, // 图片的高度
    width: number,  // 图片的宽度
    // 是否“挖掘”图像周围的模块。
    // 这意味着嵌入图像重叠的任何模块都将使用背景颜色。
    // 使用此选项可确保图像周围的边缘清晰。嵌入透明图像时也很有用。
    excavate?: boolean,
    borderRadius?: number, // 图片的边框圆角。
  }
  ```

二维码图片 logo 配置。

### `gradient`

- 类型: `boolean`
- 默认值: `false`

启用二维码的渐变填充。

### `gradient-type`

- 类型: `GradientType('linear' | 'radial')`
- 默认值: `linear`

指定渐变类型。

### `gradient-start-color`

- 类型: `string`
- 默认值: `#000000`

渐变的起始颜色。

### `gradient-end-color`

- 类型: `string`
- 默认值: `#ffffff`

渐变的结束颜色。

### `class`

- 类型：`string`
- 默认值：`''`

传递给二维码根元素的类名。

## `QrcodeVue` 3.5+

`QrcodeVue` 3.5+ 后导出独立的 `QrcodeCanvas` 和 `QrcodeSvg` 组件，为此修改了 rollup 的配置：

```
// rollup.config.js

-    exports: 'default',
+    exports: 'named',
```

现在在 common.js 和 cdn 直接引用 `QrcodeVue` 需要使用 `default` 字段：

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

## 软件许可

copyright &copy; 2021 scopewu, license by [MIT](https://github.com/scopewu/qrcode.vue/blob/main/LICENSE)
