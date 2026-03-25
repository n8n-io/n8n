<script lang="ts">
import type { ComputedRef } from 'vue'
import type { RadioProps } from './Radio.vue'
import type { SelectEvent } from './utils'
import { createContext, useForwardExpose } from '@/shared'

export interface RadioGroupItemProps extends Omit<RadioProps, 'checked'> {}
export type RadioGroupItemEmits = {
  select: [event: SelectEvent]
}

interface RadioGroupItemContext {
  disabled: ComputedRef<boolean>
  checked: ComputedRef<boolean>
}

export const [injectRadioGroupItemContext, provideRadiogroupItemContext]
  = createContext<RadioGroupItemContext>('RadioGroupItem')
</script>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { isEqual } from 'ohash'
import { computed, ref } from 'vue'
import { RovingFocusItem } from '@/RovingFocus'
import Radio from './Radio.vue'
import { injectRadioGroupRootContext } from './RadioGroupRoot.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<RadioGroupItemProps>(), {
  disabled: false,
  as: 'button',
})

const emits = defineEmits<RadioGroupItemEmits>()

defineSlots<{
  default?: (props: {
    /** Current checked state */
    checked: typeof checked.value
    /** Required state */
    required: typeof required.value
    /** Disabled state */
    disabled: typeof disabled.value
  }) => any
}>()

const { forwardRef, currentElement } = useForwardExpose()

const rootContext = injectRadioGroupRootContext()

const disabled = computed(() => rootContext.disabled.value || props.disabled)
const required = computed(() => rootContext.required.value || props.required)
const checked = computed(() => isEqual(rootContext.modelValue?.value, props.value))

provideRadiogroupItemContext({ disabled, checked })

const isArrowKeyPressed = ref(false)
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

useEventListener('keydown', (event) => {
  if (ARROW_KEYS.includes(event.key))
    isArrowKeyPressed.value = true
})
useEventListener('keyup', () => {
  isArrowKeyPressed.value = false
})

function handleFocus() {
  setTimeout(() => {
    /**
     * Our `RovingFocusGroup` will focus the radio when navigating with arrow keys
     * and we need to 'check' it in that case. We click it to 'check' it (instead
     * of updating `context.value`) so that the radio change event fires.
     */
    if (isArrowKeyPressed.value)
      currentElement.value?.click()
  }, 0)
}
</script>

<template>
  <RovingFocusItem
    :checked="checked"
    :disabled="disabled"
    as-child
    :focusable="!disabled"
    :active="checked"
  >
    <Radio
      v-bind="{ ...$attrs, ...props }"
      :ref="forwardRef"
      :checked="checked"
      :required="required"
      :disabled="disabled"
      @update:checked="rootContext.changeModelValue(value)"
      @select="emits('select', $event)"
      @keydown.enter.prevent
      @focus="handleFocus"
    >
      <slot
        :checked="checked"
        :required="required"
        :disabled="disabled"
      />
    </Radio>
  </RovingFocusItem>
</template>
