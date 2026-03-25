<script lang="ts">
import type { PrimitiveProps } from '@/Primitive'
import { useCollection } from '@/Collection'
import { useForwardExpose } from '@/shared'

export type NavigationMenuLinkEmits = {
  /**
   * Event handler called when the user selects a link (via mouse or keyboard).
   *
   * Calling `event.preventDefault` in this handler will prevent the navigation menu from closing when selecting that link.
   */
  select: [payload: CustomEvent<{ originalEvent: Event }>]
}
export interface NavigationMenuLinkProps extends PrimitiveProps {
  /** Used to identify the link as the currently active page. */
  active?: boolean
}
</script>

<script setup lang="ts">
import { Primitive } from '@/Primitive'
import { EVENT_ROOT_CONTENT_DISMISS, LINK_SELECT } from './utils'

const props = withDefaults(defineProps<NavigationMenuLinkProps>(), {
  as: 'a',
})

const emits = defineEmits<NavigationMenuLinkEmits>()

const { CollectionItem } = useCollection({ key: 'NavigationMenu' })
useForwardExpose()

async function handleClick(ev: MouseEvent) {
  const linkSelectEvent = new CustomEvent(LINK_SELECT, {
    bubbles: true,
    cancelable: true,
    detail: {
      originalEvent: ev,
    },
  })
  emits('select', linkSelectEvent)

  if (!linkSelectEvent.defaultPrevented && !ev.metaKey) {
    const rootContentDismissEvent = new CustomEvent(
      EVENT_ROOT_CONTENT_DISMISS,
      {
        bubbles: true,
        cancelable: true,
      },
    )
    ev.target?.dispatchEvent(rootContentDismissEvent)
  }
}
</script>

<template>
  <CollectionItem>
    <Primitive
      :as="as"
      :data-active="active ? '' : undefined"
      :aria-current="active ? 'page' : undefined"
      :as-child="props.asChild"
      @click="handleClick"
    >
      <slot />
    </Primitive>
  </CollectionItem>
</template>
