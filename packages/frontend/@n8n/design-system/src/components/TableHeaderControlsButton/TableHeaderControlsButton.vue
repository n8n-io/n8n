<script setup lang="ts" generic="ColumnType extends ColumnHeader">
import { computed, ref } from 'vue';

import { useI18n } from '../../composables/useI18n';
import type { ButtonSize, IconSize } from '../../types';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nPopoverReka from '../N8nPopoverReka/N8nPopoverReka.vue';

export type ColumnHeader =
	| {
			key: string;
			label: string;
			visible: boolean;
			disabled: false;
	  }
	// Disabled state ensures current sort order is not lost if user resorts teh columns
	// even if some columns are disabled / not available in the current run
	| { key: string; disabled: true };

interface Props {
	columns: ColumnType[];
	buttonSize?: ButtonSize;
	iconSize?: IconSize;
}

const props = defineProps<Props>();

const visibleColumns = computed(() =>
	props.columns.filter(
		(column): column is ColumnType & { disabled: false } => !column.disabled && column.visible,
	),
);
const hiddenColumns = computed(() =>
	props.columns.filter(
		(column): column is ColumnType & { disabled: false } => !column.disabled && !column.visible,
	),
);

const { t } = useI18n();

const draggedItem = ref<string | null>(null);
const dragOverItem = ref<string | null>(null);

const emit = defineEmits<{
	'update:columnVisibility': [key: string, visibility: boolean];
	'update:columnOrder': [newOrder: string[]];
}>();

const resetDragState = () => {
	draggedItem.value = null;
	dragOverItem.value = null;
};

const handleDragStart = (event: DragEvent, columnKey: string) => {
	if (!event.dataTransfer) return;
	draggedItem.value = columnKey;
	event.dataTransfer.effectAllowed = 'move';
	event.dataTransfer.setData('text/plain', columnKey);
};

const handleDragOver = (event: DragEvent, columnKey: string) => {
	event.preventDefault();
	if (!event.dataTransfer) return;
	event.dataTransfer.dropEffect = 'move';
	dragOverItem.value = columnKey;
};

const handleDragLeave = () => {
	dragOverItem.value = null;
};

const handleDrop = (event: DragEvent, targetColumnKey: string) => {
	event.preventDefault();

	const draggedColumnKey = draggedItem.value;
	if (!draggedColumnKey || draggedColumnKey === targetColumnKey) {
		resetDragState();
		return;
	}

	// Get all column keys in their original order, including hidden and disabled
	const allColumnKeys = props.columns.map((col) => col.key);
	const draggedIndex = allColumnKeys.indexOf(draggedColumnKey);

	if (draggedIndex === -1) {
		resetDragState();
		return;
	}

	let newOrder: string[];

	if (targetColumnKey === 'END') {
		// Move to end
		newOrder = [...allColumnKeys];
		newOrder.splice(draggedIndex, 1);
		newOrder.push(draggedColumnKey);
	} else {
		// Move to specific position
		const targetIndex = allColumnKeys.indexOf(targetColumnKey);

		if (targetIndex === -1) {
			resetDragState();
			return;
		}

		newOrder = [...allColumnKeys];
		newOrder.splice(draggedIndex, 1);

		// When dragging onto a target, insert at the target's position
		// The target will naturally shift due to the insertion
		let insertIndex = targetIndex;

		// If we removed an item before the target, the target's index has shifted left by 1
		if (draggedIndex <= targetIndex) {
			insertIndex = targetIndex - 1;
		}

		newOrder.splice(insertIndex, 0, draggedColumnKey);
	}

	emit('update:columnOrder', newOrder);
	resetDragState();
};

const handleDragEnd = () => {
	resetDragState();
};
</script>

