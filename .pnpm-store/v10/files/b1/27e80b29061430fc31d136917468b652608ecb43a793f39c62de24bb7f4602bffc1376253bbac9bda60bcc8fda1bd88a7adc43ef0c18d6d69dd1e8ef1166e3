# Vue Flow: MiniMap Component

This is a minimap component for Vue Flow.
It can be used to add a minimap to the canvas, which will show a smaller version of the canvas with your nodes.
The minimap can also be used to pan and zoom the main canvas.

## 🛠 Setup

```bash
# install
$ yarn add @vue-flow/minimap

# or
$ npm i --save @vue-flow/minimap
```

## 🎮 Quickstart

```vue
<script setup>
import { VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'

// import default minimap styles
import '@vue-flow/minimap/dist/style.css'

import initialElements from './initial-elements'

// some nodes and edges
const elements = ref(initialElements)
</script>

<template>
  <VueFlow v-model="elements" fit-view-on-init class="vue-flow-basic-example">
    <MiniMap />
  </VueFlow>
</template>
```
