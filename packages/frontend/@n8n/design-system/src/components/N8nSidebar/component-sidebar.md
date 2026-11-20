# Component specification

A resizable column. The column is a shell: it sets the width, the surface, and the scroll. The caller puts the content in the default slot and wires that content’s events.

Dialogs were the first surface. The same shell fits any parent that gives it a height. A file list, a form, or a mix of both is content the caller renders. The sidebar has no item list of its own.

A layout that needs a resize handle and its own markup uses `N8nResizeWrapper` instead.

- **Component Name:** N8nSidebar

## Component structure

```
N8nSidebar
├── header slot (when set)
├── scroll area
│   └── default slot
├── footer slot (when set)
└── resize handle (when resizable)
```

## Public API Definition

**Props**

- `side?: 'left' | 'right'` Edge of the parent, and the resize direction. `left` places the handle on the right edge, so a drag grows the column to the right. `right` places the handle on the left edge, so a drag grows the column to the left. Place the sidebar on that side of the parent. The component stays where the parent puts it. | `default: 'left'`
- `width?: number` Current width in pixels. Bind with `v-model:width` and the parent stores the width. Omit this prop and the sidebar stores the width. The sidebar clamps a bound value to `minWidth` and `maxWidth`. It emits the clamped width. Pass `width` without `v-model:width` and the value is the start width. The sidebar keeps a resized width until the parent changes `width` or remounts the sidebar. | `default: 240`
- `widthStorageId?: string` Local storage key for the width. Set this key and the sidebar reads it on mount. A saved width inside `minWidth` and `maxWidth` becomes the current width. The sidebar emits `update:width`. The sidebar writes the width after each later change. Give each sidebar its own key. Omit this prop and the sidebar does not read or write storage.
- `defaultWidth?: number` Width restored on double-click. Defaults to the `width` value at mount, before a saved width is applied. The sidebar clamps this value to `minWidth` and `maxWidth`. The sidebar saves that restored width when `widthStorageId` is set.
- `minWidth?: number` Minimum width in pixels. The width stays at or above this value. | `default: 160`
- `maxWidth?: number` Maximum width in pixels. The width stays at or below this value. | `default: 480`
- `resizable?: boolean` Show the drag handle. | `default: true`
- `label?: string` Accessible name for the sidebar.

**Events**

- `update:width(width: number)` The width changed. `v-model:width` listens for this.
- `resize(data: ResizeData)` The user is dragging the handle. `data.width` is the next width. `data.direction` is `right` on a left sidebar and `left` on a right sidebar.

**Slots**

- `header` Content above the scrolling body. This region stays in place. Omit the slot and the region is absent.
- `default` Sidebar body. This region scrolls. The caller supplies the content and the behaviour. A selectable list is an `N8nListbox` in this slot. A form is inputs in this slot. A control’s click handler lives on that control.
- `footer` Content below the scrolling body. This region stays in place. Omit the slot and the region is absent.

**Tokens**

Set a token on the sidebar. The sidebar uses the token. When the token is unset, it uses the default.

- `--n8n-sidebar--color--background` Surface fill. | default: `--background--subtle`
- `--n8n-sidebar--padding` Padding around the scrolling body. | default: `--spacing--2xs` (8px)

A list uses the default padding. A form sets a larger padding on the sidebar.

The sidebar fills the height of its parent. The default slot scrolls in an `N8nScrollArea`. The area fades at the top and the bottom. The header and the footer stay in place. Content beside the sidebar scrolls on its own when that content has its own overflow.

**Types**

```typescript
type SidebarSide = 'left' | 'right';

type SidebarProps = {
	/**
	 * Side of the parent this sidebar sits on.
	 * The resize handle is on the inner edge.
	 * @default 'left'
	 */
	side?: SidebarSide;
	/**
	 * Current width in pixels.
	 * Bind with v-model:width and the parent stores the width.
	 * Omit this prop and the sidebar stores the width.
	 * The sidebar clamps this value to minWidth and maxWidth.
	 * It emits the clamped width.
	 * Pass width without v-model:width and the value is the start width.
	 * The sidebar keeps a resized width until the parent changes width or remounts the sidebar.
	 * @default 240
	 */
	width?: number;
	/**
	 * Local storage key for the width.
	 * The sidebar reads this key on mount.
	 * A saved width inside minWidth and maxWidth becomes the current width.
	 * The sidebar writes the width after each later change.
	 * Give each sidebar its own key.
	 * Omit this prop and the sidebar does not read or write storage.
	 */
	widthStorageId?: string;
	/**
	 * Width restored on double-click.
	 * Defaults to the width at mount, before a saved width is applied.
	 * The sidebar clamps this value to minWidth and maxWidth.
	 * The sidebar saves that restored width when widthStorageId is set.
	 */
	defaultWidth?: number;
	/**
	 * Minimum width in pixels.
	 * The width stays at or above this value.
	 * @default 160
	 */
	minWidth?: number;
	/**
	 * Maximum width in pixels.
	 * The width stays at or below this value.
	 * @default 480
	 */
	maxWidth?: number;
	/**
	 * Show the drag handle.
	 * @default true
	 */
	resizable?: boolean;
	/** Accessible name for the sidebar. */
	label?: string;
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

### Template usage examples

**Selectable list**

The list, the selection, and the row actions belong to the caller. `N8nListbox` moves the highlight. A control in a row stops its own click when that click must leave the selection alone.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nIcon, N8nListbox, N8nListboxItem, N8nSidebar } from '@n8n/design-system';

const width = ref(240);
const selectedId = ref('overview');

const links = [
	{ id: 'overview', label: 'Overview', icon: 'house' },
	{ id: 'workflows', label: 'Workflows', icon: 'workflow' },
	{ id: 'settings', label: 'Settings', icon: 'settings' },
];
</script>

<template>
	<N8nSidebar v-model:width="width" label="Sections" :min-width="160" :max-width="480">
		<N8nListbox v-model="selectedId" label="Sections">
			<N8nListboxItem v-for="item in links" :key="item.id" :value="item.id">
				<template #leading>
					<N8nIcon :icon="item.icon" />
				</template>
				{{ item.label }}
			</N8nListboxItem>
		</N8nListbox>
	</N8nSidebar>
</template>
```

