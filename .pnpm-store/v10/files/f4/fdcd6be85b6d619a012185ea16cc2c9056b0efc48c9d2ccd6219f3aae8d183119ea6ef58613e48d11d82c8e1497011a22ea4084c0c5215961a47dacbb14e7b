<script setup lang="ts">
import type { SelectRootContext } from './SelectRoot.vue'
import type { AcceptableValue } from '@/shared/types'
import { provideSelectContentContext, SelectContentDefaultContextValue } from './SelectContentImpl.vue'
import { provideSelectRootContext } from './SelectRoot.vue'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  context: SelectRootContext<AcceptableValue>
}>()

provideSelectRootContext(props.context)
provideSelectContentContext(SelectContentDefaultContextValue)
</script>

<template>
  <slot />
</template>
