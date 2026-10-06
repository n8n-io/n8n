<script lang="ts" setup>
import { computed } from 'vue';

import type { CommandBarItem, CommandBarSelectOptions } from './types';
import N8nIcon from '../N8nIcon';
import N8nKeyboardShortcut from '../N8nKeyboardShortcut/N8nKeyboardShortcut.vue';
import N8nTimeAgo from '../N8nTimeAgo';

const props = defineProps<{
	item: CommandBarItem;
	rowKey: string;
	isSelected: boolean;
	query: string;
}>();

const emit = defineEmits<{
	select: [item: CommandBarItem, options: CommandBarSelectOptions];
	hover: [rowKey: string];
}>();

const titleParts = computed(() => {
	const needle = props.query.trim().toLowerCase();
	const start = needle ? props.item.title.toLowerCase().indexOf(needle) : -1;
	if (start === -1) {
		return { before: props.item.title, match: '', after: '' };
	}
	const end = start + needle.length;
	return {
		before: props.item.title.slice(0, start),
		match: props.item.title.slice(start, end),
		after: props.item.title.slice(end),
	};
});

function onClick(event: MouseEvent) {
	const opensNewTab = event.metaKey || event.ctrlKey || event.shiftKey;
	if (props.item.href && opensNewTab) {
		return;
	}
	event.preventDefault();
	emit('select', props.item, { newTab: false });
}
</script>

<template>
	<component
		:is="item.href ? 'a' : 'div'"
		:id="rowKey"
		:href="item.href"
		role="option"
		:aria-selected="isSelected"
		:aria-disabled="item.disabled || undefined"
		:data-row-key="rowKey"
		:class="[$style.item, { [$style.selected]: isSelected, [$style.disabled]: item.disabled }]"
		data-test-id="command-bar-item"
		@mousedown.prevent
		@click="onClick"
		@pointermove="emit('hover', rowKey)"
	>
		<span v-if="item.icon" :class="$style.icon">
			<component
				:is="item.icon.component"
				v-if="'component' in item.icon"
				v-bind="item.icon.props"
			/>
			<N8nIcon v-else-if="item.icon.type === 'icon'" :icon="item.icon.value" size="large" />
			<span v-else :class="$style.emoji">{{ item.icon.value }}</span>
		</span>
		<span :class="$style.content">
			<span :class="$style.title"
				>{{ titleParts.before
				}}<mark v-if="titleParts.match" :class="$style.match">{{ titleParts.match }}</mark
				>{{ titleParts.after }}</span
			>
			<span v-if="item.description" :class="$style.description">
				<template v-if="item.descriptionIcon">
					<N8nIcon
						v-if="item.descriptionIcon.type === 'icon'"
						:icon="item.descriptionIcon.value"
						size="small"
					/>
					<span v-else>{{ item.descriptionIcon.value }}</span>
				</template>
				<span :class="$style.descriptionText">{{ item.description }}</span>
			</span>
		</span>
		<span :class="$style.trailing">
			<N8nKeyboardShortcut
				v-if="item.shortcut"
				:keys="item.shortcut.keys"
				:meta-key="item.shortcut.metaKey"
				:alt-key="item.shortcut.altKey"
				:shift-key="item.shortcut.shiftKey"
			/>
			<N8nTimeAgo
				v-else-if="item.timestamp && !isSelected"
				:class="$style.timestamp"
				:date="item.timestamp"
				capitalize
			/>
			<N8nIcon v-if="item.disabled" icon="lock" size="small" :class="$style.lock" />
			<span v-if="isSelected && !item.disabled" :class="$style.enterHint" aria-hidden="true"
				>↵</span
			>
		</span>
	</component>
</template>

<style lang="scss" module>
.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	height: var(--command-bar-item--height);
	padding: 0 var(--spacing--xs);
	border-radius: var(--radius--xs);
	color: var(--text-color);
	text-decoration: none;
	cursor: pointer;
	user-select: none;

	&.selected {
		background-color: var(--background--hover);
	}

	&.disabled {
		cursor: not-allowed;

		.icon,
		.content {
			opacity: 0.45;
		}
	}
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	color: var(--icon-color);
}

.emoji {
	font-size: var(--font-size--md);
	line-height: 1;
}

.content {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--xs);
	flex: 1;
	min-width: 0;
}

.title {
	flex-shrink: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}

.match {
	background: none;
	color: inherit;
	font-style: normal;
	font-weight: var(--font-weight--bold);
}

.description {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 1000;
	min-width: 0;
	max-width: 60%;
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
}

.descriptionText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.trailing {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
	margin-left: auto;
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
}

.timestamp {
	white-space: nowrap;
}

.lock {
	color: var(--icon-color);
}

.enterHint {
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
}
</style>