**Form**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nInput, N8nInputLabel, N8nSidebar, N8nText } from '@n8n/design-system';

const width = ref(280);
const name = ref('Weekly digest');
</script>

<template>
	<N8nSidebar
		v-model:width="width"
		label="Details"
		:min-width="200"
		:max-width="420"
		style="--n8n-sidebar--padding: var(--spacing--sm)"
	>
		<N8nText bold size="medium">Details</N8nText>
		<N8nInputLabel label="Name" input-name="sidebar-name" />
		<N8nInput id="sidebar-name" v-model="name" size="small" />
	</N8nSidebar>
</template>
```

**Controlled and uncontrolled width**

Bind `v-model:width` and the parent stores the width. Omit `width` and the sidebar stores the width.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { N8nSidebar } from '@n8n/design-system';

const width = ref(240);
</script>

<template>
	<N8nSidebar v-model:width="width" label="Controlled" />
	<N8nSidebar label="Uncontrolled" />
</template>
```

**Pinned header and footer**

The search stays at the top. The action stays at the bottom. The list between them scrolls.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nListbox,
	N8nListboxItem,
	N8nSidebar,
} from '@n8n/design-system';

const width = ref(240);
const query = ref('');
const selectedId = ref('readme');

const files = [
	{ id: 'readme', label: 'README.md' },
	{ id: 'workflow', label: 'workflow.ts' },
	{ id: 'schema', label: 'schema.json' },
];

const visibleFiles = computed(() => {
	const term = query.value.trim().toLowerCase();
	if (term === '') return files;
	return files.filter((file) => file.label.toLowerCase().includes(term));
});
</script>

<template>
	<N8nSidebar v-model:width="width" label="Files" style="--n8n-sidebar--padding: 0">
		<template #header>
			<div style="padding: var(--spacing--xs) var(--spacing--sm)">
				<N8nInput
					v-model="query"
					size="small"
					placeholder="Search files"
					aria-label="Search files"
				/>
			</div>
		</template>
		<div style="padding: var(--spacing--2xs)">
			<N8nListbox v-model="selectedId" label="Files">
				<N8nListboxItem v-for="file in visibleFiles" :key="file.id" :value="file.id">
					<template #leading>
						<N8nIcon icon="file-text" />
					</template>
					{{ file.label }}
				</N8nListboxItem>
			</N8nListbox>
		</div>
		<template #footer>
			<div style="padding: var(--spacing--xs) var(--spacing--sm)">
				<N8nButton variant="outline" size="small" label="Add file" style="width: 100%" />
			</div>
		</template>
	</N8nSidebar>
</template>
```

**Inside a dialog**

The dialog body does not scroll. The sidebar scrolls its slot. The main area scrolls on its own.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
	N8nDialog,
	N8nDialogBody,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nSidebar,
} from '@n8n/design-system';

const open = ref(false);
const width = ref(240);
</script>

<template>
	<N8nDialog v-model:open="open" size="full" aria-label="Research plugin">
		<N8nDialogHeader>
			<N8nDialogTitle>Research plugin</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody style="padding: 0; overflow: hidden">
			<div style="display: flex; flex: 1; min-height: 0; overflow: hidden">
				<N8nSidebar v-model:width="width" width-storage-id="plugin-files-width" label="Plugin files">
					<!-- Caller content: a list, a form, or both. -->
				</N8nSidebar>
				<main style="flex: 1; min-width: 0; overflow: auto" />
			</div>
		</N8nDialogBody>
	</N8nDialog>
</template>
```
