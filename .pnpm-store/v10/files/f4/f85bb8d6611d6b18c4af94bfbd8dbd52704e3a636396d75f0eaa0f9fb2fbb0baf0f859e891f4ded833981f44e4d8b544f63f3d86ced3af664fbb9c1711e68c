<script lang="ts">
import type { Ref } from 'vue'
import type { PrimitiveProps } from '@/Primitive'
import type { Direction, FormFieldProps } from '@/shared/types'
import { computed, ref, toRefs } from 'vue'
import { createContext, useArrowNavigation, useDirection, useFormControl, useForwardExpose } from '@/shared'

export type AcceptableInputValue = string | Record<string, any>

export interface TagsInputRootProps<T = AcceptableInputValue> extends PrimitiveProps, FormFieldProps {
  /** The controlled value of the tags input. Can be bind as `v-model`. */
  modelValue?: Array<T> | null
  /** The value of the tags that should be added. Use when you do not need to control the state of the tags input */
  defaultValue?: Array<T>
  /** When `true`, allow adding tags on paste. Work in conjunction with delimiter prop. */
  addOnPaste?: boolean
  /** When `true` allow adding tags on tab keydown */
  addOnTab?: boolean
  /** When `true` allow adding tags blur input */
  addOnBlur?: boolean
  /** When `true`, allow duplicated tags. */
  duplicate?: boolean
  /** When `true`, prevents the user from interacting with the tags input. */
  disabled?: boolean
  /** The character or regular expression to trigger the addition of a new tag. Also used to split tags for `@paste` event */
  delimiter?: string | RegExp
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
  /** Maximum number of tags. */
  max?: number
  id?: string
  /** Convert the input value to the desired type. Mandatory when using objects as values and using `TagsInputInput` */
  convertValue?: (value: string) => T
  /** Display the value of the tag. Useful when you want to apply modifications to the value like adding a suffix or when using object as values */
  displayValue?: (value: T) => string
}

export type TagsInputRootEmits<T = AcceptableInputValue> = {
  /** Event handler called when the value changes */
  'update:modelValue': [payload: Array<T>]
  /** Event handler called when the value is invalid */
  'invalid': [payload: T]
  /** Event handler called when tag is added */
  'addTag': [payload: T]
  /** Event handler called when tag is removed */
  'removeTag': [payload: T]
}

export interface TagsInputRootContext<T = AcceptableInputValue> {
  modelValue: Ref<Array<T>>
  onAddValue: (payload: string) => boolean
  onRemoveValue: (index: number) => void
  onInputKeydown: (event: KeyboardEvent) => void
  selectedElement: Ref<HTMLElement | undefined>
  isInvalidInput: Ref<boolean>
  addOnPaste: Ref<boolean>
  addOnTab: Ref<boolean>
  addOnBlur: Ref<boolean>
  disabled: Ref<boolean>
  delimiter: Ref<string | RegExp>
  dir: Ref<Direction>
  max: Ref<number>
  id: Ref<string | undefined> | undefined
  displayValue: (value: T) => string
}

export const [injectTagsInputRootContext, provideTagsInputRootContext]
  = createContext<TagsInputRootContext>('TagsInputRoot')
</script>

<script setup lang="ts" generic="T extends AcceptableInputValue = string">
import { useFocusWithin, useVModel } from '@vueuse/core'
import { useCollection } from '@/Collection'
import { Primitive } from '@/Primitive'
import { VisuallyHiddenInput } from '@/VisuallyHidden'

const props = withDefaults(defineProps<TagsInputRootProps<T>>(), {
  defaultValue: () => [],
  delimiter: ',',
  max: 0,
  displayValue: (value: T) => value.toString(),
})
const emits = defineEmits<TagsInputRootEmits<T>>()

defineSlots<{
  default?: (props: {
    /** Current input values */
    modelValue: typeof modelValue.value
  }) => any
}>()

const { addOnPaste, disabled, delimiter, max, id, dir: propDir, addOnBlur, addOnTab } = toRefs(props)
const dir = useDirection(propDir)

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: props.defaultValue,
  passive: true,
  deep: true,
}) as Ref<Array<AcceptableInputValue>>

const { forwardRef, currentElement } = useForwardExpose()
const { focused } = useFocusWithin(currentElement)
const isFormControl = useFormControl(currentElement)

const { getItems, CollectionSlot } = useCollection({ isProvider: true })

