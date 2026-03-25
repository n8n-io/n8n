# vue-markdown-render

`vue-markdown-render` is a simple and lightweight wrapper for [markdown-it](https://markdown-it.github.io/) with full TypeScript support.

## Usage

```vue
<template>
  <div>
    <vue-markdown :source="src" />
  </div>
</template>

<script lang="ts">
import VueMarkdown from 'vue-markdown-render'

export default defineComponent({
  name: 'MyComponent',
  components: {
    VueMarkdown
  },
  setup(props, ctx) {
    const src = ref('# header')

    return {
      src
    }
  }
})
</script>
```

### Options

[markdown-it options](https://github.com/markdown-it/markdown-it#init-with-presets-and-options) can be passed as an object into the VueMarkdown component:

```vue
 <vue-markdown :source="src" :options="options" />
```

### Plugins

[markdown-it](https://github.com/markdown-it/markdown-it#plugins-load) compatible simple plugins can be passed as an array into the VueMarkdown component. Example using [MarkdownItAnchor](https://www.npmjs.com/package/markdown-it-anchor)
```vue
<template>
  <vue-markdown :source="markdown" :plugins="plugins" />
</template>

<script setup>
import VueMarkdown from 'vue-markdown-render'
import MarkdownItAnchor from 'markdown-it-anchor';

const plugins = [MarkdownItAnchor];
</script>
```

## TypeScript

If you are using typescript, you have to add the [@types/markdown-it](https://www.npmjs.com/package/@types/markdown-it) to your **dev dependencies**.

```bash
npm install @types/markdown-it --save-dev
```
