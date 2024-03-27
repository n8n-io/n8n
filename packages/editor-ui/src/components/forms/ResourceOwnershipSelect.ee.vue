<template>
	<div class="resource-ownership-select">
		<n8n-menu
			:items="menuItems"
			mode="tabs"
			:model-value="value ? 'owner' : 'all'"
			@update:model-value="onSelectOwner"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { IMenuItem } from 'n8n-design-system';

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
	},
	computed: {
		menuItems(): IMenuItem[] {
			return [
				{
					id: 'all',
					icon: 'globe-americas',
					label: this.allResourcesLabel,
					position: 'top',
				},
				{
					id: 'owner',
					icon: 'user',
					label: this.myResourcesLabel,
					position: 'top',
				},
			];
		},
	},
	methods: {
		onSelectOwner(type: string) {
			this.$emit('update:modelValue', type === 'owner');
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
