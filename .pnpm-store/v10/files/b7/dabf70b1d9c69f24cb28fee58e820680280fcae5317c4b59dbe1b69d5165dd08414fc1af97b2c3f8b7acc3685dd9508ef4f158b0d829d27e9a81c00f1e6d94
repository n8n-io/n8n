<script lang="ts">
import type { DateValue } from '@internationalized/date'

import type { Ref } from 'vue'
import type { CalendarRootProps, DateFieldRoot, DateFieldRootProps, PopoverRootEmits, PopoverRootProps } from '..'
import type { Matcher, WeekDayFormat } from '@/date'
import type { DateStep, Granularity, HourCycle } from '@/shared/date'
import type { Direction } from '@/shared/types'
import { computed, ref, toRefs, watch } from 'vue'
import { createContext, useDirection } from '@/shared'
import { getDefaultDate } from '@/shared/date'
import { PopoverRoot } from '..'

type DatePickerRootContext = {
  id: Ref<string | undefined>
  name: Ref<string | undefined>
  minValue: Ref<DateValue | undefined>
  maxValue: Ref<DateValue | undefined>
  hourCycle: Ref<HourCycle | undefined>
  granularity: Ref<Granularity | undefined>
  hideTimeZone: Ref<boolean>
  required: Ref<boolean>
  locale: Ref<string>
  dateFieldRef: Ref<InstanceType<typeof DateFieldRoot> | undefined>
  modelValue: Ref<DateValue | undefined>
  placeholder: Ref<DateValue>
  pagedNavigation: Ref<boolean>
  preventDeselect: Ref<boolean>
  weekStartsOn: Ref<0 | 1 | 2 | 3 | 4 | 5 | 6>
  weekdayFormat: Ref<WeekDayFormat>
  fixedWeeks: Ref<boolean>
  numberOfMonths: Ref<number>
  disabled: Ref<boolean>
  readonly: Ref<boolean>
  isDateDisabled?: Matcher
  isDateUnavailable?: Matcher
  defaultOpen: Ref<boolean>
  open: Ref<boolean>
  modal: Ref<boolean>
  onDateChange: (date: DateValue | undefined) => void
  onPlaceholderChange: (date: DateValue) => void
  dir: Ref<Direction>
  step: Ref<DateStep | undefined>
  closeOnSelect: Ref<boolean>
}

export type DatePickerRootProps = DateFieldRootProps & PopoverRootProps & Pick<CalendarRootProps, 'isDateDisabled' | 'pagedNavigation' | 'weekStartsOn' | 'weekdayFormat' | 'fixedWeeks' | 'numberOfMonths' | 'preventDeselect'> & {
  /** Whether or not to close the popover on date select */
  closeOnSelect?: boolean
}

export type DatePickerRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateValue | undefined]
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue]
}

export const [injectDatePickerRootContext, provideDatePickerRootContext]
  = createContext<DatePickerRootContext>('DatePickerRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'

defineOptions({
  inheritAttrs: false,
})
const props = withDefaults(defineProps<DatePickerRootProps>(), {
  defaultValue: undefined,
  defaultOpen: false,
  open: undefined,
  modal: false,
  pagedNavigation: false,
  preventDeselect: false,
  weekStartsOn: 0,
  weekdayFormat: 'narrow',
  fixedWeeks: false,
  numberOfMonths: 1,
  disabled: false,
  readonly: false,
  placeholder: undefined,
  locale: 'en',
  isDateDisabled: undefined,
  isDateUnavailable: undefined,
  closeOnSelect: false,
})
const emits = defineEmits<DatePickerRootEmits & PopoverRootEmits>()
const {
  locale,
  disabled,
  readonly,
  pagedNavigation,
  weekStartsOn,
  weekdayFormat,
  fixedWeeks,
  numberOfMonths,
  preventDeselect,
  isDateDisabled: propsIsDateDisabled,
  isDateUnavailable: propsIsDateUnavailable,
  defaultOpen,
  modal,
  id,
  name,
  required,
  minValue,
  maxValue,
  granularity,
  hideTimeZone,
  hourCycle,
  defaultValue,
  dir: propDir,
  step,
  closeOnSelect,
} = toRefs(props)

const dir = useDirection(propDir)

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: defaultValue.value,
  passive: (props.modelValue === undefined) as false,
}) as Ref<DateValue | undefined>

const defaultDate = computed(() => getDefaultDate({
  defaultPlaceholder: props.placeholder,
  granularity: props.granularity,
  defaultValue: modelValue.value,
  locale: props.locale,
}))

const placeholder = useVModel(props, 'placeholder', emits, {
  defaultValue: props.defaultPlaceholder ?? defaultDate.value.copy(),
  passive: (props.placeholder === undefined) as false,
}) as Ref<DateValue>

const open = useVModel(props, 'open', emits, {
  defaultValue: defaultOpen.value,
  passive: (props.open === undefined) as false,
}) as Ref<boolean>

const dateFieldRef = ref<InstanceType<typeof DateFieldRoot> | undefined>()

watch(modelValue, (value) => {
  if (value && value.compare(placeholder.value) !== 0) {
    placeholder.value = value.copy()
  }
  if (closeOnSelect.value) {
    open.value = false
  }
})

provideDatePickerRootContext({
  isDateUnavailable: propsIsDateUnavailable.value,
  isDateDisabled: propsIsDateDisabled.value,
  locale,
  disabled,
  pagedNavigation,
  weekStartsOn,
  weekdayFormat,
  fixedWeeks,
  numberOfMonths,
  readonly,
  preventDeselect,
  modelValue,
  placeholder,
  defaultOpen,
  modal,
  open,
  id,
  name,
  required,
  minValue,
  maxValue,
  granularity,
  hideTimeZone,
  hourCycle,
  dateFieldRef,
  dir,
  step,
  onDateChange(date: DateValue | undefined) {
    if (!date || !modelValue.value) {
      modelValue.value = date?.copy() ?? undefined
    }
    else if (!preventDeselect.value && date && modelValue.value.compare(date) === 0) {
      modelValue.value = undefined
    }
    else {
      modelValue.value = date.copy()
    }
  },
  onPlaceholderChange(date: DateValue) {
    placeholder.value = date.copy()
  },
  closeOnSelect,
})
</script>

<template>
  <PopoverRoot
    v-model:open="open"
    :default-open="defaultOpen"
    :modal="modal"
  >
    <slot />
  </PopoverRoot>
</template>
