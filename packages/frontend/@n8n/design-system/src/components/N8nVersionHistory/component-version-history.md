# Component specification

A scrollable list of versions. A line connects the mark on each row, like a timeline. The caller can hide a run of versions behind a toggle. The list virtualizes rows, so a long history stays light.

- **Component Name:** N8nVersionHistory
- **Figma Component:** TBD
- **Current Implementation:** Custom component. Rows use `N8nRecycleScroller`. Keyboard highlight uses `N8nListbox`. The timeline mark is `VersionHistoryStatusDot`, so a later status dot can replace that file.

## Public API Definition

**Props**

- `items: VersionHistoryEntry[]` - Versions, newest first. A group hides its versions until the user opens the toggle.
- `selectedId?: string` - Id of the open version. Pass it to control the selection. Set it to the current version so the list opens on that row. Omit it and the list keeps the row the user selects. A group that contains the open version starts open.
- `scrollToId?: string` - Id of the row to bring into view. The list scrolls when this id changes. It does not follow the open version. A group that contains this id opens before the scroll. The id can be a version, a group, or a heading. A heading above the row stays in view. The row starts below that heading. Call `scrollTo` to scroll to the same id again.
- `defaultSelectedId?: string` - Id of the version selected on first render. Use this when the parent does not pass `selectedId`. The list keeps later choices. A passed `selectedId` replaces this value.
- `label?: string` - Accessible name for the list. Defaults to "Versions".
- `loading?: boolean` - Shows skeleton rows. The list and the empty state stay hidden. | `default: false`
- `loadingLabel?: string` - Accessible name for the loading state. Defaults to "Loading versions".
- `hasMore?: boolean` - More versions can be loaded. The list emits `loadMore` when the end is near the bottom of the scroll area. | `default: false`
- `loadingMore?: boolean` - A later page is loading. The rows stay visible. A status appears at the end of the list. | `default: false`
- `loadingMoreLabel?: string` - Accessible name for that status. Defaults to "Loading more versions".
- `showCompare?: boolean` - Show the compare control on each version. Set this to false to hide compare and keep the menu. | `default: true`

**Events**

- `select(id: string)` - The user opens a version.
- `selectSeparate(id: string)` - The user opens a version with Command or Control held. The open version stays the same.
- `compare(id: string)` - The user compares a version. This does not select the row.
- `action(value: VersionHistoryActionPayload)` - The user chooses an action from a version menu.
- `toggle(value: VersionHistoryTogglePayload)` - The user opens or closes a group.
- `loadMore()` - The end of the list is near the bottom of the scroll area and more versions can be loaded.

**Slots**

- `empty` - Content shown when `items` is empty. The panel centers it.
- `actions` - Replaces the compare control and the menu. Receives `{ item }`.
- `heading` - Replaces the heading label. Receives `{ id, label }`. The pinned copy uses the same slot. The padding stays, so the label stays lined up with the status dots.
- `footer` - Content after the last row. It scrolls with the list.

**Methods**

- `scrollTo(id: string)` - Scroll that row into view. A group that contains the id opens first. A heading above the row stays in view. The row starts below that heading. The list waits while versions load. Use this to scroll to the same id again.

**Types**

