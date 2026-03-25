# Vue Flow: Node Resizer Component

This is a resizer component for Vue Flow.
It can be used to resize your nodes.

## 🛠 Setup

```bash
# install
$ yarn add @vue-flow/node-resizer

# or
$ npm i --save @vue-flow/node-resizer
```

## 🎮 Quickstart

```vue
<script setup>
import { VueFlow } from '@vue-flow/core'
import initialElements from './initial-elements'

// some nodes and edges
const elements = ref(initialElements)
</script>

<template>
  <VueFlow v-model="elements" fit-view-on-init>
    <template #node-custom="nodeProps">
      <CustomNode :data="nodeProps.data" :label="nodeProps.label" />
    </template>
  </VueFlow>
</template>
```

```vue
<script lang="ts" setup>
import { Handle, Position } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'

// make sure to include the necessary styles!
import '@vue-flow/node-resizer/dist/style.css'

defineProps(['label'])
</script>

<template>
  <NodeResizer min-width="100" min-height="30" />

  <Handle type="target" :position="Position.Left" />
  <div style="padding: 10px">{{ label }}</div>
  <Handle type="source" :position="Position.Right" />
</template>
```
