# Component specification

A menu that opens at the pointer on right-click or long-press. Built on Reka UI `ContextMenu`.

- **Component Name:** N8nContextMenu
- **Reka UI Component:** [Context Menu](https://reka-ui.com/docs/components/context-menu)

## Public API Definition

**Props**

- `id?: string`
- `items: Array<ContextMenuNode<T>>` Root list. May mix rows (`item`, `checkbox`) and sections (`group`, `submenu`, `radio-group`). `radio` is not a node; nest it in `radio-group`. A separator renders before each section that follows another node.
- `open?: boolean` Controlled open state
- `defaultOpen?: boolean` Initial open state when uncontrolled
- `selectedValues?: T[]` Controlled selected **item** ids
- `defaultSelectedValues?: T[]` Initial selected ids when `selectedValues` is omitted
- `disabled?: boolean` Disables the **trigger**. | `default: false`
- `loading?: boolean` | `default: false`
- `loadingItemCount?: number` | `default: 3`
- `contentClass?: string` Class on the root menu content (max-height and other constraints).
- `modal?: boolean` When `true`, blocks pointer events on the rest of the page while the menu is open. Canvas menus set this to `false`. | `default: true`

**Events**

- `update:open(open: boolean)` Open state
- `update:selectedValues(value: T[])` Full selected-id list after a radio or checkbox change
- `select(value: T)` A command (`type: 'item'`) was chosen. Radio and checkbox do not emit this. Menu closes unless `keepOpen`.
- `submenu:toggle(itemId: T, open: boolean)` A `submenu` flyout opened or closed.
- `close-auto-focus(event: Event)` Focus is about to return to the trigger as the menu closes. `preventDefault` to hand focus to another layer (popover, inline rename).

**Slots**

- `trigger` Target element. Omit in coordinate mode
- `item` `{ item: ContextMenuLeaf<T> }` Replaces default `N8nContextMenuItem`. Re-render `N8nContextMenuItem` so the row keeps selection and keyboard behaviour.
- `item-leading` `{ item: ContextMenuLeaf<T>, ui: { class: string } }`
- `item-label` `{ item: ContextMenuLeaf<T>, ui: { class: string } }`
- `item-trailing` `{ item: ContextMenuLeaf<T>, ui: { class: string } }`
- `loading`
- `empty` Root empty state

**Exposed methods**

- `open(position?: [number, number])` Opens the menu. Pass pointer coordinates when there is no trigger (coordinate mode).
- `close()` Closes the menu.

**Types**

```typescript
import type { ClassValue } from 'clsx'
import type { IconOrEmoji, KeyboardShortcut } from '@n8n/design-system'

type ContextMenuLeafBase<T> = {
  id: T;
  label: string;
  icon?: IconOrEmoji;
  shortcut?: KeyboardShortcut;
  disabled?: boolean;
  class?: ClassValue;
};

type ContextMenuItem<T = string> = ContextMenuLeafBase<T> & {
  type: 'item';
  keepOpen?: boolean;
  variant?: 'default' | 'destructive';
};

type ContextMenuRadio<T = string> = ContextMenuLeafBase<T> & {
  type: 'radio';
};

type ContextMenuCheckbox<T = string> = ContextMenuLeafBase<T> & {
  type: 'checkbox';
};

type ContextMenuGroup<T = string> = {
  type: 'group';
  id: T;
  label?: string;
  class?: ClassValue;
  children: Array<ContextMenuNode<T>>;
};

type ContextMenuSubmenu<T = string> = ContextMenuLeafBase<T> & {
  type: 'submenu';
  children: Array<ContextMenuNode<T>>;
  loading?: boolean;
  loadingItemCount?: number;
};

type ContextMenuRadioGroup<T = string> = {
  type: 'radio-group';
  id: T;
  label?: string;
  class?: ClassValue;
  children: Array<ContextMenuRadio<T>>;
};

type ContextMenuNode<T = string> =
  | ContextMenuItem<T>
  | ContextMenuCheckbox<T>
  | ContextMenuGroup<T>
  | ContextMenuSubmenu<T>
  | ContextMenuRadioGroup<T>;

type ContextMenuLeaf<T = string> =
  | ContextMenuItem<T>
  | ContextMenuRadio<T>
  | ContextMenuCheckbox<T>
  | ContextMenuSubmenu<T>;
```

### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  N8nBadge,
  N8nButton,
  N8nContextMenu,
  N8nIcon,
  N8nKeyboardShortcut,
} from '@n8n/design-system'
import type { ContextMenuNode } from '@n8n/design-system'

const selectedValues = ref(['snap-grid', 'show-grid'])

