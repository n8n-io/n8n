<template>
	<div v-if="items" :class="{[$style.container]: true, ['tab-bar-container']: true, [$style.menuCollapsed]: mainSidebarCollapsed}">
		<n8n-radio-buttons
			:value="activeTab"
			:options="items"
			@input="onSelect"
		/>
	</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import { ITabBarItem } from '@/Interface';
import { MAIN_HEADER_TABS } from '@/constants';

export default Vue.extend({
	name: 'tab-bar',
	data() {
		return {
			MAIN_HEADER_TABS,
		};
	},
	props: {
		items: {
			type: Array as PropType<ITabBarItem[]>,
			required: true,
		},
		activeTab: {
			type: String,
			default: MAIN_HEADER_TABS.WORKFLOW,
		},
	},
	computed: {
		mainSidebarCollapsed(): boolean {
			return this.$store.getters['ui/sidebarMenuCollapsed'];
		},
	},
	methods: {
		onSelect(tab: string, event: MouseEvent): void {
			this.$emit('select', tab, event);
		},
	},
});
</script>

<style module lang="scss">

.container {
	position: absolute;
	top: 47px;
	left: calc(50% + 100px);
	transform: translateX(-50%);
	min-height: 30px;
	display: flex;
	padding: var(--spacing-5xs);
	background-color: var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	transition: all 150ms ease-in-out;

	&.menuCollapsed {
		left: 52%;
	}
}

@media screen and (max-width: 430px) {
	.container {
		flex-direction: column;
	}
}
</style>
