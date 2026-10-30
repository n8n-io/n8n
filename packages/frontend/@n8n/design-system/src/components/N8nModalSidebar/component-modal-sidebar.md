# Component specification

A resizable sidebar for a dialog or another bounded layout. The parent sets the height. The slot supplies the content.

- **Component Name:** N8nModalSidebar
- **Item value:** A list in the slot uses `N8nListbox`. Each row value is a `string`.

## Public API Definition

**Props**

- `side?: 'left' | 'right'` Edge of the parent. The resize handle sits on the inner edge. Place the component on that side. It does not move itself. | `default: 'left'`
- `width?: number` Current width in pixels. Bind with `v-model:width`. | `default: 240`
- `defaultWidth?: number` Width restored on double-click. Defaults to the width at mount.
- `minWidth?: number` Minimum width in pixels. | `default: 160`
- `maxWidth?: number` Maximum width in pixels. | `default: 480`
- `resizable?: boolean` Show the drag handle. | `default: true`
- `label?: string` Accessible name for the sidebar.

The slot has no padding. A list adds its own inset. A form adds its own inset. The sidebar background is `--color--background--light-2`.

**Keyboard list**

Put `N8nListbox` in the slot when the rows are selectable. Arrow keys move the highlight. Enter selects the highlighted row. The selected row keeps its fill when the highlight moves.

Use `variant="flush"` and `size="small"`. Set the row to the menu-item size:

- `--listbox-row-min-height: var(--spacing--xl)` (32px)
- `--listbox-row-padding-block: var(--spacing--4xs)` (4px)
- `--listbox-flush-highlight-inset-inline: var(--spacing--xs)` (12px)
- `--listbox-flush-highlight-inset-block: 0px`
- `--listbox-flush-gap: var(--spacing--5xs)` (2px)
- `--listbox-label-line-height: var(--font-size--lg)`

The flush highlight bleeds by 12px. Pad the list with `padding-block: var(--spacing--xs)` and `padding-inline: calc(var(--spacing--xs) + var(--spacing--xs))`. The highlight then sits 12px in from the sidebar edge. The icon sits 12px in from the highlight. Set `max-height="none"` so the sidebar scrolls, not the list.

Put a delete button or another control in the listbox item `#trailing` slot. The control sits outside the option. It shows when the row is highlighted.

**Events**

- `update:width(width: number)` The width changed. `v-model:width` listens for this.
- `resize(data: ResizeData)` The user is dragging the handle. `data.width` is the next width. `data.direction` is `right` on a left sidebar and `left` on a right sidebar.

**Slots**

- `default` Sidebar body.

**Types**

```typescript
type ModalSidebarSide = 'left' | 'right'

type ModalSidebarProps = {
  side?: ModalSidebarSide;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  label?: string;
}

type ResizeData = {
  height: number;
  width: number;
  dX: number;
  dY: number;
  x: number;
  y: number;
  direction: 'left' | 'right' | 'top' | 'bottom' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}
```

### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  N8nButton,
  N8nDialog,
  N8nDialogBody,
  N8nDialogHeader,
  N8nDialogTitle,
  N8nIcon,
  N8nIconButton,
  N8nListbox,
  N8nListboxItem,
  N8nModalSidebar,
  N8nText,
} from '@n8n/design-system'

const isOpen = ref(false)
const width = ref(240)
const activeId = ref('overview')

const links = ref([
  { id: 'overview', label: 'Overview', icon: 'house' },
  { id: 'workflows', label: 'Workflows', icon: 'workflow' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
])

function deleteLink(id: string) {
  const index = links.value.findIndex((item) => item.id === id)
  links.value = links.value.filter((item) => item.id !== id)
  if (activeId.value !== id) return
  const next = links.value[index] ?? links.value[index - 1]
  activeId.value = next?.id ?? ''
}
</script>

<template>
  <N8nButton label="Open dialog" @click="isOpen = true" />

  <N8nDialog v-model:open="isOpen" size="full" aria-label="Sections" style="height: 70vh;">
    <N8nDialogHeader>
      <N8nDialogTitle>Sections</N8nDialogTitle>
    </N8nDialogHeader>

    <N8nDialogBody style="padding: 0; overflow: hidden;">
      <div style="display: flex; flex: 1; min-height: 0;">
        <N8nModalSidebar v-model:width="width" label="Sections" :min-width="160" :max-width="480">
          <div class="modal-sidebar-list">
            <N8nListbox
              v-model="activeId"
              variant="flush"
              size="small"
              max-height="none"
              aria-label="Sections"
              class="modal-sidebar-listbox"
            >
              <N8nListboxItem
                v-for="item in links"
                :key="item.id"
                :value="item.id"
                :label="item.label"
              >
                <template #leading>
                  <N8nIcon :icon="item.icon" />
                </template>
                <template #trailing>
                  <N8nIconButton
                    icon="trash-2"
                    variant="ghost"
                    size="xsmall"
                    :aria-label="'Delete ' + item.label"
                    @click="deleteLink(item.id)"
                  />
                </template>
              </N8nListboxItem>
            </N8nListbox>
          </div>
        </N8nModalSidebar>

        <div style="flex: 1; min-width: 0; padding: var(--spacing--md);">
          <N8nText bold size="medium">{{ activeId }}</N8nText>
        </div>
      </div>
    </N8nDialogBody>
  </N8nDialog>
</template>

<style>
.modal-sidebar-list {
  padding-block: var(--spacing--xs);
  padding-inline: calc(var(--spacing--xs) + var(--spacing--xs));
}

.modal-sidebar-listbox {
  --listbox-flush-highlight-inset-inline: var(--spacing--xs);
  --listbox-flush-highlight-inset-block: 0px;
  --listbox-flush-gap: var(--spacing--5xs);
  --listbox-row-min-height: var(--spacing--xl);
  --listbox-row-padding-block: var(--spacing--4xs);
  --listbox-label-line-height: var(--font-size--lg);
}
</style>
```