<template>
	<N8nPopoverReka :class="$style.container" width="260px" max-height="300px" scroll-type="auto">
		<template #trigger>
			<N8nButton
				icon="sliders-horizontal"
				type="secondary"
				:icon-size="iconSize"
				:size="buttonSize"
			>
				{{ t('tableControlsButton.display') }}
			</N8nButton>
		</template>
		<template #content>
			<div :class="$style.contentContainer">
				<div
					v-if="visibleColumns.length"
					:style="{ display: 'flex', flexDirection: 'column', gap: 2 }"
					data-testid="visible-columns-section"
				>
					<h5 :class="$style.header">
						{{ t('tableControlsButton.shown') }}
					</h5>
					<div v-for="column in visibleColumns" :key="column.key" :class="$style.columnWrapper">
						<div
							v-if="dragOverItem === column.key"
							:class="$style.dropIndicator"
							data-testid="drop-indicator"
						></div>
						<fieldset
							:class="[
								$style.column,
								$style.draggable,
								{ [$style.dragging]: draggedItem === column.key },
							]"
							draggable="true"
							data-testid="visible-column"
							:data-column-key="column.key"
							@dragstart="(event) => handleDragStart(event, column.key)"
							@dragover="(event) => handleDragOver(event, column.key)"
							@dragleave="handleDragLeave"
							@drop="(event) => handleDrop(event, column.key)"
							@dragend="handleDragEnd"
						>
							<N8nIcon icon="grip-vertical" :class="$style.grip" />
							<label>{{ column.label }}</label>
							<N8nIcon
								:class="$style.visibilityToggle"
								icon="eye"
								data-testid="visibility-toggle-visible"
								@click="() => emit('update:columnVisibility', column.key, false)"
							/>
						</fieldset>
					</div>
					<!-- Drop zone at the end -->
					<div
						:class="$style.endDropZone"
						data-testid="end-drop-zone"
						@dragover="(event) => handleDragOver(event, 'END')"
						@dragleave="handleDragLeave"
						@drop="(event) => handleDrop(event, 'END')"
					>
						<div
							v-if="dragOverItem === 'END'"
							:class="$style.dropIndicator"
							data-testid="drop-indicator"
						></div>
					</div>
				</div>
				<div
					v-if="hiddenColumns.length"
					:style="{ display: 'flex', flexDirection: 'column', gap: 2 }"
					data-testid="hidden-columns-section"
				>
					<h4 :class="$style.header">
						{{ t('tableControlsButton.hidden') }}
					</h4>
					<fieldset
						v-for="column in hiddenColumns"
						:key="column.key"
						:class="[$style.column, $style.hidden]"
						data-testid="hidden-column"
						:data-column-key="column.key"
					>
						<N8nIcon icon="grip-vertical" :class="[$style.grip, $style.hidden]" />
						<label>{{ column.label }}</label>
						<N8nIcon
							:class="$style.visibilityToggle"
							icon="eye-off"
							data-testid="visibility-toggle-hidden"
							@click="() => emit('update:columnVisibility', column.key, true)"
						/>
					</fieldset>
				</div>
			</div>
		</template>
	</N8nPopoverReka>
</template>

<style lang="scss" module>
.header {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	margin-bottom: var(--spacing--xs);
}

.grip {
	color: var(--color--text--tint-1);
	cursor: move;

	&.hidden {
		cursor: default;
	}
}

.contentContainer {
	padding: var(--spacing--sm);
}

.column {
	display: flex;
	gap: 12px;
	color: var(--color--text--shade-1);
	padding: 6px 0;
	align-items: center;

	label {
		font-size: var(--font-size--xs);
		flex-grow: 1;
	}
}

.draggable {
	cursor: grab;
	transition: all 0.2s ease;

	&:active {
		cursor: grabbing;
	}
}

.dragging {
	opacity: 0.5;
	transform: scale(0.95);
}

.columnWrapper {
	position: relative;
}

.dropIndicator {
	position: absolute;
	top: -2px;
	left: 0;
	right: 0;
	height: 3px;
	background-color: var(--prim-color-secondary);
	border-radius: 2px;
	z-index: 10;
}

.endDropZone {
	position: relative;
	height: 8px;
	width: 100%;
}

.hidden {
	color: var(--color--text--tint-2);

	label {
		color: var(--color--text--tint-1);
	}
}

.visibilityToggle {
	cursor: pointer;
}
</style>
