<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';

export interface SelectedItemsInfoProps {
	/** Number of selected items. The component renders nothing when it is 0 */
	selectedCount: number;
}

defineOptions({ name: 'N8nSelectedItemsInfo' });
const props = defineProps<SelectedItemsInfoProps>();

const emit = defineEmits<{
	deleteSelected: [];
	clearSelection: [];
}>();

const { t } = useI18n();

const getSelectedText = () => {
	const key =
		props.selectedCount === 1 ? 'selectedItemsInfo.selectedOne' : 'selectedItemsInfo.selectedMany';

	return t(key, { count: `${props.selectedCount}` });
};

const handleDeleteSelected = () => {
	emit('deleteSelected');
};

const handleClearSelection = () => {
	emit('clearSelection');
};
</script>

<template>
	<div v-if="selectedCount > 0" :class="$style.selectionOptions" data-test-id="selected-items-info">
		<span>
			{{ getSelectedText() }}
		</span>
		<!-- Custom bulk actions; defaults to the delete button for existing consumers -->
		<slot name="actions">
			<N8nButton
				variant="subtle"
				data-test-id="delete-selected-button"
				:label="t('generic.delete')"
				:class="$style.button"
				@click="handleDeleteSelected"
			/>
		</slot>
		<N8nButton
			variant="subtle"
			data-test-id="clear-selection-button"
			:label="t('selectedItemsInfo.clearSelection')"
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
	padding: var(--spacing--2xs);
	z-index: 2;
	left: 50%;
	transform: translateX(-50%);
	bottom: var(--spacing--3xl);
	background: var(--execution-selector--color--background);
	border-radius: var(--radius);
	color: var(--execution-selector--color--text);
	font-size: var(--font-size--2xs);
	gap: var(--spacing--2xs);
}

.button {
	display: flex;
	align-items: center;
}
</style>
