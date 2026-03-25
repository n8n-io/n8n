<script lang="ts">
import type { SelectEvent } from './utils'
import type { PrimitiveProps } from '@/Primitive'
import type { AcceptableValue, FormFieldProps } from '@/shared/types'

export type RadioEmits = {
  'update:checked': [value: boolean]
  'select': [SelectEvent]
}

export interface RadioProps extends PrimitiveProps, FormFieldProps {
  id?: string
  /** The value given as data when submitted with a `name`. */
  value?: AcceptableValue
  /** When `true`, prevents the user from interacting with the radio item. */
  disabled?: boolean
  checked?: boolean
}
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { computed, toRefs } from 'vue'
import { Primitive } from '@/Primitive'
import { useFormControl, useForwardExpose } from '@/shared'
import { VisuallyHiddenInput } from '@/VisuallyHidden'
import { handleSelect } from './utils'

const props = withDefaults(defineProps<RadioProps>(), {
  disabled: false,
  checked: undefined,
  as: 'button',
})
const emits = defineEmits<RadioEmits>()

defineSlots<{
  default?: (props: {
    /** Current checked state */
    checked: typeof checked.value
  }) => any
}>()

const checked = useVModel(props, 'checked', emits, {
  passive: (props.checked === undefined) as false,
})

const { value } = toRefs(props)
const { forwardRef, currentElement: triggerElement } = useForwardExpose()
const isFormControl = useFormControl(triggerElement)

const ariaLabel = computed(() => props.id && triggerElement.value ? (document.querySelector(`[for="${props.id}"]`) as HTMLLabelElement)?.innerText ?? props.value : undefined)

function handleClick(event: MouseEvent) {
  if (props.disabled)
    return

  handleSelect(event, props.value, (ev) => {
    emits('select', ev)
    if (ev?.defaultPrevented)
      return

    checked.value = true
    if (isFormControl.value) {
    // if radio is in a form, stop propagation from the button so that we only propagate
    // one click event (from the input). We propagate changes from an input so that native
    // form validation works and form events reflect radio updates.
      ev.stopPropagation()
    }
  })
}
</script>

<template>
  <Primitive
    v-bind="$attrs"
    :id="id"
    :ref="forwardRef"
    role="radio"
    :type="as === 'button' ? 'button' : undefined"
    :as="as"
    :aria-checked="checked"
    :aria-label="ariaLabel"
    :as-child="asChild"
    :disabled="disabled ? '' : undefined"
    :data-state="checked ? 'checked' : 'unchecked'"
    :data-disabled="disabled ? '' : undefined"
    :value="value"
    :required="required"
    :name="name"
    @click.stop="handleClick"
  >
    <slot :checked="checked" />

    <VisuallyHiddenInput
      v-if="isFormControl && name"
      type="radio"
      tabindex="-1"
      :value="value"
      :checked="!!checked"
      :name="name"
      :disabled="disabled"
      :required="required"
    />
  </Primitive>
</template>