const items: ContextMenuNode[] = [
  {
    type: 'group',
    id: 'edit',
    children: [
      {
        type: 'item',
        id: 'open',
        label: 'Open',
        icon: { type: 'icon', value: 'external-link' },
        shortcut: { metaKey: true, keys: ['O'] },
      },
      {
        type: 'item',
        id: 'share',
        label: 'Share',
        icon: { type: 'icon', value: 'share-2' },
      },
      {
        type: 'item',
        id: 'duplicate',
        label: 'Duplicate',
        icon: { type: 'icon', value: 'copy' },
        disabled: true,
      },
    ],
  },
  {
    type: 'submenu',
    id: 'insert',
    label: 'Insert',
    icon: { type: 'icon', value: 'plus' },
    children: [
      { type: 'item', id: 'insert-node', label: 'Node' },
      { type: 'item', id: 'insert-sticky', label: 'Sticky note' },
      {
        type: 'submenu',
        id: 'insert-sub-workflow',
        label: 'Sub-workflow',
        children: [
          { type: 'item', id: 'insert-sub-workflow-file', label: 'From file' },
          { type: 'item', id: 'insert-sub-workflow-url', label: 'From URL' },
          {
            type: 'submenu',
            id: 'insert-sub-workflow-templates',
            label: 'From template',
            children: [
              { type: 'item', id: 'insert-template-http', label: 'HTTP Request' },
              { type: 'item', id: 'insert-template-ai', label: 'AI Agent' },
            ],
          },
        ],
      },
    ],
  },
  {
    type: 'submenu',
    id: 'export',
    label: 'Export as…',
    icon: { type: 'icon', value: 'download' },
    children: [
      { type: 'item', id: 'export-json', label: 'JSON' },
      {
        type: 'submenu',
        id: 'export-csv',
        label: 'CSV',
        children: [
          { type: 'item', id: 'export-csv-comma', label: 'Comma' },
          { type: 'item', id: 'export-csv-tab', label: 'Tab' },
          {
            type: 'submenu',
            id: 'export-csv-custom',
            label: 'Custom delimiter',
            children: [
              { type: 'item', id: 'export-csv-semicolon', label: 'Semicolon' },
              { type: 'item', id: 'export-csv-pipe', label: 'Pipe' },
            ],
          },
        ],
      },
      {
        type: 'submenu',
        id: 'export-spreadsheet',
        label: 'Spreadsheet',
        children: [
          { type: 'item', id: 'export-xlsx', label: 'Excel' },
          {
            type: 'submenu',
            id: 'export-sheets',
            label: 'Google Sheets',
            children: [
              { type: 'item', id: 'export-sheets-new', label: 'New spreadsheet' },
              { type: 'item', id: 'export-sheets-existing', label: 'Existing spreadsheet' },
            ],
          },
        ],
      },
    ],
  },
  {
    type: 'submenu',
    id: 'assign',
    label: 'Assign to…',
    icon: { type: 'icon', value: 'user' },
    children: [
      {
        type: 'group',
        id: 'people',
        label: 'People',
        children: [
          { type: 'item', id: 'user-ada', label: 'Ada Lovelace' },
          { type: 'item', id: 'user-grace', label: 'Grace Hopper' },
          { type: 'item', id: 'user-alan', label: 'Alan Turing' },
        ],
      },
      {
        type: 'submenu',
        id: 'assign-team',
        label: 'Teams',
        children: [
          { type: 'item', id: 'team-design', label: 'Design' },
          { type: 'item', id: 'team-engineering', label: 'Engineering' },
        ],
      },
    ],
  },
  {
    type: 'radio-group',
    id: 'snap',
    label: 'Snap',
    children: [
      { type: 'radio', id: 'snap-off', label: 'Off' },
      { type: 'radio', id: 'snap-grid', label: 'Grid' },
    ],
  },
  {
    type: 'group',
    id: 'view',
    children: [
      { type: 'checkbox', id: 'show-grid', label: 'Show grid' },
      { type: 'checkbox', id: 'show-minimap', label: 'Show minimap' },
    ],
  },
  {
    type: 'group',
    id: 'danger',
    children: [
      {
        type: 'item',
        id: 'delete',
        label: 'Delete',
        icon: { type: 'icon', value: 'trash' },
        variant: 'destructive',
      },
    ],
  },
]

function onSelect(id: string) {
  console.log(id)
}
</script>

<template>
  <N8nContextMenu
    :items="items"
    content-class="context-menu--constrained"
    v-model:selected-values="selectedValues"
    @select="onSelect"
  >
    <template #trigger>
      <N8nButton label="Right-click me" />
    </template>

    <template #item-leading="{ item, ui }">
      <N8nIcon
        v-if="item.icon?.type === 'icon'"
        :icon="item.icon.value"
        :class="ui.class"
        size="large"
        :color="item.type === 'item' && item.variant === 'destructive' ? 'danger' : 'text-light'"
      />
    </template>

    <template #item-label="{ item, ui }">
      <span :class="ui.class">
        {{ item.label }}
        <span v-if="item.id === 'user-ada'" class="context-menu--hint">Owner</span>
      </span>
    </template>

    <template #item-trailing="{ item, ui }">
      <N8nBadge v-if="item.id === 'share'" theme="success" bold :class="ui.class">
        New
      </N8nBadge>
      <N8nKeyboardShortcut
        v-else-if="item.shortcut"
        v-bind="item.shortcut"
        :class="ui.class"
      />
    </template>
  </N8nContextMenu>
</template>

<style>
.context-menu--constrained {
  max-height: 16rem;
}

.context-menu--hint {
  color: var(--color--text--tint-1);
  font-size: var(--font-size--2xs);
}
</style>
```
