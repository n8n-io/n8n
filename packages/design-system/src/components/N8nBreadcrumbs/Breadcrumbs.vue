<script lang="ts" setup>
import { computed } from 'vue';

export type PathItem = {
	id: string;
	label: string;
	href?: string;
};

type Props = {
	items: PathItem[];
	hasHiddenItems?: boolean;
	hiddenItemsTooltip: string;
	theme: 'small' | 'medium';
	showBorder?: boolean;
};

const emit = defineEmits<{
	beforeTooltipOpen: [];
	tooltipOpened: [];
	tooltipClosed: [];
}>();

defineOptions({ name: 'N8nBreadcrumbs' });

const props = withDefaults(defineProps<Props>(), {
	theme: 'medium',
	hasHiddenItems: false,
	hiddenItemsTooltip: '',
	showBorder: true,
});

const tooltipText = computed(() => {
	return props.hiddenItemsTooltip;
});

const handleBeforeTooltipShow = () => {
	emit('beforeTooltipOpen');
};

const handleTooltipShow = () => {
	emit('tooltipOpened');
};

const handleTooltipClose = () => {
	emit('tooltipClosed');
};
</script>
<template>
	<div :class="$style.container">
		<ul :class="$style.list">
			<li v-if="props.hasHiddenItems" :class="$style.ellipsis" aria-hidden="true">
				<n8n-tooltip
					:content="tooltipText"
					:popper-class="$style.tooltip"
					@show="handleTooltipShow"
					@before-show="handleBeforeTooltipShow"
					@hide="handleTooltipClose"
				>
					<span>...</span>
				</n8n-tooltip>
			</li>
			<li v-if="props.hasHiddenItems" class="separator" aria-hidden="true">/</li>
			<template v-for="(item, index) in items" :key="item.id">
				<li>
					<n8n-link v-if="item.href" :href="item.href" theme="text">{{ item.label }}</n8n-link>
					<n8n-text v-else>{{ item.label }}</n8n-text>
				</li>
				<li v-if="index !== items.length - 1" class="separator" aria-hidden="true">/</li>
			</template>
		</ul>
	</div>
</template>
<style lang="scss" module>
.container {
	display: flex;
}

.list {
	display: flex;
	list-style: none;
	padding: 0;
	margin: 0;

	li {
		color: var(--color-text-base);
		padding: var(--spacing-5xs);
	}
}

.ellipsis {
	cursor: pointer;
}

.hiddenItems {
	display: flex;
	align-items: center;
}

.tooltip {
	& > div {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3xs);
	}
}
</style>
