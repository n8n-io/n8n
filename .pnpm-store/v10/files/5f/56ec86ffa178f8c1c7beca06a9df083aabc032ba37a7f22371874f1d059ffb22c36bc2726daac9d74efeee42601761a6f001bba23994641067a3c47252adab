<script setup lang="ts">
import type { PopperAnchorProps } from '@/Popper'
import { PopperAnchor } from '@/Popper'

interface MenuAnchorProps extends PopperAnchorProps {}

const props = defineProps<MenuAnchorProps>()
</script>

<template>
  <PopperAnchor v-bind="props">
    <slot />
  </PopperAnchor>
</template>
