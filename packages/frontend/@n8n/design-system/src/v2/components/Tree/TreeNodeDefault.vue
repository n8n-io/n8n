<script setup lang="ts">
import { useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import type { TreeNodeDefaultSlots } from './Tree.types';
import treeVariables from './Tree.variables.module.css';

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
		indentLevel?: number;
		handleToggle: () => void;
		handleSelect: () => void;
	}>(),
	{
		showExpandArrow: true,
		indentLevel: 0,
	},
);

defineSlots<TreeNodeDefaultSlots>();
</script>

<template>
	<li
		data-test-id="tree-node"
		:class="[
			treeVariables.root,
			$style.treeItem,
			{
				[$style.treeItemSelected]: isSelected,
				[$style.treeItemDisabled]: disabled,
			},
		]"
		:style="{ '--tree-indent': indentLevel }"
		:data-has-toggle="showExpandArrow && hasChildren ? '' : undefined"
	>
		<template v-if="indentLevel > 0">
			<div
				v-for="n in indentLevel"
				:key="n"
				:class="$style.trackline"
				:style="{ '--indent': n - 1 }"
				aria-hidden="true"
			/>
		</template>

		<slot
			name="icon"
			:icon="icon"
			:disabled="disabled"
			:is-selected="isSelected"
			:ui="{ class: $style.treeItemIcon }"
		>
			<span v-if="icon" :class="$style.treeItemIcon" data-test-id="tree-node-icon">
				<Icon :icon="icon" size="small" />
			</span>
		</slot>

		<slot
			name="label"
			:label="label"
			:disabled="disabled"
			:handle-select="handleSelect"
			:ui="{ class: $style.treeItemLabel }"
		>
			<span
				:class="$style.treeItemLabel"
				data-test-id="tree-node-label"
				:aria-disabled="disabled ? 'true' : undefined"
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
			:ui="{
				class: $style.treeItemToggle,
				iconClass: $style.treeItemToggleIcon,
				iconExpandedClass: $style.treeItemToggleIconExpanded,
			}"
		>
			<button
				type="button"
				tabindex="-1"
				:class="$style.treeItemToggle"
				:aria-label="isExpanded ? `Collapse ${label}` : `Expand ${label}`"
				:aria-expanded="isExpanded"
				:disabled="disabled"
				data-test-id="tree-node-toggle"
				@click.stop="handleToggle()"
			>
				<Icon
					icon="chevron-right"
					size="small"
					aria-hidden="true"
					:class="[$style.treeItemToggleIcon, { [$style.treeItemToggleIconExpanded]: isExpanded }]"
				/>
			</button>
		</slot>
	</li>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.treeItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	height: var(--tree-item-height);
	position: relative;
	padding-block: var(--tree-item-padding-block);
	padding-left: calc(
		var(--tree-item-padding-inline) + var(--tree-indent-unit) * var(--tree-indent, 0)
	);
	border-radius: var(--radius);
	outline: none;
	cursor: pointer;
	user-select: none;
	color: var(--text-color);
	background-color: transparent;

	&[data-has-toggle] {
		padding-right: calc(var(--tree-item-padding-inline) * 2);
	}

	&:hover:not([data-disabled]) {
		background-color: var(--background--hover);
	}

	&:active:not([data-disabled]) {
		background-color: var(--background--active);
	}

	&:focus-visible:not([data-disabled]) {
		background-color: var(--background--hover);
		@include focus.focus-ring;
	}

	&:focus-visible[data-selected]:not([data-disabled]) {
		background-color: var(--background--hover);
	}
}

.treeItemSelected {
	color: var(--button--color--text--highlight-fill--hover-active-focus);
	background-color: var(--background--active);

	&:hover:not([data-disabled]),
	&:active:not([data-disabled]),
	&:focus-visible:not([data-disabled]) {
		background-color: var(--background--active);
	}
}

.treeItemSelected .treeItemIcon {
	color: var(--button--color--text--highlight-fill--hover-active-focus);
}

.treeItemDisabled {
	cursor: not-allowed;
	color: var(--text-color--disabled);
}

.treeItemDisabled .treeItemIcon,
.treeItemDisabled .treeItemToggle {
	color: var(--text-color--disabled);
}

.trackline {
	position: absolute;
	top: 0;
	bottom: 0;
	left: calc(
		var(--tree-item-padding-inline) + var(--tree-indent-unit) * var(--indent) +
			var(--tree-icon-size) / 2
	);
	z-index: 1;
	width: 1px;
	background-color: var(--border-color--subtle);
	pointer-events: none;
}

.treeItemIcon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--tree-icon-size);
	height: var(--tree-icon-size);
	border-radius: var(--radius--sm);
	color: var(--icon-color);
}

.treeItemToggle {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	margin-left: auto;
	padding: 0;
	border: none;
	background: none;
	color: var(--icon-color);
	cursor: pointer;

	&:disabled {
		cursor: not-allowed;
	}
}

.treeItemToggleIconExpanded {
	transform: rotate(90deg);
}

.treeItemLabel {
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	font-weight: var(--font-weight--medium);
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
