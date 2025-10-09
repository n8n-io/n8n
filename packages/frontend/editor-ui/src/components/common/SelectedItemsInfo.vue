<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nButton } from '@n8n/design-system';

interface Props {
	selectedCount: number;
}

const props = withDefaults(defineProps<Props>(), {});

const emit = defineEmits<{
	deleteSelected: [];
	clearSelection: [];
}>();

const i18n = useI18n();

const getSelectedText = () => {
	return i18n.baseText('generic.list.selected', {
		adjustToNumber: props.selectedCount,
		interpolate: { count: `${props.selectedCount}` },
	});
};

const getClearSelectionText = () => {
	return i18n.baseText('generic.list.clearSelection');
};

const handleDeleteSelected = () => {
	emit('deleteSelected');
};

const handleClearSelection = () => {
	emit('clearSelection');
};
</script>

<template>
	<div
		v-if="selectedCount > 0"
		:class="$style.selectionOptions"
		:data-test-id="`selected-items-info`"
	>
		<span>
			{{ getSelectedText() }}
		</span>
		<N8nButton
			type="tertiary"
			data-test-id="delete-selected-button"
			:label="i18n.baseText('generic.delete')"
			:class="$style.button"
			@click="handleDeleteSelected"
		/>
		<N8nButton
			type="tertiary"
			data-test-id="clear-selection-button"
			:label="getClearSelectionText()"
			:class="$style.button"
			@click="handleClearSelection"
		/>
	</div>
</template>

<style module lang="scss">
.selectionOptions {
	display: flex;
	align-items: center;
	position: absolute;
	padding: var(--spacing-2xs);
	z-index: 2;
	left: 50%;
	transform: translateX(-50%);
	bottom: var(--spacing-3xl);
	background: var(--execution-selector-background);
	border-radius: var(--border-radius-base);
	color: var(--execution-selector-text);
	font-size: var(--font-size-2xs);
	gap: var(--spacing-2xs);
}

.button {
	display: flex;
	align-items: center;
}
</style>
