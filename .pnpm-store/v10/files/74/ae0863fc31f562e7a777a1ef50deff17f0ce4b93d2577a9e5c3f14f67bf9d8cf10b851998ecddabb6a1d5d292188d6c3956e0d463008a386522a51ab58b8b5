import type { Ref } from 'vue'
import type { AcceptableValue, SingleOrMultipleProps } from './types'
import { useVModel } from '@vueuse/core'
import { isEqual } from 'ohash'
import { computed } from 'vue'
import { isValueEqualOrExist } from './isValueEqualOrExist'

/**
 * Validates the props and it makes sure that the types are coherent with each other
 *
 * 1. If type, defaultValue, and modelValue are all undefined, throw an error.
 * 2. If modelValue and defaultValue are defined and not of the same type, throw an error.
 * 3. If type is defined:
 *    a. If type is 'single' and either modelValue or defaultValue is an array, log an error and return 'multiple'.
 *    b. If type is 'multiple' and neither modelValue nor defaultValue is an array, log an error and return 'single'.
 * 4. Return 'multiple' if modelValue is an array, else return 'single'.
 */
function validateProps({ type, defaultValue, modelValue }: SingleOrMultipleProps) {
  const value = modelValue || defaultValue
  const canTypeBeInferred = modelValue !== undefined || defaultValue !== undefined

  if (canTypeBeInferred)
    return Array.isArray(value) ? 'multiple' : 'single'
  else
    return type ?? 'single' // always fallback to `single`
}

function getDefaultType({ type, defaultValue, modelValue }: SingleOrMultipleProps) {
  if (type)
    return type

  return validateProps({ type, defaultValue, modelValue })
}

function getDefaultValue({ type, defaultValue }: SingleOrMultipleProps) {
  if (defaultValue !== undefined)
    return defaultValue

  return (type === 'single') ? undefined : []
}

export function useSingleOrMultipleValue<P extends SingleOrMultipleProps, Name extends string>(
  props: P,
  emits: (name: Name, ...args: any[]) => void,
) {
  const type = computed(() => getDefaultType(props))
  const modelValue = useVModel(props, 'modelValue', emits, {
    defaultValue: getDefaultValue(props),
    passive: (props.modelValue === undefined) as false,
    deep: true,
  }) as Ref<AcceptableValue | AcceptableValue[] | undefined>

  function changeModelValue(value: AcceptableValue) {
    if (type.value === 'single') {
      modelValue.value = isEqual(value, modelValue.value) ? undefined : value
    }
    else {
      const modelValueArray = Array.isArray(modelValue.value) ? [...(modelValue.value as AcceptableValue[] || [])] : [modelValue.value].filter(Boolean)
      if (isValueEqualOrExist(modelValueArray, value)) {
        const index = modelValueArray.findIndex(i => isEqual(i, value))
        modelValueArray.splice(index, 1)
      }
      else {
        modelValueArray.push(value)
      }
      modelValue.value = modelValueArray
    }
  }

  const isSingle = computed(() => type.value === 'single')

  return {
    modelValue,
    changeModelValue,
    isSingle,
  }
}
