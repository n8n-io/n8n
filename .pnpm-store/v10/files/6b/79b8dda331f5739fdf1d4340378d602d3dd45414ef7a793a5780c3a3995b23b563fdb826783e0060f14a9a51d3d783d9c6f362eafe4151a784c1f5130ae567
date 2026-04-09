## [3.8.0] - 2026-02-02

### Performance

- optimize QRCode rendering performance.

## [3.7.1] - 2026-01-31

### Bugfix

- Fix logo image border radius scale in QRCode.

## [3.7.0] - 2026-01-29

### Feature

- Suppord border radius for QRCode logo image.
- optimize performance for QRCode.

### Bugfix

- Fix state update issue when value prop changed.

## [3.6.0] - 2024-11-03

### Feature

- Support `gradient` props for QRCode.

## [3.5.0] - 2024-09-26

### Feature

- Support logo image for Qrcode.
- Exports separate `QrcodeCanvas` and `QrcodeSvg` components

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
<qrcode-svg :value="test" :image-settings="imageSettings"></qrcode-svg>
</p>
<p><input v-model="test" /></p>
</div>
<script src="https://cdn.jsdelivr.net/npm/vue@3.5/dist/vue.global.prod.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode.vue@3.5/dist/qrcode.vue.browser.min.js"></script>

<script>
Vue.createApp({
  data() { return {
    test: 'Hello World',
    imageSettings: {
      src: 'https://avatars.githubusercontent.com/u/15811268',
      width: 30,
      height: 30,
      excavate: true,
    },
  }},
  components: {
    QrcodeVue: QrcodeVue.default,
    QrcodeCanvas: QrcodeVue.QrcodeCanvas,
    QrcodeSvg: QrcodeVue.QrcodeSvg,
  },
}).mount('#root')
</script>
```

## [3.4.1] - 2023-08-05

### BUGFIX

- Fixed TypeScript type export error.

## [3.4.0] - 2023-04-15

### Performance

- remove `qr.js` dependency, use `nayuki/QR-Code-generator` instead.

## [3.3.1] - 2021-09-11

### BUGFIX

- Fix document description error, adjust `renderAs` to `render-as`.

## [3.2.0] - 2020-12-20

### Feature

- support typescript.

## [3.1.0] - 2020-12-20

### Feature

- Add support margin for QRcode.

## [3.0.0] - 2020-12-20

### Feature

- Support Vue 3

## [1.7.0] - 2019-11-10

### Feature

- Support generate Qrcode as svg.

## [1.6.3] - 2019-09-16

### Update

- Perfect documentation.
- Add eslint check.

## [1.6.2] - 2019-05-21

### Remove:

- `backingStorePixelRatio` is deprecated. more infomation [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D).

## [1.6.0] - 2018-04-14

### Changed

- Use Vue render function, not use jsx.

### Bugfixs

- convert utf-16 to utf-8.
