<script lang="ts">
import type { ComputedRef, Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { FormFieldProps } from '@/shared/types'
import { createContext, useFormControl, useForwardExpose } from '@/shared'

export interface SwitchRootProps<T = boolean> extends PrimitiveProps, FormFieldProps {
  /** The state of the switch when it is initially rendered. Use when you do not need to control its state. */
  defaultValue?: T
  /** The controlled state of the switch. Can be bind as `v-model`. */
  modelValue?: T | null
  /** When `true`, prevents the user from interacting with the switch. */
  disabled?: boolean
  id?: string
  /** The value given as data when submitted with a `name`. */
  value?: string
  /**
   * The value used when the switch is on. Defaults to `true`.
   */
  trueValue?: T
  /**
   * The value used when the switch is off. Defaults to `false`.
   */
  falseValue?: T
}

export type SwitchRootEmits<T = boolean> = {
  /** Event handler called when the value of the switch changes. */
  'update:modelValue': [payload: T]
}

export interface SwitchRootContext {
  checked: ComputedRef<boolean>
  toggleCheck: () => void
  disabled: Ref<boolean>
}

export const [injectSwitchRootContext, provideSwitchRootContext]
  = createContext<SwitchRootContext>('SwitchRoot')
</script>

<script setup lang="ts" generic="T = boolean">
import { useVModel } from '@vueuse/core'
import { computed, toRefs } from 'vue'
import { Primitive } from '@/Primitive'
import { VisuallyHiddenInput } from '@/VisuallyHidden'

const props = withDefaults(defineProps<SwitchRootProps<T>>(), {
  as: 'button',
  modelValue: undefined,
  value: 'on',
  trueValue: (() => true) as unknown as undefined,
  falseValue: (() => false) as unknown as undefined,
})
const emit = defineEmits<SwitchRootEmits<T>>()

defineSlots<{
  default?: (props: {
    /** Current value */
    modelValue: typeof modelValue.value
    /** Whether the switch is checked */
    checked: typeof checked.value
  }) => any
}>()

const { disabled } = toRefs(props)

const modelValue = useVModel(props as any, 'modelValue', emit as any, {
  defaultValue: props.defaultValue ?? props.falseValue,
  passive: (props.modelValue === undefined) as false,
}) as Ref<T>

const checked = computed(() => modelValue.value === props.trueValue)

function toggleCheck() {
  if (disabled.value)
    return

  modelValue.value = checked.value ? props.falseValue as T : props.trueValue as T
}

const { forwardRef, currentElement } = useForwardExpose()
const isFormControl = useFormControl(currentElement)
const ariaLabel = computed(() => props.id && currentElement.value ? (document.querySelector(`[for="${props.id}"]`) as HTMLLabelElement)?.innerText : undefined)

provideSwitchRootContext({
  checked,
  toggleCheck,
  disabled,
})
</script>

<template>
  <Primitive
    v-bind="$attrs"
    :id="id"
    :ref="forwardRef"
    role="switch"
    :type="as === 'button' ? 'button' : undefined"
    :value="value"
    :aria-label="$attrs['aria-label'] || ariaLabel"
    :aria-checked="checked"
    :aria-required="required"
    :data-state="checked ? 'checked' : 'unchecked'"
    :data-disabled="disabled ? '' : undefined"
    :as-child="asChild"
    :as="as"
    :disabled="disabled"
    @click="toggleCheck"
    @keydown.enter.prevent="toggleCheck"
  >
    <slot
      :model-value="modelValue"
      :checked="checked"
    />

    <VisuallyHiddenInput
      v-if="isFormControl && name"
      type="checkbox"
      :name="name"
      :disabled="disabled"
      :required="required"
      :value="value"
      :checked="checked"
    />
  </Primitive>
</template>
