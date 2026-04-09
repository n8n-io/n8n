<script lang="ts">
import type {
  MenuItemEmits,
  MenuItemProps,
} from './MenuItem.vue'
import type { AcceptableValue } from '@/shared/types'
import { reactiveOmit } from '@vueuse/shared'
import { useForwardProps } from '@/shared'

export type MenuRadioItemEmits = MenuItemEmits

export interface MenuRadioItemProps extends MenuItemProps {
  /** The unique value of the item. */
  value: AcceptableValue
}
</script>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import MenuItem from './MenuItem.vue'
import { provideMenuItemIndicatorContext } from './MenuItemIndicator.vue'
import { injectMenuRadioGroupContext } from './MenuRadioGroup.vue'
import { getCheckedState } from './utils'

const props = defineProps<MenuRadioItemProps>()
const emits = defineEmits<MenuRadioItemEmits>()

const delegatedProps = reactiveOmit(props, ['value'])
const forwarded = useForwardProps(delegatedProps)

const { value } = toRefs(props)
const radioGroupContext = injectMenuRadioGroupContext()
const modelValue = computed(
  () => radioGroupContext.modelValue.value === value?.value,
)

provideMenuItemIndicatorContext({ modelValue })
</script>

<template>
  <MenuItem
    role="menuitemradio"
    v-bind="forwarded"
    :aria-checked="modelValue"
    :data-state="getCheckedState(modelValue)"
    @select="
      async (event) => {
        emits('select', event);
        radioGroupContext.onValueChange(value);
      }
    "
  >
    <slot />
  </MenuItem>
</template>
