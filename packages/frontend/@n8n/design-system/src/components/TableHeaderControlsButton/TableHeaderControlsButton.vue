<script setup lang="ts">
import { computed, ref } from 'vue';

import { useI18n } from '@n8n/design-system/composables/useI18n';

import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nPopoverReka from '../N8nPopoverReka/N8nPopoverReka.vue';

interface ColumnHeader {
	key: string;
	label: string;
	visible: boolean;
}

interface Props {
	columns: ColumnHeader[];
}

const props = defineProps<Props>();

const visibleColumns = computed(() => props.columns.filter((column) => column.visible));
const hiddenColumns = computed(() => props.columns.filter((column) => !column.visible));

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

	const visibleColumnKeys = visibleColumns.value.map((col) => col.key);
	const draggedIndex = visibleColumnKeys.indexOf(draggedColumnKey);

	if (draggedIndex === -1) {
		resetDragState();
		return;
	}

	let newOrder: string[];

	if (targetColumnKey === 'END') {
		// Move to end
		newOrder = [...visibleColumnKeys];
		newOrder.splice(draggedIndex, 1);
		newOrder.push(draggedColumnKey);
	} else {
		// Move to specific position
		const targetIndex = visibleColumnKeys.indexOf(targetColumnKey);

		if (targetIndex === -1) {
			resetDragState();
			return;
		}

		newOrder = [...visibleColumnKeys];
		newOrder.splice(draggedIndex, 1);
		newOrder.splice(targetIndex, 0, draggedColumnKey);
	}

	emit('update:columnOrder', newOrder);
	resetDragState();
};

const handleDragEnd = () => {
	resetDragState();
};
</script>

<template>
	<N8nPopoverReka>
		<template #trigger>
			<N8nButton icon="sliders-horizontal" type="secondary">
				{{ t('tableControlsButton.display') }}
			</N8nButton>
		</template>
		<template #content>
			<div
				v-if="visibleColumns.length"
				:style="{ display: 'flex', flexDirection: 'column', gap: 2 }"
			>
				<h4 :class="$style.header">
					{{ t('tableControlsButton.shown') }}
				</h4>
				<div v-for="column in visibleColumns" :key="column.key" :class="$style.columnWrapper">
					<div v-if="dragOverItem === column.key" :class="$style.dropIndicator"></div>
					<fieldset
						:class="[
							$style.column,
							$style.draggable,
							{ [$style.dragging]: draggedItem === column.key },
						]"
						draggable="true"
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
							@click="() => emit('update:columnVisibility', column.key, false)"
						/>
					</fieldset>
				</div>
				<!-- Drop zone at the end -->
				<div
					:class="$style.endDropZone"
					@dragover="(event) => handleDragOver(event, 'END')"
					@dragleave="handleDragLeave"
					@drop="(event) => handleDrop(event, 'END')"
				>
					<div v-if="dragOverItem === 'END'" :class="$style.dropIndicator"></div>
				</div>
			</div>
			<div
				v-if="hiddenColumns.length"
				:style="{ display: 'flex', flexDirection: 'column', gap: 2 }"
			>
				<p :class="$style.header">
					{{ t('tableControlsButton.hidden') }}
				</p>
				<fieldset
					v-for="column in hiddenColumns"
					:key="column.key"
					:class="[$style.column, $style.hidden]"
				>
					<N8nIcon icon="grip-vertical" :class="[$style.grip, $style.hidden]" />
					<label>{{ column.label }}</label>
					<N8nIcon
						:class="$style.visibilityToggle"
						icon="eye-off"
						@click="() => emit('update:columnVisibility', column.key, true)"
					/>
				</fieldset>
			</div>
		</template>
	</N8nPopoverReka>
</template>

<style lang="scss" module>
.header {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	margin-bottom: var(--spacing-xs);
}

.grip {
	color: var(--color-text-light);
}

.column {
	display: flex;
	gap: 12px;
	color: var(--color-text-dark);
	padding: 6px 0;
	align-items: center;

	label {
		font-size: var(--font-size-xs);
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
	color: var(--color-text-lighter);

	label {
		color: var(--color-text-light);
	}
}

.visibilityToggle {
	cursor: pointer;
}
</style>
