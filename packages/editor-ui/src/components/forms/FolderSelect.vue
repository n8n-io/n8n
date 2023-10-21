<template>
	<div class="resource-folder-select">
		<n8n-menu
			:items="menuItems"
			mode="tabs"
			:modelValue="value"
			@update:modelValue="onSelectFolder"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { IMenuItem } from 'n8n-design-system';

export interface IResource {
	id: string;
	name: string;
	updatedAt: string;
	createdAt: string;
}

export default defineComponent({
	props: {
		value: {
			type: Boolean,
			default: true,
		},
		myResourcesLabel: {
			type: String,
			default: '',
		},
		allResourcesLabel: {
			type: String,
			default: '',
		},
		resources: {
			type: Array,
			default: (): IResource[] => [],
		},
	},
	computed: {
		menuItems(): IMenuItem[] {
			return [
				{
					id: 'folder',
					icon: 'folder-open',
					label: 'Folders',
					position: 'top',
				},
				{
					id: 'no-folder',
					icon: 'folder-open',
					label: 'All workflows',
					position: 'top',
				},
			];
		},
	},
	methods: {
		onSelectFolder(type: string) {
			this.$emit('update:modelValue', type);
		},
	},
});
</script>

<style lang="scss" scoped>
.menu-container {
	--menu-background: transparent;
	--menu-padding: 0;
}
</style>
