<script lang="ts">
import type {
  SelectContentImplEmits,
  SelectContentImplProps,
} from './SelectContentImpl.vue'
import { computed, onMounted, ref, watch } from 'vue'

export type SelectContentEmits = SelectContentImplEmits

export interface SelectContentProps extends SelectContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean
}
</script>

<script setup lang="ts">
import { Presence } from '@/Presence'
import { useForwardPropsEmits } from '@/shared'
import SelectContentImpl from './SelectContentImpl.vue'
import SelectProvider from './SelectProvider.vue'
import { injectSelectRootContext } from './SelectRoot.vue'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<SelectContentProps>()

const emits = defineEmits<SelectContentEmits>()
const forwarded = useForwardPropsEmits(props, emits)

const rootContext = injectSelectRootContext()

const fragment = ref<DocumentFragment>()
onMounted(() => {
  fragment.value = new DocumentFragment()
})

const presenceRef = ref<InstanceType<typeof Presence>>()

const present = computed(() => props.forceMount || rootContext.open.value)
const renderPresence = ref(present.value)

watch(present, () => {
  // Toggle render presence after a delay (nextTick is not enough)
  // to allow children to re-render with the latest state.
  // Otherwise, they would remain in the old state during the transition,
  // which would prevent the animation that depend on state (e.g., data-[state=closed])
  // from being applied accurately.
  // @see https://github.com/unovue/reka-ui/issues/1865
  setTimeout(() => renderPresence.value = present.value)
})
</script>

<template>
  <Presence
    v-if="present || renderPresence || presenceRef?.present"
    ref="presenceRef"
    :present="present"
  >
    <SelectContentImpl v-bind="{ ...forwarded, ...$attrs }">
      <slot />
    </SelectContentImpl>
  </Presence>

  <div v-else-if="fragment">
    <Teleport :to="fragment">
      <SelectProvider :context="rootContext">
        <slot />
      </SelectProvider>
    </Teleport>
  </div>
</template>
