<script lang="ts" setup>
import { ref } from 'vue';

import type { CommandBarItem } from './types';

const props = defineProps<{
	item: CommandBarItem;
	isSelected: boolean;
}>();

const emit = defineEmits<{
	select: [item: CommandBarItem];
}>();

const isHovered = ref(false);

const handleSelect = () => {
	emit('select', props.item);
};

const handleMouseEnter = () => {
	isHovered.value = true;
};

const handleMouseLeave = () => {
	isHovered.value = false;
};
</script>

<template>
	<div
		:key="item.id"
		:data-item-id="item.id"
		:class="[$style.item, { [$style.selected]: isSelected }]"
		@click.stop="handleSelect"
		@mouseenter="handleMouseEnter"
		@mouseleave="handleMouseLeave"
	>
		<div v-if="item.icon" :class="$style.icon">
			<span
				v-if="item.icon && 'html' in item.icon"
				v-n8n-html="item.icon.html"
				:class="$style.iconHtml"
			></span>
			<component
				:is="item.icon.component"
				v-else-if="item.icon && 'component' in item.icon"
				v-bind="item.icon.props"
			/>
		</div>
		<div :class="$style.content">
			<div :class="$style.title">
				<template v-if="typeof item.title === 'string'">{{ item.title }}</template>
				<component
					:is="item.title.component"
					v-else
					v-bind="{ ...item.title.props, isSelected, isHovered }"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.item {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
	height: var(--command-bar-item--height);
	padding: 0 var(--spacing--2xs);
	cursor: pointer;
	border-radius: var(--radius);
	transition: background-color 0.1s ease;

	&:hover {
		background-color: var(--command-bar-item--color--background--hover);
	}

	&.selected {
		background-color: var(--command-bar-item--color--background--hover);
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

.iconHtml {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}

.content {
	flex: 1;
	min-width: 0;
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	color: var(--color--text);
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
