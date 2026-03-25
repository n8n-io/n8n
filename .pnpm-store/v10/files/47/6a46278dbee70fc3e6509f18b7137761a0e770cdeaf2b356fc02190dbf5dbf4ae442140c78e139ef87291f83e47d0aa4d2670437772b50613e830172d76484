<script lang="ts">
import type { DateValue } from '@internationalized/date'
import type { Ref } from 'vue'
import type { Matcher } from '@/date'
import type { PrimitiveProps } from '@/Primitive'
import type { DateStep, Formatter } from '@/shared'
import type { Granularity, HourCycle, SegmentPart, SegmentValueObj } from '@/shared/date'
import type { Direction, FormFieldProps } from '@/shared/types'
import { hasTime, isBefore } from '@/date'
import { createContext, isNullish, useDateFormatter, useDirection, useKbd, useLocale } from '@/shared'
import {
  createContent,
  getDefaultDate,
  getSegmentElements,
  initializeSegmentValues,
  isSegmentNavigationKey,
  normalizeDateStep,
  normalizeHourCycle,
  syncSegmentValues,
} from '@/shared/date'

type DateFieldRootContext = {
  locale: Ref<string>
  modelValue: Ref<DateValue | undefined>
  placeholder: Ref<DateValue>
  isDateUnavailable?: Matcher
  isInvalid: Ref<boolean>
  disabled: Ref<boolean>
  readonly: Ref<boolean>
  formatter: Formatter
  hourCycle: HourCycle
  step: Ref<DateStep>
  segmentValues: Ref<SegmentValueObj>
  segmentContents: Ref<{ part: SegmentPart, value: string }[]>
  elements: Ref<Set<HTMLElement>>
  focusNext: () => void
  setFocusedElement: (el: HTMLElement) => void
}

export interface DateFieldRootProps extends PrimitiveProps, FormFieldProps {
  /** The default value for the calendar */
  defaultValue?: DateValue
  /** The default placeholder date */
  defaultPlaceholder?: DateValue
  /** The placeholder date, which is used to determine what month to display when no date is selected. This updates as the user navigates the calendar and can be used to programmatically control the calendar view */
  placeholder?: DateValue
  /** The controlled checked state of the calendar. Can be bound as `v-model`. */
  modelValue?: DateValue | null
  /** The hour cycle used for formatting times. Defaults to the local preference */
  hourCycle?: HourCycle
  /** The stepping interval for the time fields. Defaults to `1`. */
  step?: DateStep
  /** The granularity to use for formatting times. Defaults to day if a CalendarDate is provided, otherwise defaults to minute. The field will render segments for each part of the date up to and including the specified granularity */
  granularity?: Granularity
  /** Whether or not to hide the time zone segment of the field */
  hideTimeZone?: boolean
  /** The maximum date that can be selected */
  maxValue?: DateValue
  /** The minimum date that can be selected */
  minValue?: DateValue
  /** The locale to use for formatting dates */
  locale?: string
  /** Whether or not the date field is disabled */
  disabled?: boolean
  /** Whether or not the date field is readonly */
  readonly?: boolean
  /** A function that returns whether or not a date is unavailable */
  isDateUnavailable?: Matcher
  /** Id of the element */
  id?: string
  /** The reading direction of the date field when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction
}

export type DateFieldRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateValue | undefined]
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue]
}

export const [injectDateFieldRootContext, provideDateFieldRootContext]
  = createContext<DateFieldRootContext>('DateFieldRoot')
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { computed, nextTick, onMounted, ref, toRefs, watch } from 'vue'
import { Primitive, usePrimitiveElement } from '@/Primitive'
import { VisuallyHidden } from '@/VisuallyHidden'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DateFieldRootProps>(), {
  defaultValue: undefined,
  disabled: false,
  readonly: false,
  placeholder: undefined,
  isDateUnavailable: undefined,
})
const emits = defineEmits<DateFieldRootEmits>()
defineSlots<{
  default?: (props: {
    /** The current date of the field */
    modelValue: DateValue | undefined
    /** The date field segment contents */
    segments: { part: SegmentPart, value: string }[]
    /** Value if the input is invalid */
    isInvalid: boolean
  }) => any
}>()

const { disabled, readonly, isDateUnavailable: propsIsDateUnavailable, granularity, defaultValue, dir: propDir, locale: propLocale } = toRefs(props)
const locale = useLocale(propLocale)
const dir = useDirection(propDir)

const formatter = useDateFormatter(locale.value, {
  hourCycle: normalizeHourCycle(props.hourCycle),
})
const { primitiveElement, currentElement: parentElement }
  = usePrimitiveElement()
const segmentElements = ref<Set<HTMLElement>>(new Set())

onMounted(() => {
  getSegmentElements(parentElement.value).forEach(item => segmentElements.value.add(item as HTMLElement))
})

const modelValue = useVModel(props, 'modelValue', emits, {
  defaultValue: defaultValue.value,
  passive: (props.modelValue === undefined) as false,
}) as Ref<DateValue>

const defaultDate = getDefaultDate({
  defaultPlaceholder: props.placeholder,
  granularity: granularity.value,
  defaultValue: modelValue.value,
  locale: props.locale,
})

const placeholder = useVModel(props, 'placeholder', emits, {
  defaultValue: props.defaultPlaceholder ?? defaultDate.copy(),
  passive: (props.placeholder === undefined) as false,
}) as Ref<DateValue>

