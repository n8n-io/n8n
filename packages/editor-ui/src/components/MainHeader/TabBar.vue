<template>
	<div v-if="items" :class="[$style.container, 'tab-bar-container']">
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
	left: 50%;
	transform: translateX(-50%);
	min-height: 30px;
	display: flex;
	padding: var(--spacing-5xs);
	background-color: var(--color-foreground-base);
	border-radius: var(--border-radius-base)
}

@media screen and (max-width: 430px) {
	.container {
		flex-direction: column;
	}
}
</style>