```typescript
type VersionHistoryStatus = 'published' | 'latest' | 'default';

interface VersionHistoryTooltip {
	title: string;
	detail?: string;
}

type ActionToggleItem<T extends string = string> = {
	label: string;
	icon?: string;
	disabled?: boolean;
	divided?: boolean;
	destructive?: boolean;
	type?: 'external-link';
	tooltip?: string;
} & ({ id: T; value?: T } | { id?: T; value: T });

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

## Behavior

- The parent sets the height and the background. The list fills that height and scrolls inside it.
- The list mounts the rows in view. Scrolling mounts the next rows and drops the rows that leave the view.
- A line runs through the rail and meets each mark. The first mark has no line above it. The last mark has no line below it.
- A heading ends the line. Empty space sits above and below the heading. The next mark starts a new line.
- A heading stays at the top of the list while its versions scroll. The next heading pushes it up. Set `--version-history--heading--color--background` to the surface behind the list. The pinned heading uses that color. The rows under it stay hidden. Leave the variable unset to use `--background--surface`. The heading in the list stays available to assistive technology.
- A group starts collapsed. The toggle shows the caller's label, such as "4 versions". Activating the toggle shows or hides that group's versions. A group at the end of the list stays closed until the user opens it.
- `published` is a filled success dot. `latest` is a filled warning dot. `default`, and a missing status, is a neutral ring.
- Each version row has a compare control and a menu. The menu is hidden when `actions` is empty. The compare control stays unless `showCompare` is false.
- Each action is an `ActionToggleItem`, exported from `@n8n/design-system`. Set `icon` to an icon name to show an icon before the label.
- `disabled` stops selection for that row. Compare and the menu stay available.
- `compareDisabled` disables the compare control. `actionsDisabled` disables the menu.
- `compareTooltip` replaces the compare tooltip. A line break starts a second line. The accessible name stays "Compare".
- `tooltip` shows a tooltip to the left of the row. The caller writes the title and the detail. The status dot sits before the title.
- Set `showCompare` to false to hide the compare control. The menu stays.
- The `footer` slot renders after the last row. It scrolls with the list.
- A click on the row emits `select`. A click on compare emits `compare`. A menu choice emits `action`.
- A click or key press with Command or Control held emits `selectSeparate`. The open version stays the same. Enter, Space, and a click all do this.
- A click on compare or the menu does not select the version.
- Arrow keys move the highlight across the whole row. Enter or Space on a version emits `select`.
- Pointer movement moves the highlight. Arrow keys take the highlight from the row under the pointer. That row loses the highlight fill.
- The open version uses a stronger background than the highlight. The highlight can sit on another row. The open version keeps its background.
- Tab moves from the row to Compare, then to the menu, then to the next row. Shift+Tab moves back.
- Up and Down move between rows when the row has focus. Compare and the menu keep those keys.
- Enter or Space on a group emits `toggle`. ArrowRight opens a closed group. ArrowLeft closes an open group. That keeps the open version.
- The `heading` slot replaces the heading label. The pinned copy uses the same slot.
- The `actions` slot replaces the compare control and the menu for every version row.
- Pass `selectedId` when the parent owns the open version. Set it to the current version so the list opens on that row. Omit it when the list should keep the row the user selects.
- Pass `defaultSelectedId` to open on a version when the parent does not pass `selectedId`. The list keeps later choices. A passed `selectedId` replaces this value.
- Pass `scrollToId` to bring a row into view. The list scrolls when the id changes. Changing the open version does not scroll the list. A heading above the row stays in view. The row starts below that heading.
- `scrollTo` scrolls to an id, including the current `scrollToId`. A group that contains the id opens first. A heading above the row stays in view. The scroll waits until the row exists.
- The group that contains the open version starts open. The user can close it. It opens again when the selection moves into it.
- Every version id, group id, and heading id in the list must be unique.
- The caller formats the time and writes the group label.
- `loading` replaces the list with three skeleton rows. The end marker stays hidden.
- Set `hasMore` when another page exists. The list emits `loadMore` when the end is near the bottom of the scroll area.
- The list does not emit `loadMore` while `loadingMore` is true.
- `loadingMore` keeps the rows and shows one skeleton row at the end.
- An empty `items` array shows the `empty` slot. The list does not ask for a page until `items` has rows. Use `loading` for the first page.
- The list supports light and dark color modes through design tokens.

## Accessibility

- The list has an accessible name from `label`.
- The list is a listbox. Arrow keys move the highlight. The highlight covers the whole row.
- Tab moves from the row to Compare, then to the menu, then to the next row. Shift+Tab moves back.
- Up and Down move between rows when the row has focus.
- Enter or Space selects the highlighted version.
- The open version sets `aria-selected="true"`.
- Each version and each group reports its position in the full list.
- The version row's accessible name joins the label, detail, author, time, and status label.
- The compare control has the accessible name "Compare".
- A group is a row in the list. Enter or Space opens or closes it. ArrowRight opens it. ArrowLeft closes it. `aria-expanded` reports whether its versions are shown.
- The status dot is decorative. Put the status in `statusLabel` or in the visible text.
- The timeline line is decorative.
- The end marker is hidden from assistive technology.
- While the next page loads, a status at the end announces "Loading more versions".
- The pinned heading is hidden from assistive technology. The heading row in the list keeps the name.

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
		actions: [{ id: 'restore', label: 'Restore', icon: 'undo-2' }],
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
		actions: [{ id: 'unpublish', label: 'Unpublish' }],
	},
];
</script>

<template>
	<div style="height: 28rem">
		<N8nVersionHistory :items="items" :selected-id="selectedId" @select="selectedId = $event" />
	</div>
</template>
```

**Scroll to a version:**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nVersionHistory } from '@n8n/design-system';

const selectedId = ref('v2');
const linkedVersionId = ref('v1');
const history = ref<{ scrollTo: (id: string) => void } | null>(null);

function showAgain() {
	const id = linkedVersionId.value;
	if (!id) return;
	history.value?.scrollTo(id);
}
</script>

<template>
	<div style="height: 28rem">
		<N8nVersionHistory
			ref="history"
			:items="items"
			:selected-id="selectedId"
			:scroll-to-id="linkedVersionId"
			@select="selectedId = $event"
		/>
		<button type="button" @click="showAgain">Scroll</button>
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

**Load the next page:**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { N8nVersionHistory } from '@n8n/design-system';
import type { VersionHistoryEntry } from '@n8n/design-system';

const items = ref<VersionHistoryEntry[]>([]);
const hasMore = ref(false);
const loading = ref(true);
const loadingMore = ref(false);
let cursor = 0;

async function loadPage(replace: boolean) {
	if (!replace && (loading.value || loadingMore.value || !hasMore.value)) return;
	if (!replace) loadingMore.value = true;
	const page = await fetchVersions(cursor);
	items.value = replace ? page.items : [...items.value, ...page.items];
	cursor = page.nextCursor ?? cursor;
	hasMore.value = page.nextCursor !== null;
	loading.value = false;
	loadingMore.value = false;
}

onMounted(() => {
	void loadPage(true);
});
</script>

<template>
	<div style="height: 28rem">
		<N8nVersionHistory
			:items="items"
			:loading="loading"
			:loading-more="loadingMore"
			:has-more="hasMore"
			@load-more="loadPage(false)"
		/>
	</div>
</template>
```

**Custom heading:**

```vue
<template>
	<N8nVersionHistory :items="items" :selected-id="selectedId" @select="selectedId = $event">
		<template #heading="{ label }">
			<span>{{ label }}</span>
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
