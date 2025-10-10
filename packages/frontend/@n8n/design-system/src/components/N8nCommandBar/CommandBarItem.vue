<script lang="ts" setup>
import type { CommandBarItem } from './types';

const props = defineProps<{
	item: CommandBarItem;
	isSelected: boolean;
}>();

const emit = defineEmits<{
	select: [item: CommandBarItem];
}>();

const handleSelect = () => {
	emit('select', props.item);
};
</script>

<template>
	<div
		:key="item.id"
		:data-item-id="item.id"
		:class="[$style.item, { [$style.selected]: isSelected }]"
		@click.stop="handleSelect"
	>
		<div v-if="item.icon" :class="$style.icon">
			<span v-if="item.icon && 'html' in item.icon" v-n8n-html="item.icon.html"></span>
			<component
				:is="item.icon.component"
				v-else-if="item.icon && 'component' in item.icon"
				v-bind="item.icon.props"
			/>
		</div>
		<div :class="$style.content">
			<div :class="$style.title">{{ item.title }}</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.item {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
	height: var(--spacing--2xl);
	padding: 0 var(--spacing--sm);
	cursor: pointer;
	position: relative;
	margin-left: var(--border-width);
	transition: background-color 0.1s ease;

	&::before {
		content: '';
		position: absolute;
		left: calc(-1 * var(--border-width));
		top: 0;
		bottom: 0;
		width: calc(2 * var(--border-width));
		background-color: transparent;
		transition: background-color 0.1s ease;
	}

	&:hover {
		background-color: var(--color--foreground);

		&::before {
			background-color: var(--color--foreground--shade-1);
		}
	}

	&.selected {
		background-color: var(--color--foreground);

		&::before {
			background-color: var(--color--primary);
		}
	}
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	flex-shrink: 0;
}

.content {
	flex: 1;
	min-width: 0;
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--shade-1);
	line-height: var(--line-height--sm);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.meta {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}
</style>
