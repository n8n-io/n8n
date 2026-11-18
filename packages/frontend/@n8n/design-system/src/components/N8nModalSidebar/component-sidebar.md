# Component specification

A resizable sidebar of items and sections. A section groups items under a collapsible header. An item can contain child items.

The sidebar fills the height of its parent. The list scrolls. A layout that needs its own content uses `N8nResizeWrapper` instead.

- **Component Name:** N8nSidebar

## Component structure

```
N8nSidebar
├── list
│   ├── item
│   │   ├── icon
│   │   ├── label
│   │   ├── trailing slot
│   │   └── child items
│   └── section
│       ├── header
│       │   ├── label
│       │   ├── trailing slot
│       │   └── collapse control
│       └── items
└── resize handle (when resizable)
```

## Public API Definition

**Props**

- `items: SidebarEntry[]` — Items and sections, in the order to show them. A section contains items. An item contains child items. Every item id and section id must be unique. See [Item shapes](#item-shapes).
- `selectedId?: string` — Id of the selected item. Pass it to control the selection. Set it to select an item from the parent. The sidebar emits `select` and does not change this value. The parent updates it from `select`. A section id is not a selection.
- `defaultSelectedId?: string` — Id of the item selected on first render. Use this when the parent does not pass `selectedId`. The sidebar keeps later choices. A passed `selectedId` replaces this value.
- `expandedIds?: string[]` — Ids of the expanded sections and parent items. Pass it to control which rows are expanded. Set this list to expand or collapse rows from the parent. The sidebar emits `toggle` and does not change this value. The parent updates it from `toggle`.
- `defaultExpandedIds?: string[]` — Ids of the sections and parent items expanded on first render. Use this when the parent does not pass `expandedIds`. The sidebar keeps later choices. A passed `expandedIds` replaces this value. Omit it and every section and parent starts expanded.
- `side?: 'left' | 'right'` — Edge of the parent, and the resize direction. `left` places the sidebar on the left and the handle on its right edge, so a drag resizes to the right. `right` places the sidebar on the right and the handle on its left edge, so a drag resizes to the left. Place the sidebar on that side. It does not move itself. | `default: 'left'`
- `width?: number` — Current width in pixels. Bind with `v-model:width`. | `default: 240`
- `widthStorageId?: string` — Local storage key for the width. When set, the sidebar reads that key on mount and writes the width after each change. A saved width inside `minWidth` and `maxWidth` becomes the current width, and the sidebar emits `update:width`. Each sidebar uses its own key. Omit this prop and the sidebar does not read or write storage.
- `defaultWidth?: number` — Width restored on double-click. Defaults to the `width` value before a saved width is applied. The sidebar then saves that restored width when `widthStorageId` is set.
- `minWidth?: number` — Minimum width in pixels. | `default: 160`
- `maxWidth?: number` — Maximum width in pixels. | `default: 480`
- `resizable?: boolean` — Show the drag handle. | `default: true`
- `label?: string` — Accessible name for the sidebar.

Omit `selectedId` and the sidebar keeps the item the user selects. Omit `selectedId` and `defaultSelectedId` and no item is selected until the user selects one.

Omit `expandedIds` and the sidebar keeps the rows the user expands. Omit `expandedIds` and `defaultExpandedIds` and every section and parent starts expanded.

When `expandedIds` is omitted, a collapsed section or parent expands when the selection moves into it. When `expandedIds` is passed, the sidebar leaves that list unchanged. The parent adds the ancestor ids to expand those rows.

**Events**

- `select(id: string)` — The user opens an item. A disabled item does not emit this. A section header does not emit this.
- `toggle(value: SidebarTogglePayload)` — The user expands or collapses a section, or an item that has children. When `expandedIds` is passed, the parent applies this change to that list.
- `update:width(width: number)` — The width changed. `v-model:width` listens for this.
- `resize(data: ResizeData)` — The user is dragging the handle. `data.width` is the next width. `data.direction` is `right` on a left sidebar and `left` on a right sidebar.

**Slots**

- `item-trailing`: `{ item: SidebarItem }` — Actions after the item label. The slot can hold one or more controls. A control in this slot does not select the item and does not toggle its children.
- `section-trailing`: `{ section: SidebarSection }` — Actions after the section label. A control in this slot does not toggle the section.

### Item shapes

An entry is an item or a section.

```typescript
import type { IconName } from '@n8n/design-system';

type SidebarItem = {
	/** Stable id. Unique across items and sections, including nested items. */
	id: string;
	/** Text of the row. */
	label: string;
	/** Icon before the label. */
	icon?: IconName;
	/**
	 * The user cannot select this row. The trailing slot stays available.
	 * @default false
	 */
	disabled?: boolean;
	/** Child items. The parent shows a collapse control when this list is present. */
	children?: SidebarItem[];
};

type SidebarSection = {
	/** `'section'`. Marks this entry as a section. */
	type: 'section';
	/** Stable id for the header. Unique across items and sections. */
	id: string;
	/** Text of the header. */
	label: string;
	/** Items the header reveals. An item in this list can contain child items. */
	items: SidebarItem[];
};

type SidebarEntry = SidebarItem | SidebarSection;

type SidebarTogglePayload = {
	/** Id of the section or of the item that has children. */
	id: string;
	/** True when the row is expanded after the toggle. */
	expanded: boolean;
};

type ResizeData = {
	height: number;
	width: number;
	dX: number;
	dY: number;
	x: number;
	y: number;
	direction:
		| 'left'
		| 'right'
		| 'top'
		| 'bottom'
		| 'topLeft'
		| 'topRight'
		| 'bottomLeft'
		| 'bottomRight';
};
```

A section header is not an item. Activating it emits `toggle`. When `expandedIds` is omitted, the sidebar expands or collapses that section. When `expandedIds` is passed, the section changes after the parent updates that list.

An item with `children` is an item. Activating the row emits `select`. Activating its collapse control emits `toggle`. The child items follow the same expand rules as a section.

**Keyboard**

Arrow keys move the highlight across the list. Enter or Space on an item emits `select`. Enter or Space on a section header emits `toggle`. ArrowRight opens a closed section or a closed parent. ArrowLeft closes an open section or an open parent.

Tab moves from the row to its trailing controls, then to the next row. Shift+Tab moves back. A row with no trailing controls skips that stop. Arrow keys on a trailing control stay on that control.

The highlighted row and the open item can be different rows.

A disabled item does not emit `select` from the keyboard. Its trailing controls stay in the tab order.

### Template usage examples

**Items**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nIconButton, N8nSidebar } from '@n8n/design-system';
import type { SidebarEntry } from '@n8n/design-system';