const selectedElement = ref<HTMLElement>()
const isInvalidInput = ref(false)

const currentModelValue = computed(() => Array.isArray(modelValue.value) ? [...modelValue.value] : [])

function handleRemoveTag(index: number) {
  if (index !== -1) {
    const collection = getItems().filter(i => i.ref.dataset.disabled !== '')
    modelValue.value = modelValue.value.filter((_, i) => i !== index)
    emits('removeTag', collection[index].value)
  }
}

provideTagsInputRootContext({
  modelValue,
  onAddValue: (_payload) => {
    const array = [...currentModelValue.value]
    const modelValueIsObject = array.length > 0 && typeof array[0] === 'object'
    const defaultValueIsObject = array.length > 0 && typeof props.defaultValue[0] === 'object'

    // Check if the value is an object and if the convertValue function is provided. We don't check this a type level because the use
    // of `TagsInputInput` is optional.
    if ((modelValueIsObject || defaultValueIsObject) && typeof props.convertValue !== 'function')
      throw new Error('You must provide a `convertValue` function when using objects as values.')
    const payload = props.convertValue ? props.convertValue(_payload) : _payload as T

    if ((array.length >= max.value) && !!max.value) {
      emits('invalid', payload)
      return false
    }

    if (props.duplicate) {
      modelValue.value = [...array, payload]
      emits('addTag', payload)
      return true
    }
    else {
      const exist = array.includes(payload)
      if (!exist) {
        modelValue.value = [...array, payload]
        emits('addTag', payload)
        return true
      }
      else {
        isInvalidInput.value = true
      }
    }
    emits('invalid', payload)
    return false
  },
  onRemoveValue: handleRemoveTag,
  onInputKeydown: (event) => {
    const target = event.target as HTMLInputElement
    const collection = getItems().map(i => i.ref).filter(i => i.dataset.disabled !== '')
    if (!collection.length)
      return
    const lastTag = collection.at(-1)
    switch (event.key) {
      case 'Delete':
      case 'Backspace': {
        if (target.selectionStart !== 0 || target.selectionEnd !== 0)
          break

        if (selectedElement.value) {
          const index = collection.findIndex(i => i === selectedElement.value)
          handleRemoveTag(index)
          selectedElement.value = selectedElement.value === lastTag ? collection.at(index - 1) : collection.at(index + 1)
          event.preventDefault()
        }
        else if (event.key === 'Backspace') {
          selectedElement.value = lastTag
          event.preventDefault()
        }
        break
      }
      case 'Home':
      case 'End':
      case 'ArrowRight':
      case 'ArrowLeft': {
        const isArrowRight = (event.key === 'ArrowRight' && dir.value === 'ltr') || (event.key === 'ArrowLeft' && dir.value === 'rtl')
        const isArrowLeft = !isArrowRight
        // only focus on tags when cursor is at the first position
        if (target.selectionStart !== 0 || target.selectionEnd !== 0)
          break

        // if you press ArrowLeft, then we last tag
        if (isArrowLeft && !selectedElement.value) {
          selectedElement.value = lastTag
          event.preventDefault()
        }
        // if you press ArrowRight on last tag, you deselect
        else if (isArrowRight && lastTag && selectedElement.value === lastTag) {
          selectedElement.value = undefined
          event.preventDefault()
        }
        else if (selectedElement.value) {
          const el = useArrowNavigation(event, selectedElement.value, undefined, {
            itemsArray: collection,
            loop: false,
            dir: dir.value,
          })
          if (el)
            selectedElement.value = el
          event.preventDefault()
        }
        break
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        if (selectedElement.value)
          event.preventDefault()
        break
      }
      default: {
        selectedElement.value = undefined
      }
    }
  },
  selectedElement,
  isInvalidInput,
  addOnPaste,
  addOnBlur,
  addOnTab,
  dir,
  disabled,
  delimiter,
  max,
  id,
  displayValue: props.displayValue as (value: AcceptableInputValue) => string,
})
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :dir="dir"
      :as="as"
      :as-child="asChild"
      :data-invalid="isInvalidInput ? '' : undefined"
      :data-disabled="disabled ? '' : undefined"
      :data-focused="focused ? '' : undefined"
    >
      <slot :model-value="modelValue" />

      <VisuallyHiddenInput
        v-if="isFormControl && name"
        :name="name"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
      />
    </Primitive>
  </CollectionSlot>
</template>
