# Component specification

A scrollable list of versions. A line connects the mark on each row. The caller can hide a run of versions behind a toggle. The parent sets the height. The list fills that height and scrolls inside it.

- **Component Name:** N8nVersionHistory

## Public API Definition

**Props**

- `items: VersionHistoryEntry[]` Versions, newest first. A group hides its versions until the user opens the toggle. Every version id, group id, and heading id must be unique.
- `selectedId?: string` Id of the open version. Pass it to control the selection. Set it to the current version so the list opens on that row. Omit it and the list keeps the row the user selects. A group that contains the open version starts open.
- `scrollToId?: string` Id of the row to bring into view. The list scrolls when this id changes. It does not follow the open version. A group that contains this id opens before the scroll. The id can be a version, a group, or a heading. A heading above the row stays in view. The row starts below that heading. Call `scrollTo` to scroll to the same id again.
- `defaultSelectedId?: string` Id of the version selected on first render. Use this when the parent does not pass `selectedId`. The list keeps later choices. A passed `selectedId` replaces this value.
- `label?: string` Accessible name for the list. | `default: "Versions"` (`versionHistory.label`)
- `loading?: boolean` Show skeleton rows. The list and the empty state stay hidden. | `default: false`
- `loadingLabel?: string` Accessible name for the loading state. | `default: "Loading versions"` (`versionHistory.loading`)
- `hasMore?: boolean` More versions can be loaded. The list emits `loadMore` when the end is near the bottom of the scroll area. | `default: false`
- `loadingMore?: boolean` A later page is loading. The rows stay visible. A status appears at the end of the list. | `default: false`
- `loadingMoreLabel?: string` Accessible name for that status. | `default: "Loading more versions"` (`versionHistory.loadingMore`)
- `showCompare?: boolean` Show the compare control on each version. Set this to false to hide compare and keep the menu. | `default: true`

**Groups**

A group starts collapsed. The toggle shows the caller's label. Activating the toggle shows or hides that group's versions. A group that contains the open version starts open. The user can close it. It opens again when the selection moves into it.

**Timeline**

A line runs through the rail and meets each mark. The first mark has no line above it. The last mark has no line below it. A heading ends the line. The next mark starts a new line.

A heading stays at the top of the list while its versions scroll. The next heading pushes it up. Set `--version-history--heading--color--background` to the surface behind the list. The pinned heading uses that color. Leave the variable unset to use `--background--surface`.

**Status**

`published` is a filled success dot. `latest` is a filled warning dot. `default`, and a missing status, is a neutral ring. The dot is decorative. Put the status in `statusLabel` or in the visible text.

`tooltip` shows to the left of the row. The caller writes `title` and `detail`. The status dot sits before the title.

**Actions**

Each version row has a compare control and a menu. The menu is hidden when `actions` is empty. Each action is an `ActionToggleItem`. Set `icon` to an icon name to show an icon before the label. `disabled` stops selection for that row. Compare and the menu stay available. `compareDisabled` disables the compare control. `actionsDisabled` disables the menu. `compareTooltip` replaces the compare tooltip. A line break starts a second line. The accessible name stays "Compare" (`versionHistory.compare`).

A click on the row emits `select`. A click or key press with Command or Control held emits `selectSeparate`. The open version stays the same. A click on compare emits `compare` and does not select the row. A menu choice emits `action`.

**Keyboard**

Arrow keys move the highlight across the whole row. Enter or Space on a version emits `select`. Enter or Space on a group emits `toggle`. ArrowRight opens a closed group. ArrowLeft closes an open group. Tab moves from the row to Compare, then to the menu, then to the next row. Shift+Tab moves back.

The open version uses a stronger background than the highlight. The highlight can sit on another row. The open version keeps its background.

**Loading**

`loading` replaces the list with three skeleton rows. `loadingMore` keeps the rows and shows one skeleton row at the end. The list does not emit `loadMore` while `loading` or `loadingMore` is true. An empty `items` array shows the `empty` slot. The list does not ask for a page until `items` has rows. Use `loading` for the first page.

**Events**

- `select(id: string)` The user opens a version.
- `selectSeparate(id: string)` The user opens a version with Command or Control held. The open version stays the same.
- `compare(id: string)` The user compares a version. This does not select the row.
- `action(value: VersionHistoryActionPayload)` The user chooses an action from a version menu.
- `toggle(value: VersionHistoryTogglePayload)` The user opens or closes a group.
- `loadMore()` The end of the list is near the bottom of the scroll area and more versions can be loaded.

**Methods**

- `scrollTo(id: string)` Scroll that row into view. A group that contains the id opens first. A heading above the row stays in view. The row starts below that heading. The list waits while versions load. Use this to scroll to the same id again.

**Slots**

- `empty` Content shown when `items` is empty. The panel centers it.
- `actions` `{ item: VersionHistoryItem }` Replaces the compare control and the menu.
- `heading` `{ id: string, label: string }` Replaces the heading label. The pinned copy uses the same slot. The padding stays, so the label stays lined up with the status dots.
- `footer` Content after the last row. It scrolls with the list.

**Types**

```typescript
import type { ActionToggleItem } from '@n8n/design-system';

type VersionHistoryStatus = 'published' | 'latest' | 'default';

interface VersionHistoryTooltip {
  title: string;
  detail?: string;
}

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
  disabled?: boolean;
  compareDisabled?: boolean;
  compareTooltip?: string;
  tooltip?: VersionHistoryTooltip;
  actionsDisabled?: boolean;
}

interface VersionHistoryGroup {
  type: 'group';
  id: string;
  label: string;
  items: VersionHistoryItem[];
}

interface VersionHistoryHeading {
  type: 'heading';
  id: string;
  label: string;
}

type VersionHistoryEntry = VersionHistoryItem | VersionHistoryGroup | VersionHistoryHeading;

interface VersionHistoryActionPayload {
  id: string;
  action: string;
}

interface VersionHistoryTogglePayload {
  id: string;
  expanded: boolean;
}
```

### Template usage example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { N8nButton, N8nVersionHistory } from '@n8n/design-system'
import type { VersionHistoryEntry } from '@n8n/design-system'

const selectedId = ref('v2')

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
    actions: [{ id: 'restore', label: 'Restore', icon: 'undo-2' }],
  },
  {
    type: 'heading',
    id: 'earlier',
    label: 'Earlier',
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
      {
        id: 'v1b',
        label: 'v1.2',
        author: 'Sam',
        createdAt: 'Oct 27 at 11:02',
        status: 'default',
      },
      {
        id: 'v1a',
        label: 'v1.1',
        author: 'Alex',
        createdAt: 'Oct 26 at 16:02',
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
    tooltip: { title: 'Published', detail: 'Alex, Oct 24 at 14:28' },
    actions: [{ id: 'unpublish', label: 'Unpublish' }],
  },
]
</script>

<template>
  <div style="height: 28rem">
    <N8nVersionHistory
      :items="items"
      :selected-id="selectedId"
      @select="selectedId = $event"
    >
      <template #heading="{ label }">
        <span>{{ label }}</span>
      </template>

      <template #actions="{ item }">
        <N8nButton size="xsmall" variant="ghost" :label="'Open ' + item.label" />
      </template>
    </N8nVersionHistory>
  </div>
</template>
```
