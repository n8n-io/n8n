<script lang="ts">
import type { Ref } from 'vue'
import type { MenuSubEmits, MenuSubProps } from '@/Menu'

export type MenubarSubEmits = MenuSubEmits
export interface MenubarSubProps extends MenuSubProps {
  /** The open state of the submenu when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean
}
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { MenuSub } from '@/Menu'
import { useForwardExpose } from '@/shared'

const props = withDefaults(defineProps<MenubarSubProps>(), {
  open: undefined,
})
const emit = defineEmits<MenubarSubEmits>()

defineSlots<{
  default?: (props: {
    /** Current open state */
    open: typeof open.value
  }) => any
}>()

useForwardExpose()
const open = useVModel(props, 'open', emit, {
  defaultValue: props.defaultOpen ?? false,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>
</script>

<template>
  <MenuSub v-model:open="open">
    <slot :open="open" />
  </MenuSub>
</template>
