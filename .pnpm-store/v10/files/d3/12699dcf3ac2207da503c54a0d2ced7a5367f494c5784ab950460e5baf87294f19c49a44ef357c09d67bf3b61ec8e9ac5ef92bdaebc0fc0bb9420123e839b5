<script setup lang="ts">
import { onBeforeUnmount, ref, watchEffect } from 'vue'
import { useCollection } from '@/Collection'
import { Primitive } from '@/Primitive'
import { getActiveElement } from '@/shared'
import { injectSelectContentContext } from './SelectContentImpl.vue'

export type SelectScrollButtonImplEmits = {
  autoScroll: []
}

const emits = defineEmits<SelectScrollButtonImplEmits>()
const { getItems } = useCollection()

const contentContext = injectSelectContentContext()
const autoScrollTimerRef = ref<number | null>(null)

function clearAutoScrollTimer() {
  if (autoScrollTimerRef.value !== null) {
    window.clearInterval(autoScrollTimerRef.value)
    autoScrollTimerRef.value = null
  }
}

watchEffect(() => {
  const activeItem = getItems().map(i => i.ref).find(
    item => item === getActiveElement(),
  )
  activeItem?.scrollIntoView({ block: 'nearest' })
})

function handlePointerDown() {
  if (autoScrollTimerRef.value === null) {
    autoScrollTimerRef.value = window.setInterval(() => {
      emits('autoScroll')
    }, 50)
  }
}

function handlePointerMove() {
  contentContext.onItemLeave?.()
  if (autoScrollTimerRef.value === null) {
    autoScrollTimerRef.value = window.setInterval(() => {
      emits('autoScroll')
    }, 50)
  }
}

onBeforeUnmount(() => clearAutoScrollTimer())
</script>

<template>
  <Primitive
    aria-hidden="true"
    :style="{
      flexShrink: 0,
    }"
    v-bind="$parent?.$props"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerleave="
      () => {
        clearAutoScrollTimer();
      }
    "
  >
    <slot />
  </Primitive>
</template>
