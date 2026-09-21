# Component specification

A menu that opens at the pointer on right-click or long-press. Built on Reka UI `ContextMenu`.

- **Component Name:** N8nContextMenu
- **Reka UI Component:** [Context Menu](https://reka-ui.com/docs/components/context-menu)
- **Item id:** `T extends string`. Callers can pass a string literal union.

## Public API Definition

**Props**

- `id?: string` HTML id for the menu content element.
- `items: Array<ContextMenuNode<T>>` Root list. May mix rows (`item`, `checkbox`) and sections (`group`, `submenu`, `radio-group`). `radio` is not a node; nest it in `radio-group`. A separator renders before each section that follows another node.
- `open?: boolean` Controlled open state. Bind with `v-model:open`. When set to `true`, the menu opens at `position` if set. Otherwise it opens at the trigger, or `[0, 0]`. Right-click still uses the pointer.
- `defaultOpen?: boolean` Initial open state when uncontrolled. Uses `position` if set. Otherwise it opens at the trigger, or `[0, 0]`. | `default: false`
- `position?: [number, number]` Override for programmatic open (`defaultOpen`, controlled `open`, or `open()`). Offset from the trigger when a trigger exists. Viewport coordinates when the trigger is omitted. Right-click ignores this. Fallback is `[0, 0]`. A change while the menu is open moves it to the new point.
- `selectedValues?: T[]` Controlled selected ids for checkbox and radio items. Bind with `v-model:selectedValues`. A radio selection replaces other radios in the same `radio-group`. Checkbox ids toggle on their own.
- `defaultSelectedValues?: T[]` Initial selected ids when `selectedValues` is omitted | `default: []`
- `disabled?: boolean` Disables the **trigger**. `open()` is a no-op when disabled. | `default: false`
- `loading?: boolean` Show skeleton rows instead of items. | `default: false`
- `loadingItemCount?: number` Number of skeleton rows while loading. The same default applies to `submenu.loadingItemCount`. | `default: 3`
- `contentClass?: ClassValue` Class on the root panel and every submenu panel (max-height and other constraints). Set `--context-menu--width` here when the panel must use a fixed width instead of hugging its content.
- `modal?: boolean` When `true`, blocks pointer events on the rest of the page while the menu is open. Canvas menus set this to `false`. | `default: true`

Extra HTML attributes, including `class`, land on the trigger element.

**Empty copy**

The default empty state uses i18n key `contextMenu.noItems` (`No items`). It shows when a panel has no nodes, including an empty submenu. Pass `#empty` to replace it.

**Icon color**

The default leading icon uses the row tone: `--icon-color`, `--icon-color--subtle` when disabled, `--icon-color--danger` when `variant` is `destructive`. If `icon.type` is `icon` and `icon.color` is set, that value wins. `#item-leading` replaces this default, including emoji and tone handling.

**Labels and indicators**

Default labels ellipsize. A label of 20 characters or more gets a native `title` tooltip. A `group` or `radio-group` `label` renders as a non-interactive header.

Checkbox and radio rows show a check on the trailing edge when selected. Submenu rows show a chevron. These sit outside `#item-trailing`.

**Panel tokens**

- `--context-menu--width` is unset by default. Panels then use `fit-content`, with a min of `--spacing--4xl` (8rem) and a max of `24rem`. Set it from `contentClass` to give the root panel and every submenu the same fixed width.
- Default `max-height` is `--reka-context-menu-content-available-height`. Override it from `contentClass`.
- `--context-menu--padding` is an internal variable on the item list. It aliases `--spacing--4xs` (4px). Submenu `alignOffset` is `-4` so the first submenu row lines up with the trigger. Reka `alignOffset` is a pixel number, so `ITEMS_PADDING_PX` in `ContextMenu.constants.ts` must stay equal to `--spacing--4xs`.
- Submenu `sideOffset` is `1`, which matches the 1px inset outline (`--shadow--outline`).
- Root and submenu panels set Reka `collisionPadding` to `--spacing--2xs` (8px) so the menu stays inset from the viewport edge. Reka `collisionPadding` is a pixel number, so `COLLISION_PADDING_PX` in `ContextMenu.constants.ts` must stay equal to `--spacing--2xs`.

**Events**

- `update:open(open: boolean)` Open state
- `update:selectedValues(value: T[])` Full selected-id list after a radio or checkbox change
- `select(value: T)` A command (`type: 'item'`) was chosen. Radio and checkbox do not emit this. Menu closes unless `keepOpen`.
- `submenu:toggle(itemId: T, open: boolean)` A `submenu` flyout opened or closed.
- `close-auto-focus(event: Event)` Focus is about to return to the trigger as the menu closes. `preventDefault` to hand focus to another layer (popover, inline rename).

**Slots**

- `trigger` Target element. Omit in coordinate mode
- `item` `{ item: ContextMenuLeaf<T> }` Replaces default `N8nContextMenuItem`. Re-render `N8nContextMenuItem` so the row keeps selection, keyboard behaviour, and submenu flyouts.
- `item-leading` `{ item: ContextMenuLeaf<T>, ui: { class: string } }` Replaces the default icon or emoji. Bind `ui.class`.
- `item-label` `{ item: ContextMenuLeaf<T>, ui: { class: string } }` Replaces the default label. Bind `ui.class`.
- `item-trailing` `{ item: ContextMenuLeaf<T>, ui: { class: string } }` Replaces the default shortcut. Bind `ui.class`. Does not replace the check or submenu chevron.
- `loading` Replaces the skeleton rows on the **root** panel. A submenu with `loading: true` always uses the default skeleton.
- `empty` Empty state for a panel with no nodes (root or submenu)

**Exposed methods**

- `open()` Opens the menu. Uses `position` if set. Otherwise opens at the trigger, or `[0, 0]`. No-op when `disabled`.
- `close()` Closes the menu.

**Types**

```typescript
import type { ClassValue } from 'clsx'
import type { IconOrEmoji, KeyboardShortcut } from '@n8n/design-system'

type ContextMenuId = string

type ContextMenuLeafBase<T extends ContextMenuId = ContextMenuId> = {
  id: T;
  label: string;
  icon?: IconOrEmoji;
  shortcut?: KeyboardShortcut;
  disabled?: boolean;
  class?: ClassValue;
};

type ContextMenuItem<T extends ContextMenuId = ContextMenuId> = ContextMenuLeafBase<T> & {
  type: 'item';
  keepOpen?: boolean;
  variant?: 'default' | 'destructive';
};

type ContextMenuRadio<T extends ContextMenuId = ContextMenuId> = ContextMenuLeafBase<T> & {
  type: 'radio';
};

type ContextMenuCheckbox<T extends ContextMenuId = ContextMenuId> = ContextMenuLeafBase<T> & {
  type: 'checkbox';
};

type ContextMenuGroup<T extends ContextMenuId = ContextMenuId> = {
  type: 'group';
  id: T;
  label?: string;
  class?: ClassValue;
  children: Array<ContextMenuNode<T>>;
};

type ContextMenuSubmenu<T extends ContextMenuId = ContextMenuId> = ContextMenuLeafBase<T> & {
  type: 'submenu';
  children: Array<ContextMenuNode<T>>;
  loading?: boolean;
  loadingItemCount?: number;
};

type ContextMenuRadioGroup<T extends ContextMenuId = ContextMenuId> = {
  type: 'radio-group';
  id: T;
  label?: string;
  class?: ClassValue;
  children: Array<ContextMenuRadio<T>>;
};

type ContextMenuNode<T extends ContextMenuId = ContextMenuId> =
  | ContextMenuItem<T>
  | ContextMenuCheckbox<T>
  | ContextMenuGroup<T>
  | ContextMenuSubmenu<T>
  | ContextMenuRadioGroup<T>;

type ContextMenuLeaf<T extends ContextMenuId = ContextMenuId> =
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
        :color="item.type === 'item' && item.variant === 'destructive' ? '--icon-color--danger' : '--icon-color'"
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
  color: var(--text-color--subtler);
  font-size: var(--font-size--2xs);
}
</style>
```
