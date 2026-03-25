# vue-resize

[![npm](https://img.shields.io/npm/v/vue-resize.svg) ![npm](https://img.shields.io/npm/dm/vue-resize.svg)](https://www.npmjs.com/package/vue-resize)
[![vue2](https://img.shields.io/badge/vue-2.x-brightgreen.svg)](https://vuejs.org/)

Detect DOM element resizing

[JSFiddle](https://jsfiddle.net/Akryum/zqygwf3r/)

<p>
  <a href="https://www.patreon.com/akryum" target="_blank">
    <img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Become a Patreon">
  </a>
</p>

## Sponsors

[![sponsors logos](https://guillaume-chau.info/sponsors.png)](https://guillaume-chau.info/sponsors)

<br>

# Installation

```
npm install --save vue-resize
```

## Module import

**⚠️ You need to include the package CSS:**

```js
import 'vue-resize/dist/vue-resize.css'
```

Then import the package and install it into Vue:

```javascript
import VueResize from 'vue-resize'

app.use(VueResize)
```

Or:

```javascript
import { ResizeObserver } from 'vue-resize'

app.component('resize-observer', ResizeObserver)
```

## Browser

```html
<link rel="stylesheet" href="vue-resize/dist/vue-resize.css"/>

<script src="vue.js"></script>
<script src="vue-resize/dist/vue-resize.min.js"></script>
```

```javascript
app.use(VueResize)
```

Or:

```javascript
app.component('resize-observer', VueResize.ResizeObserver)
```

# Usage

Add the `<resize-observer>` inside a DOM element and make its position to something other than `'static'` (for example `'relative'`), so that the observer can fill it.

Listen to the `notify` event that is fired when the above DOM element is resized.

# Example

```html
<template>
  <div class="demo">
    <h1>Hello world!</h1>
    <resize-observer @notify="handleResize" />
  </div>
</template>

<script>
export default {
  methods: {
    handleResize ({ width, height }) {
      console.log('resized', width, height)
    }
  }
}
</script>

<style scoped>
.demo {
  position: relative;
}
</style>
```

---

## License

[MIT](http://opensource.org/licenses/MIT)
