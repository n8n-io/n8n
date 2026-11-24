# Component specification

A list of versions, groups, and headings. A group hides its versions behind a toggle. The list scrolls.

The component writes every label, tooltip, and control name. The caller does not pass those strings.

- **Component Name:** N8nVersionHistory

## Component structure

```
N8nVersionHistory
├── loading skeletons (the list and the empty state stay hidden)
├── empty slot (when items is empty)
└── list
    ├── version row
    │   ├── label, detail, author, and time
    │   ├── tooltip
    │   ├── compare
    │   └── actions menu
    ├── group row (versions stay hidden until the toggle opens)
    ├── heading
    └── load-more status (when hasMore or loadingMore)
```

## Public API Definition

**Props**

- `items: VersionHistoryEntry[]` — Versions, newest first. A group hides its versions until the user opens the toggle. Every version id, group id, and heading id must be unique. See [Item shapes](#item-shapes).
- `selectedId?: string` — Id of the open version. Pass it to control the selection. The list emits `select` and does not change this value. Set it to the current version so the list opens on that row. The parent updates it from `select`.
- `defaultSelectedId?: string` — Id of the version selected on first render. Use this when the parent does not pass `selectedId`. The list keeps later choices. A passed `selectedId` replaces this value.
- `scrollToId?: string` — Id of the row to bring into view. The list scrolls when this id changes. It does not follow the open version. A group that contains this id opens before the scroll. The id can be a version, a group, or a heading. Call `scrollTo` to scroll to the same id again.
- `loading?: boolean` — Replace the list with skeleton rows. The list and the empty state stay hidden. The region is named "Loading versions" (`versionHistory.loading`). Use this for the first page. | `default: false`
- `hasMore?: boolean` — More versions can be loaded. The list emits `loadMore` when the end is near the bottom of the scroll area. The list does not emit `loadMore` while `loading` or `loadingMore` is true, or while `items` is empty. | `default: false`
- `loadingMore?: boolean` — A later page is loading. The rows stay visible. A skeleton row at the end of the list is named "Loading more versions" (`versionHistory.loadingMore`). | `default: false`

Omit `selectedId` and the list keeps the row the user selects. Omit `selectedId` and `defaultSelectedId` and no version is open until the user selects one.

A group that contains the open version starts open. The user can close it. It opens again when the selection moves into it. The list keeps which groups are open. That state is not a prop.

**Events**

- `select(id: string)` — The user opens a version. A disabled version does not emit this.
- `compare(id: string)` — The user compares a version. This does not select the row. A hidden or disabled compare control does not emit this.
- `action(value: VersionHistoryActionPayload)` — The user chooses an action from a version menu. `itemId` is the version item. `actionId` is the chosen `ActionDropdownItem`. This does not select the row. A disabled action does not emit this.
- `toggle(value: VersionHistoryTogglePayload)` — The user opens or closes a group.
- `loadMore()` — The end of the list is near the bottom of the scroll area and more versions can be loaded.

**Exposed**

- `scrollTo(id: string)` — Scroll that row into view. A group that contains the id opens first. The list waits while versions load. Use this to scroll to the same id again.

**Slots**

- `empty` — Content shown when `items` is empty and `loading` is false. The empty list is named "Versions" (`versionHistory.label`).
- `heading`: `{ id: string, label: string }` — Replaces the heading label.

### Item shapes

An entry is a version, a group, or a heading.

```typescript
import type { ActionDropdownItem } from '@n8n/design-system';

type VersionHistoryStatus = 'published' | 'latest' | 'default';

type VersionHistoryItem = {
	/** Stable id. Unique across versions, groups, and headings. */
	id: string;
	/** Primary label, such as "v1" or a version name. The row shows it, and it is the tooltip title. */
	label: string;
	/** Text after the label, such as "Latest" or "In published agent". The row and the tooltip show it. */
	detail?: string;
	/** Person who saved the version. The row and the tooltip show it. */
	author?: string;
	/** Formatted time, such as "Oct 24 at 14:28". The row and the tooltip show it. */
	createdAt?: string;
	/** ISO time for the time element. */
	createdAtIso?: string;
	/**
	 * Status of the version.
	 * `published` adds "Published version" to the row name (`versionHistory.status.published`).
	 * `latest` adds "Latest version" to the row name (`versionHistory.status.latest`).
	 * `default`, and a missing status, adds no status name.
	 * @default 'default'
	 */
	status?: VersionHistoryStatus;
	/**
	 * The user cannot select this row. Compare and the menu stay available.
	 * @default false
	 */
	disabled?: boolean;
	/**
	 * Show the compare control.
	 * Set this to false to hide compare. The menu stays.
	 * @default true
	 */
	showCompare?: boolean;
	/**
	 * The compare control stays visible and does not emit `compare`. Its tooltip stays hidden.
	 * @default false
	 */
	compareDisabled?: boolean;
	/**
	 * Menu items. Each item is an `ActionDropdownItem`.
	 * Set `icon` to show an icon before the label.
	 * Set `disabled` on an item to stop that choice. The other choices stay available.
	 * The menu is hidden when this list is missing or empty.
	 * @default []
	 */
	actions?: Array<ActionDropdownItem<string>>;
	/**
	 * Show the menu.
	 * Set this to false to hide the menu. Compare stays.
	 * The menu stays hidden when `actions` is missing or empty.
	 * @default true
	 */
	showActions?: boolean;
	/**
	 * The menu stays visible and does not open.
	 * @default false
	 */
	actionsDisabled?: boolean;
};

type VersionHistoryGroup = {
	/** `'group'`. Marks this entry as a group. */
	type: 'group';
	/** Stable id for the toggle. Unique across versions, groups, and headings. */
	id: string;
	/** Text on the toggle. */
	label: string;
	/** Versions the toggle reveals. Newest first. */
	items: VersionHistoryItem[];
};

type VersionHistoryHeading = {
	/** `'heading'`. Marks this entry as a heading. */
	type: 'heading';
	/** Stable id. Unique across versions, groups, and headings. */
	id: string;
	/** Text for the heading. */
	label: string;
};

type VersionHistoryEntry = VersionHistoryItem | VersionHistoryGroup | VersionHistoryHeading;

type VersionHistoryActionPayload = {
	/** Id of the version item that owns the menu. */
	itemId: string;
	/** Id of the chosen `ActionDropdownItem`. */
	actionId: string;
};

type VersionHistoryTogglePayload = {
	id: string;
	expanded: boolean;
};
```

A group starts collapsed. Activating the toggle shows or hides its versions and emits `toggle`.

A heading is not a version and it has no controls.

**Tooltip**

Every version row has a tooltip. The component writes it.

The title is `label`. When `status` is `published` or `latest`, the tooltip includes that status name.

The second line uses this order: `detail`, `author`, `createdAt`. It skips a missing part. A comma separates the parts. The second line is absent when all three are missing.

**Compare and the menu**

Each version row has a compare control and an actions menu.

The compare tooltip and the accessible name are "Compare" (`versionHistory.compare`). The caller does not replace that text.

A click on the row emits `select`. A click on compare emits `compare` and does not select the row. A menu choice emits `action` and does not select the row.

`itemId` on `VersionHistoryActionPayload` is the version item id. `actionId` is the id of the chosen `ActionDropdownItem`.

**Keyboard**

Arrow keys move the highlight across the whole row. Enter or Space on a version emits `select`. Enter or Space on a group emits `toggle`. ArrowRight opens a closed group. ArrowLeft closes an open group.

Tab moves from the row to Compare, then to the menu, then to the next row. Shift+Tab moves back. A hidden control is not in that order. Arrow keys on Compare or the menu stay on that control. ArrowDown on the menu opens the menu. The highlighted row stays highlighted.

The highlighted row and the open version can be different rows.

A disabled version does not emit `select` from the keyboard. A disabled compare control and a disabled menu stay in the tab order and emit nothing.

### Template usage examples

**Controlled selection**

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
		actions: [
			{ id: 'restore', label: 'Restore', icon: 'undo-2' },
			{ id: 'name', label: 'Name version', disabled: true },
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
		compareDisabled: true,
		actions: [{ id: 'unpublish', label: 'Unpublish' }],
	},
];
</script>

