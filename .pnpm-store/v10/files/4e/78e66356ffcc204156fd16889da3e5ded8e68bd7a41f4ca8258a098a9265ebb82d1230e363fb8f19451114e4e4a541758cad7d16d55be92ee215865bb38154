<script lang="ts">
import type {
  MenuItemEmits,
  MenuItemProps,
} from './MenuItem.vue'
import type { CheckedState } from './utils'

export type MenuCheckboxItemEmits = MenuItemEmits & {
  /** Event handler called when the checked state changes. */
  'update:modelValue': [payload: boolean]
}

export interface MenuCheckboxItemProps extends MenuItemProps {
  /** The controlled checked state of the item. Can be used as `v-model`. */
  modelValue?: CheckedState
}
</script>

<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import MenuItem from './MenuItem.vue'
import { provideMenuItemIndicatorContext } from './MenuItemIndicator.vue'
import { getCheckedState, isIndeterminate } from './utils'

const props = withDefaults(defineProps<MenuCheckboxItemProps>(), {
  modelValue: false,
})
const emits = defineEmits<MenuCheckboxItemEmits>()

defineSlots<{
  default?: (props: {
    /** Current modelValue state */
    modelValue: typeof modelValue.value
  }) => any
}>()

const modelValue = useVModel(props, 'modelValue', emits)

provideMenuItemIndicatorContext({ modelValue })
</script>

<template>
  <MenuItem
    role="menuitemcheckbox"
    v-bind="props"
    :aria-checked="isIndeterminate(modelValue) ? 'mixed' : modelValue"
    :data-state="getCheckedState(modelValue)"
    @select="
      async (event) => {
        emits('select', event);
        if (isIndeterminate(modelValue)) {
          modelValue = true;
        }
        else {
          modelValue = !modelValue;
        }
      }
    "
  >
    <slot :model-value="modelValue" />
  </MenuItem>
</template>
