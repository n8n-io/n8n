<script setup lang="ts">
import type { DataTable } from '@/features/dataTable/dataTable.types';
import type { IUser, UserAction } from '@n8n/design-system';
import { DATA_TABLE_CARD_ACTIONS } from '@/features/dataTable/constants';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';
import { useToast } from '@/composables/useToast';
import { useTelemetry } from '@/composables/useTelemetry';

import { N8nActionToggle } from '@n8n/design-system';
type Props = {
	dataTable: DataTable;
	isReadOnly?: boolean;
	location: 'card' | 'breadcrumbs';
};

const props = withDefaults(defineProps<Props>(), {
	isReadOnly: false,
});

const emit = defineEmits<{
	rename: [
		value: {
			dataTable: DataTable;
			action: string;
		},
	];
	onDeleted: [];
}>();

const dataTableStore = useDataTableStore();

const i18n = useI18n();
const message = useMessage();
const toast = useToast();
const telemetry = useTelemetry();

const actions = computed<Array<UserAction<IUser>>>(() => {
	const availableActions = [
		{
			label: i18n.baseText('generic.delete'),
			value: DATA_TABLE_CARD_ACTIONS.DELETE,
			disabled: props.isReadOnly,
		},
	];
	if (props.location === 'breadcrumbs') {
		availableActions.unshift({
			label: i18n.baseText('generic.rename'),
			value: DATA_TABLE_CARD_ACTIONS.RENAME,
			disabled: props.isReadOnly,
		});
	}
	return availableActions;
});

const onAction = async (action: string) => {
	switch (action) {
		case DATA_TABLE_CARD_ACTIONS.RENAME: {
			// This is handled outside of this component
			// where editable label component is used
			emit('rename', {
				dataTable: props.dataTable,
				action: 'rename',
			});
			break;
		}
		case DATA_TABLE_CARD_ACTIONS.DELETE: {
			const promptResponse = await message.confirm(
				i18n.baseText('dataTable.delete.confirm.message', {
					interpolate: { name: props.dataTable.name },
				}),
				i18n.baseText('dataTable.delete.confirm.title'),
				{
					confirmButtonText: i18n.baseText('generic.delete'),
					cancelButtonText: i18n.baseText('generic.cancel'),
				},
			);
			if (promptResponse === MODAL_CONFIRM) {
				await deleteDataTable();
			}
			break;
		}
	}
};

const deleteDataTable = async () => {
	try {
		const deleted = await dataTableStore.deleteDataTable(
			props.dataTable.id,
			props.dataTable.projectId,
		);
		if (!deleted) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		emit('onDeleted');
		telemetry.track('User deleted data table', {
			data_table_id: props.dataTable.id,
			data_table_project_id: props.dataTable.projectId,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.delete.error'));
	}
};
</script>
<template>
	<N8nActionToggle
		:actions="actions"
		theme="dark"
		data-test-id="data-table-card-actions"
		@action="onAction"
	/>
</template>
