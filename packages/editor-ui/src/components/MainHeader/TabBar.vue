<template>
	<div v-if="items" :class="[$style.container, 'tab-bar-container']">
		<n8n-button
			v-for="tab in items"
			:key="tab.id"
			:class="{
				[$style.tabButton]: true,
				[$style.active]: tab.id === activeTab,
			}"
			size="small"
			type="tertiary"
			:label="tab.label"
			:disabled="tab.disabled"
			@click="onSelect(tab.id, $event)"
		>
			{{ tab.label }}
			<n8n-badge
				v-if="tab.notifications > 0"
				theme="primary"
				size="small"
				:class="['ml-4xs', $style.notificationCount]"
			>
				<span v-if="tab.notifications < 99">{{ tab.notifications }}</span>
				<span v-else>99+</span>
			</n8n-badge>
		</n8n-button>
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

.tabButton {
	background: none;
	border: none;
	color: var(--color-text-base);
	font-weight: 600 !important;

	& + & {
		margin-left: var(--spacing-2xs);
	}

	&.active, &:active {
		background-color: var(--color-background-xlight);
		color: var(--text-color-dark);

		&:disabled { background: none; }
	}

	&:focus { outline: none; }
}

.notificationCount {
	background-color: var(--color-success);
	border-color: var(--color-success );
	& > span { font-size: var(--font-size-3xs); }
}

@media screen and (max-width: 430px) {
	.container {
		flex-direction: column;
	}

	.tabButton {
		margin-left: 0 !important;

		& + & {
			margin-top: var(--spacing-2xs);
		}
	}
}

</style>
