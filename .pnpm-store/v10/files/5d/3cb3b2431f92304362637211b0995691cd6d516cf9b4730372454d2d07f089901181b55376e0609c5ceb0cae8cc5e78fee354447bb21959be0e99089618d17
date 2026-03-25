<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useId } from '@/shared'
import { PRECISION } from './utils/constants'

export interface SplitterPanelProps extends PrimitiveProps {
  /** The size of panel when it is collapsed. */
  collapsedSize?: number
  /** Should panel collapse when resized beyond its `minSize`. When `true`, it will be collapsed to `collapsedSize`. */
  collapsible?: boolean
  /** Initial size of panel (numeric value between 1-100) */
  defaultSize?: number
  /** Panel id (unique within group); falls back to `useId` when not provided */
  id?: string
  /** The maximum allowable size of panel (numeric value between 1-100); defaults to `100` */
  maxSize?: number
  /** The minimum allowable size of panel (numeric value between 1-100); defaults to `10` */
  minSize?: number
  /** The order of panel within group; required for groups with conditionally rendered panels */
  order?: number
}

export type SplitterPanelEmits = {
  /** Event handler called when panel is collapsed. */
  collapse: []
  /** Event handler called when panel is expanded. */
  expand: []
  /** Event handler called when panel is resized; size parameter is a numeric value between 1-100.  */
  resize: [size: number, prevSize: number | undefined]
}

export type PanelOnCollapse = () => void
export type PanelOnExpand = () => void
export type PanelOnResize = (
  size: number,
  prevSize: number | undefined
) => void

export type PanelCallbacks = {
  onCollapse?: PanelOnCollapse
  onExpand?: PanelOnExpand
  onResize?: PanelOnResize
}

export type PanelConstraints = {
  collapsedSize?: number | undefined
  collapsible?: boolean | undefined
  defaultSize?: number | undefined
  /** Panel id (unique within group); falls back to useId when not provided */
  maxSize?: number | undefined
  minSize?: number | undefined
}

export type PanelData = {
  callbacks: PanelCallbacks
  constraints: PanelConstraints
  id: string
  idIsFromProps: boolean
  order: number | undefined
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { Primitive } from '@/Primitive'
import { injectPanelGroupContext } from './SplitterGroup.vue'

const props = defineProps<SplitterPanelProps>()
const emits = defineEmits<SplitterPanelEmits>()

defineSlots<{
  default?: (props: {
    /** Is the panel collapsed */
    isCollapsed: typeof isCollapsed.value
    /** Is the panel expanded */
    isExpanded: typeof isExpanded.value
    /** If panel is `collapsible`, collapse it fully. */
    collapse: typeof collapse
    /** If panel is currently collapsed, expand it to its most recent size. */
    expand: typeof expand
    /** Resize panel to the specified percentage (1 - 100). */
    resize: typeof resize
  }) => any
}>()

const panelGroupContext = injectPanelGroupContext()
if (panelGroupContext === null) {
  throw new Error(
    'SplitterPanel components must be rendered within a SplitterGroup container',
  )
}

const { collapsePanel, expandPanel, getPanelSize, getPanelStyle, isPanelCollapsed, resizePanel, groupId, reevaluatePanelConstraints, registerPanel, unregisterPanel } = panelGroupContext
const panelId = useId(props.id, 'reka-splitter-panel')

const panelDataRef = computed(() => ({
  callbacks: {
    onCollapse: () => emits('collapse'),
    onExpand: () => emits('expand'),
    onResize: (...args) => emits('resize', ...args),
  },
  constraints: {
    collapsedSize: props.collapsedSize && Number.parseFloat(props.collapsedSize.toFixed(PRECISION)),
    collapsible: props.collapsible,
    defaultSize: props.defaultSize,
    /** Panel id (unique within group); falls back to useId when not provided */
    /** Panel id (unique within group); falls back to useId when not provided */
    maxSize: props.maxSize,
    minSize: props.minSize,
  },
  id: panelId,
  idIsFromProps: props.id !== undefined,
  order: props.order,
}) satisfies PanelData)

watch(() => panelDataRef.value.constraints, (constraints, prevConstraints) => {
  // If constraints have changed, we should revisit panel sizes.
  // This is uncommon but may happen if people are trying to implement pixel based constraints.
  if (
    prevConstraints.collapsedSize !== constraints.collapsedSize
    || prevConstraints.collapsible !== constraints.collapsible
    || prevConstraints.maxSize !== constraints.maxSize
    || prevConstraints.minSize !== constraints.minSize
  ) {
    reevaluatePanelConstraints(panelDataRef.value, prevConstraints)
  }
}, { deep: true })

onMounted(() => {
  const panelData = panelDataRef.value
  registerPanel(panelData)
  onUnmounted(() => {
    unregisterPanel(panelData)
  })
})

const style = computed(() => getPanelStyle(panelDataRef.value, props.defaultSize))
/** Panel id (unique within group); falls back to useId when not provided */

const isCollapsed = computed(() => isPanelCollapsed(panelDataRef.value))
const isExpanded = computed(() => !isCollapsed.value)

function collapse() {
  collapsePanel(panelDataRef.value)
}

function expand() {
  expandPanel(panelDataRef.value)
}

function resize(size: number) {
  resizePanel(panelDataRef.value, size)
}

defineExpose({
  /** If panel is `collapsible`, collapse it fully. */
  collapse,
  /** If panel is currently collapsed, expand it to its most recent size. */
  expand,
  /** Gets the current size of the panel as a percentage (1 - 100). */
  getSize() {
    return getPanelSize(panelDataRef.value)
  },
  /** Resize panel to the specified percentage (1 - 100). */
  resize,
  /** Returns `true` if the panel is currently collapsed */
  isCollapsed,
  /** Returns `true` if the panel is currently not collapsed */
  isExpanded,
})
</script>

<template>
  <Primitive
    :id="panelId"
    :style="style"
    :as="as"
    :as-child="asChild"
    data-panel=""
    :data-panel-collapsible="collapsible || undefined"
    :data-panel-group-id="groupId"
    :data-panel-id="panelId"
    :data-panel-size=" Number.parseFloat(`${style.flexGrow}`).toFixed(1)"
    :data-state="collapsible ? isCollapsed ? 'collapsed' : 'expanded' : undefined"
  >
    <slot
      :is-collapsed="isCollapsed"
      :is-expanded="isExpanded"
      :expand="expand"
      :collapse="collapse"
      :resize="resize"
    />
  </Primitive>
</template>
