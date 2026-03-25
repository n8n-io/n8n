# vue-component-type-helpers

Some very simple type helpers used behind `vue-component-meta` for extract component props, slots, emit, exposed types.

## Usage

```vue
<template>
	<slot name="header" :num="123" />
	<slot name="footer" str="abc" />
</template>

<script lang="ts" setup>
defineProps<{
	msg: string
}>()
</script>
```

```ts
import HelloWorld from './HelloWorld.vue'
import type { ComponentProps, ComponentSlots } from 'vue-component-type-helpers'

type Props = ComponentProps<typeof HelloWorld> // { msg: string }
type Slots = ComponentSlots<typeof HelloWorld> // { header(_: { num: number; }): any; footer(_: { str: string; }): any; }
```
