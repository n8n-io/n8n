<script lang="ts">
import type { Ref } from 'vue'
import type { MenuSubEmits, MenuSubProps } from '@/Menu'

export type DropdownMenuSubEmits = MenuSubEmits
export interface DropdownMenuSubProps extends MenuSubProps {
  /** The open state of the dropdown menu when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean
}
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { MenuSub } from '@/Menu'
import { useForwardExpose } from '@/shared'

const props = withDefaults(defineProps<DropdownMenuSubProps>(), {
  open: undefined,
})
const emit = defineEmits<DropdownMenuSubEmits>()

defineSlots<{
  default?: (props: {
    /** Current open state */
    open: typeof open.value
  }) => any
}>()

const open = useVModel(props, 'open', emit, {
  passive: (props.open === undefined) as false,
  defaultValue: props.defaultOpen ?? false,
}) as Ref<boolean>

useForwardExpose()
</script>

<template>
  <MenuSub v-model:open="open">
    <slot :open="open" />
  </MenuSub>
</template>
