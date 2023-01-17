<template>
	<n8n-menu
		:items="menuItems"
		mode="tabs"
		:value="value ? 'owner' : 'all'"
		@input="onSelectOwner"
	/>
</template>

<script lang="ts">
import Vue from 'vue';
import { IMenuItem } from 'n8n-design-system';

export default Vue.extend({
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
			this.$emit('input', type === 'owner');
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