const step = computed(() => normalizeDateStep(props))

const inferredGranularity = computed(() => {
  if (props.granularity)
    return !hasTime(placeholder.value) ? 'day' : props.granularity

  return hasTime(placeholder.value) ? 'minute' : 'day'
})

const isInvalid = computed(() => {
  if (!modelValue.value)
    return false

  if (propsIsDateUnavailable.value?.(modelValue.value))
    return true

  if (props.minValue && isBefore(modelValue.value, props.minValue))
    return true

  if (props.maxValue && isBefore(props.maxValue, modelValue.value))
    return true

  return false
})

const initialSegments = initializeSegmentValues(inferredGranularity.value)

const segmentValues = ref<SegmentValueObj>(modelValue.value ? { ...syncSegmentValues({ value: modelValue.value, formatter }) } : { ...initialSegments })

const allSegmentContent = computed(() => createContent({
  granularity: inferredGranularity.value,
  dateRef: placeholder.value,
  formatter,
  hideTimeZone: props.hideTimeZone,
  hourCycle: props.hourCycle,
  segmentValues: segmentValues.value,
  locale,
}))

const segmentContents = computed(() => allSegmentContent.value.arr)

const editableSegmentContents = computed(() => segmentContents.value.filter(({ part }) => part !== 'literal'))

watch(locale, (value) => {
  if (formatter.getLocale() !== value) {
    formatter.setLocale(value)
    // Locale changed, so we need to clear the segment elements and re-get them (different order)
    // Get the focusable elements again on the next tick
    nextTick(() => {
      segmentElements.value.clear()
      getSegmentElements(parentElement.value).forEach(item => segmentElements.value.add(item as HTMLElement))
    })
  }
})

watch(modelValue, (_modelValue) => {
  if (!isNullish(_modelValue) && placeholder.value.compare(_modelValue) !== 0) {
    placeholder.value = _modelValue.copy()
  }
})

watch([modelValue, locale], ([_modelValue]) => {
  if (!isNullish(_modelValue)) {
    segmentValues.value = { ...syncSegmentValues({ value: _modelValue, formatter }) }
  }
  // If segment has null value, means that user modified it, thus do not reset the segmentValues
  else if (Object.values(segmentValues.value).every(value => value !== null) && isNullish(_modelValue)) {
    segmentValues.value = { ...initialSegments }
  }
})

const currentFocusedElement = ref<HTMLElement | null>(null)

const currentSegmentIndex = computed(() =>
  Array.from(segmentElements.value).findIndex(el =>
    el.getAttribute('data-reka-date-field-segment')
    === currentFocusedElement.value?.getAttribute('data-reka-date-field-segment')))

const nextFocusableSegment = computed(() => {
  const sign = dir.value === 'rtl' ? -1 : 1
  const nextCondition = sign < 0 ? currentSegmentIndex.value < 0 : currentSegmentIndex.value > segmentElements.value.size - 1
  if (nextCondition)
    return null
  const segmentToFocus = Array.from(segmentElements.value)[currentSegmentIndex.value + sign]
  return segmentToFocus
})

const prevFocusableSegment = computed(() => {
  const sign = dir.value === 'rtl' ? -1 : 1
  const prevCondition = sign > 0 ? currentSegmentIndex.value < 0 : currentSegmentIndex.value > segmentElements.value.size - 1
  if (prevCondition)
    return null

  const segmentToFocus = Array.from(segmentElements.value)[currentSegmentIndex.value - sign]
  return segmentToFocus
})

const kbd = useKbd()

function handleKeydown(e: KeyboardEvent) {
  if (!isSegmentNavigationKey(e.key))
    return
  if (e.key === kbd.ARROW_LEFT)
    prevFocusableSegment.value?.focus()
  if (e.key === kbd.ARROW_RIGHT)
    nextFocusableSegment.value?.focus()
}

function setFocusedElement(el: HTMLElement) {
  currentFocusedElement.value = el
}

provideDateFieldRootContext({
  isDateUnavailable: propsIsDateUnavailable.value,
  locale,
  modelValue,
  placeholder,
  disabled,
  formatter,
  hourCycle: props.hourCycle,
  step,
  readonly,
  segmentValues,
  isInvalid,
  segmentContents: editableSegmentContents,
  elements: segmentElements,
  setFocusedElement,
  focusNext() {
    nextFocusableSegment.value?.focus()
  },
})

defineExpose({
  /** Helper to set the focused element inside the DateField */
  setFocusedElement,
})
</script>

<template>
  <Primitive
    v-bind="$attrs"
    ref="primitiveElement"
    role="group"
    :aria-disabled="disabled ? true : undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readonly ? '' : undefined"
    :data-invalid="isInvalid ? '' : undefined"
    :dir="dir"
    @keydown.left.right="handleKeydown"
  >
    <slot
      :model-value="modelValue"
      :segments="segmentContents"
      :is-invalid="isInvalid"
    />

    <VisuallyHidden
      :id="id"
      as="input"
      feature="focusable"
      tabindex="-1"
      :value="modelValue ? modelValue.toString() : ''"
      :name="name"
      :disabled="disabled"
      :required="required"
      @focus="Array.from(segmentElements)?.[0]?.focus()"
    />
  </Primitive>
</template>
