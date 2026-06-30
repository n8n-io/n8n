<script setup lang="ts">
import { computed, useCssModule } from 'vue';

import N8nIcon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import type { TreeNodeDefaultSlots } from './Tree.types';

const $style = useCssModule();

withDefaults(
	defineProps<{
		label: string;
		icon?: IconName;
		disabled?: boolean;
		showExpandArrow?: boolean;
		isExpanded: boolean;
		isSelected: boolean;
		hasChildren: boolean;
		handleToggle: () => void;
		handleSelect: () => void;
	}>(),
	{
		showExpandArrow: true,
	},
);

defineSlots<TreeNodeDefaultSlots>();

const iconUi = computed(() => ({ class: $style.treeItemIcon }));
const labelUi = computed(() => ({ class: $style.treeItemLabel }));
const toggleUi = computed(() => ({
	class: $style.treeItemToggle,
	iconClass: $style.treeItemToggleIcon,
	iconExpandedClass: $style.treeItemToggleIconExpanded,
}));
</script>

<template>
	<div
		:class="[
			$style.treeItem,
			{
				[$style.treeItemSelected]: isSelected,
				[$style.treeItemDisabled]: disabled,
			},
		]"
		:data-disabled="disabled ? '' : undefined"
		:data-has-toggle="showExpandArrow && hasChildren ? '' : undefined"
	>
		<slot name="icon" :icon="icon" :disabled="disabled" :is-selected="isSelected" :ui="iconUi">
			<span v-if="icon" :class="$style.treeItemIcon" data-test-id="tree-node-icon">
				<N8nIcon :icon="icon" size="small" />
			</span>
		</slot>

		<slot
			name="label"
			:label="label"
			:disabled="disabled"
			:handle-select="handleSelect"
			:ui="labelUi"
		>
			<span
				:class="$style.treeItemLabel"
				data-test-id="tree-node-label"
				:aria-disabled="disabled ? 'true' : undefined"
				@click.stop="!disabled && handleSelect()"
			>
				{{ label }}
			</span>
		</slot>

		<slot
			v-if="showExpandArrow && hasChildren"
			name="toggle"
			:label="label"
			:disabled="disabled"
			:is-expanded="isExpanded"
			:handle-toggle="handleToggle"
			:ui="toggleUi"
		>
			<button
				type="button"
				:class="$style.treeItemToggle"
				:aria-label="isExpanded ? `Collapse ${label}` : `Expand ${label}`"
				:aria-expanded="isExpanded"
				:disabled="disabled"
				data-test-id="tree-node-toggle"
				@click.stop="handleToggle()"
			>
				<N8nIcon
					icon="chevron-right"
					size="small"
					:class="[$style.treeItemToggleIcon, { [$style.treeItemToggleIconExpanded]: isExpanded }]"
				/>
			</button>
		</slot>
	</div>
</template>

<style lang="css" module>
.treeItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	height: var(--tree-item-height);
	border-radius: var(--radius);
	padding: var(--tree-item-padding-block);
	cursor: pointer;
	user-select: none;
	color: var(--color--text--shade-1);
	background-color: transparent;
	transition: background-color 0.15s ease;

	&[data-has-toggle] {
		padding-right: calc(var(--tree-item-padding-inline) * 2);
	}

	&:hover:not([data-disabled]) {
		background-color: var(--color--background--light-2);
	}

	&:active:not([data-disabled]) {
		background-color: var(--color--background--light-3);
	}

	:global([role='treeitem']:focus-visible) & {
		background-color: var(--color--background--light-2);
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: 0;
		z-index: 1;
	}
}

.treeItemSelected {
	color: var(--color--primary);
	background-color: var(--color--background--light-1);

	&:hover:not([data-disabled]),
	&:active:not([data-disabled]),
	:global([role='treeitem']:focus-visible) & {
		background-color: var(--color--background--light-1);
	}
}

.treeItemSelected .treeItemIcon {
	color: var(--color--primary);
}

.treeItemDisabled {
	cursor: not-allowed;
	opacity: 0.5;
}

.treeItemIcon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--tree-icon-size);
	height: var(--tree-icon-size);
	border-radius: var(--radius--sm);
	color: var(--color--text--tint-1);
}

.treeItemToggle {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	margin-left: auto;
	border: none;
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:disabled {
		cursor: not-allowed;
	}
}

.treeItemToggleIcon {
	transition: transform var(--duration--snappy) var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.treeItemToggleIconExpanded {
	transform: rotate(90deg);
}

.treeItemLabel {
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