const selectedId = ref('overview');
const width = ref(240);

const items: SidebarEntry[] = [
	{ id: 'overview', label: 'Overview', icon: 'house' },
	{ id: 'workflows', label: 'Workflows', icon: 'workflow' },
	{ id: 'settings', label: 'Settings', icon: 'settings', disabled: true },
];
</script>

<template>
	<N8nSidebar
		v-model:width="width"
		:items="items"
		:selected-id="selectedId"
		label="Files"
		:min-width="160"
		:max-width="480"
		@select="selectedId = $event"
	>
		<template #item-trailing="{ item }">
			<N8nIconButton
				icon="trash-2"
				variant="ghost"
				size="xsmall"
				:aria-label="'Delete ' + item.label"
				@click="onDelete(item.id)"
			/>
		</template>
	</N8nSidebar>
</template>
```

**Sections**

Pass `expandedIds` to expand and collapse sections from the parent. Omit it, and pass `defaultExpandedIds`, when the sidebar should keep later choices. The header trailing slot is separate from the item trailing slot.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nIconButton, N8nSidebar } from '@n8n/design-system';
import type { SidebarEntry, SidebarTogglePayload } from '@n8n/design-system';

const selectedId = ref('overview');
const expandedIds = ref(['project']);

const items: SidebarEntry[] = [
	{
		type: 'section',
		id: 'project',
		label: 'Project',
		items: [
			{ id: 'overview', label: 'Overview', icon: 'house' },
			{ id: 'workflows', label: 'Workflows', icon: 'workflow' },
		],
	},
];

function onToggle({ id, expanded }: SidebarTogglePayload) {
	expandedIds.value = expanded
		? [...expandedIds.value, id]
		: expandedIds.value.filter((openId) => openId !== id);
}
</script>

<template>
	<N8nSidebar
		:items="items"
		:selected-id="selectedId"
		:expanded-ids="expandedIds"
		label="Project"
		@select="selectedId = $event"
		@toggle="onToggle"
	>
		<template #section-trailing="{ section }">
			<N8nIconButton
				icon="plus"
				variant="ghost"
				size="xsmall"
				:aria-label="'Add to ' + section.label"
			/>
		</template>
	</N8nSidebar>
</template>
```

**Uncontrolled selection and expansion**

Omit `selectedId` and `expandedIds`. The sidebar keeps the item the user selects and the rows the user expands.

```vue
<N8nSidebar
	:items="items"
	default-selected-id="overview"
	:default-expanded-ids="['project']"
	label="Project"
	@select="onSelect"
/>
```

**Nested items**

A child item uses the same fields as a top-level item. The parent collapse control hides the children.

```vue
<script setup lang="ts">
import type { SidebarEntry } from '@n8n/design-system';

const items: SidebarEntry[] = [
	{
		type: 'section',
		id: 'files',
		label: 'Files',
		items: [
			{
				id: 'src',
				label: 'src',
				icon: 'folder',
				children: [
					{ id: 'index', label: 'index.ts', icon: 'file' },
					{ id: 'app', label: 'App.vue', icon: 'file' },
				],
			},
		],
	},
];
</script>
```
