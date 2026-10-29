# Component specification

A scrollable list of versions. A line connects the mark on each row, like a timeline. The caller can hide a run of versions behind a toggle. The list virtualizes rows, so a long history stays light.

- **Component Name:** N8nVersionHistory
- **Figma Component:** TBD
- **Current Implementation:** Custom component. Rows use `N8nRecycleScroller`. The timeline mark is local until `N8nStatusDot` can draw a neutral outline.


## Public API Definition

**Props**

- `items: VersionHistoryEntry[]` - Versions, newest first. A group hides its versions until the user opens the toggle.
- `selectedId?: string` - Id of the open version. A group that contains this id starts open.
- `label?: string` - Accessible name for the list. Defaults to "Versions".
- `loading?: boolean` - Shows skeleton rows. The list and the empty state stay hidden. | `default: false`
- `loadingLabel?: string` - Accessible name for the loading state. Defaults to "Loading versions".


**Events**

- `select(id: string)` - The user opens a version.
- `compare(id: string)` - The user compares a version. This does not select the row.
- `action(value: VersionHistoryActionPayload)` - The user chooses an action from a version menu.
- `toggle(value: VersionHistoryTogglePayload)` - The user opens or closes a group.


**Slots**

- `empty` - Content shown when `items` is empty. The panel centers it.
- `actions` - Replaces the compare control and the menu. Receives `{ item }`.


**Types**

```typescript
type VersionHistoryStatus = 'published' | 'latest' | 'default';

interface VersionHistoryItem {
  id: string;
  label: string;
  detail?: string;
  author?: string;
  createdAt?: string;
  createdAtIso?: string;
  status?: VersionHistoryStatus;
  statusLabel?: string;
  actions?: Array<ActionToggleItem<string>>;
  compareDisabled?: boolean;
  actionsDisabled?: boolean;
}

interface VersionHistoryGroup {
  type: 'group';
  id: string;
  label: string;
  items: VersionHistoryItem[];
}

type VersionHistoryEntry = VersionHistoryItem | VersionHistoryGroup;

interface VersionHistoryActionPayload {
  id: string;
  action: string;
}

interface VersionHistoryTogglePayload {
  id: string;
  expanded: boolean;
}
```


## Behavior

- The parent sets the height and the background. The list fills that height and scrolls inside it.
- The list mounts the rows in view. Scrolling mounts the next rows and drops the rows that leave the view.
- A line runs through the rail and meets each mark. The first mark has no line above it. The last mark has no line below it.
- `published` is a filled success dot. `latest` is a filled warning dot. `default`, and a missing status, is a neutral ring.
- Each version row has a compare control and a menu. The menu is hidden when `actions` is empty. The compare control stays.
- `compareDisabled` disables the compare control. `actionsDisabled` disables the menu.
- A click on compare or the menu does not select the version.
- The `actions` slot replaces both controls for every version row.
- A group starts collapsed. The toggle shows the caller's label, such as "4 versions". Activating the toggle shows or hides that group's versions.
- The group that contains `selectedId` starts open. The user can close it. It opens again when the selection moves into it.
- Every version id and group id in the list must be unique.
- The caller formats the time and writes the group label.
- `loading` replaces the list with three skeleton rows.
- An empty `items` array shows the `empty` slot.
- The list supports light and dark color modes through design tokens.


## Accessibility

- The list has an accessible name from `label`.
- The open version sets `aria-current="true"` on its row.
- The row's accessible name joins the label, detail, author, time, and status label.
- The compare control has the accessible name "Compare".
- The group toggle is a button. `aria-expanded` reports whether its versions are shown.
- The status dot is decorative. Put the status in `statusLabel` or in the visible text.
- The timeline line is decorative.


## Template usage examples

**Version list:**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nVersionHistory } from '@n8n/design-system';
import type { VersionHistoryEntry } from '@n8n/design-system';

const selectedId = ref('v2');

const items: VersionHistoryEntry[] = [
  {
    id: 'v2',
    label: 'v2',
    detail: 'Latest',
    author: 'Alex',
    createdAt: 'Oct 28 at 09:14',
    createdAtIso: '2026-10-28T09:14:00',
    status: 'latest',
    statusLabel: 'Latest version',
    actions: [{ id: 'restore', label: 'Restore' }],
  },
  {
    type: 'group',
    id: 'unnamed',
    label: '3 versions',
    items: [
      {
        id: 'v1c',
        label: 'v1.3',
        author: 'Sam',
        createdAt: 'Oct 27 at 18:41',
        status: 'default',
      },
    ],
  },
  {
    id: 'v1',
    label: 'v1',
    detail: 'In published agent',
    author: 'Alex',
    createdAt: 'Oct 24 at 14:28',
    createdAtIso: '2026-10-24T14:28:00',
    status: 'published',
    statusLabel: 'Published version',
    actions: [{ id: 'unpublish', label: 'Unpublish' }],
  },
];
</script>

<template>
  <div style="height: 28rem">
    <N8nVersionHistory
      :items="items"
      :selected-id="selectedId"
      @select="selectedId = $event"
    />
  </div>
</template>
```

**Empty state:**

```vue
<template>
  <N8nVersionHistory :items="[]">
    <template #empty>
      <p>No versions yet</p>
    </template>
  </N8nVersionHistory>
</template>
```

**Custom row actions:**

```vue
<template>
  <N8nVersionHistory :items="items" :selected-id="selectedId" @select="selectedId = $event">
    <template #actions="{ item }">
      <N8nButton size="xsmall" variant="ghost" :label="'Open ' + item.label" />
    </template>
  </N8nVersionHistory>
</template>
```