<template>
	<N8nVersionHistory
		:items="items"
		:selected-id="selectedId"
		@select="selectedId = $event"
		@compare="onCompare"
		@action="onAction"
	/>
</template>
```

**Uncontrolled selection**

Omit `selectedId`. Pass `defaultSelectedId` for the version that is open on first render. The list keeps later choices.

```vue
<N8nVersionHistory :items="items" default-selected-id="v2" @select="onSelect" />
```

**Groups, headings, and hidden compare**

```vue
<script setup lang="ts">
import type { VersionHistoryEntry } from '@n8n/design-system';

const items: VersionHistoryEntry[] = [
	{
		type: 'heading',
		id: 'earlier',
		label: 'Earlier',
	},
	{
		type: 'group',
		id: 'unnamed',
		label: '1 version',
		items: [
			{
				id: 'v1c',
				label: 'v1.3',
				author: 'Sam',
				createdAt: 'Oct 27 at 18:41',
				showCompare: false,
				actions: [{ id: 'restore', label: 'Restore' }],
			},
		],
	},
];
</script>
```

**Load more**

Set `hasMore` while another page exists. Append that page to `items`, then set `loadingMore` back to false. Use `loading` for the first page.

```vue
<N8nVersionHistory
	:items="items"
	:has-more="hasMore"
	:loading-more="loadingMore"
	@load-more="onLoadMore"
/>
```
