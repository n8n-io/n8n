# Component specification

Primitive style wrapper for re-use across different types of menus: Sidebar, DropdownMenu, ContextMenu etc. As it wraps a primitive it can be used as different types of elements a, button or other Reka components etc.

- **Component Name:** N8nMenuItem
- **Figma Component:** [Figma](https://www.figma.com/design/8zib7Trf2D2CHYXrEGPHkg/n8n-Design-System-V3?m=auto&node-id=2388-8034&t=lj9ZucXrX3UZMu4U-1)
- **Reka UI Component:** [Primitive](https://reka-ui.com/docs/utilities/primitive)


## Public API definition

**Props**

- `item: IMenuItem` Existing type from design system.
- `collapsed?: boolean` True for collapsed sidebar where only icon is visible

**Slots**

- `toggle`: Slot for toggle button, for use with trees and collapsible lists.
- `actions`: Slot for right side actions, use for buttons or dropdown menus.


### Template usage example

```Typescript
<script setup lang="ts">
const collapsed = ref(false)
const items = ref<IMenuItem[]>([
	{
		id: 'menu-item-1',
		label: 'Menu Item 1',
		icon: 'home',
		route: { to: '/home' },
	},
	{
		id: 'menu-item-2',
		label: 'Menu Item 2',
		icon: { type: 'emoji', value: '🔥' },
		route: { to: '/fire' },
	},
	{
		id: 'menu-item-3',
		label: 'Menu Item 3',
		icon: { type: 'icon', value: 'settings' },
		route: { to: '/settings' },
	}])
</script>

<template>
  <N8nMenuItem
		as="button"
		v-for="item in items"
		:item="item"
		:collapsed="collapsed"
	/>
</template>
```

```Typescript
<script setup lang="ts">
const collapsed = ref(false)
const items = ref<IMenuItem[]>([...])
</script>

<template>
<N8nTree>// <- TBD
  <N8nMenuItem
		as="a"
		v-for="item in items"
		:item="item"
		:collapsed="collapsed"
	>
		<template #toggle>
			<N8nIconButton
				size="mini"
				type="highlight"
				icon="chevron-right"
				icon-size="medium"
				aria-label="Go to details"
			/>
		</template>
		<template #actions>
			<N8nIconButton
				size="mini"
				type="highlight"
				icon="ellipsis"
				icon-size="medium"
				aria-label="Go to details"
			/>
			<N8nIconButton
				size="mini"
				type="highlight"
				icon="plus"
				icon-size="medium"
				aria-label="Go to details"
			/>
		</template>
	</N8nTree>
</template>
```
