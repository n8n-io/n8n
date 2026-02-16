<script setup lang="ts">
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import {
	DATA_TABLE_CARD_ACTIONS,
	DOWNLOAD_DATA_TABLE_MODAL_KEY,
} from '@/features/core/dataTable/constants';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import type { IUser, UserAction } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { N8nActionToggle } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import DownloadDataTableModal from './DownloadDataTableModal.vue';
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
const uiStore = useUIStore();

const i18n = useI18n();
const message = useMessage();
const toast = useToast();
const telemetry = useTelemetry();

const actions = computed<Array<UserAction<IUser>>>(() => {
	const availableActions = [
		{
			label: i18n.baseText('dataTable.download.csv'),
			value: DATA_TABLE_CARD_ACTIONS.DOWNLOAD_CSV,
			disabled: false,
		},
		{
			label: i18n.baseText('generic.delete'),
			value: DATA_TABLE_CARD_ACTIONS.DELETE,
			disabled: !dataTableStore.projectPermissions.dataTable.delete || props.isReadOnly,
		},
	];
	if (props.location === 'breadcrumbs') {
		availableActions.unshift({
			label: i18n.baseText('generic.rename'),
			value: DATA_TABLE_CARD_ACTIONS.RENAME,
			disabled: !dataTableStore.projectPermissions.dataTable.update || props.isReadOnly,
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
		case DATA_TABLE_CARD_ACTIONS.DOWNLOAD_CSV: {
			uiStore.openModal(DOWNLOAD_DATA_TABLE_MODAL_KEY);
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

const downloadDataTableCsv = async (includeSystemColumns: boolean) => {
	try {
		uiStore.closeModal(DOWNLOAD_DATA_TABLE_MODAL_KEY);

		await dataTableStore.downloadDataTableCsv(
			props.dataTable.id,
			props.dataTable.projectId,
			includeSystemColumns,
		);

		telemetry.track('User downloaded data table CSV', {
			data_table_id: props.dataTable.id,
			data_table_project_id: props.dataTable.projectId,
			include_system_columns: includeSystemColumns,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.download.error'));
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
	<div>
		<N8nActionToggle
			:actions="actions"
			theme="dark"
			data-test-id="data-table-card-actions"
			@action="onAction"
		/>
		<DownloadDataTableModal
			:modal-name="DOWNLOAD_DATA_TABLE_MODAL_KEY"
			:data-table-name="dataTable.name"
			@confirm="downloadDataTableCsv"
			@close="() => uiStore.closeModal(DOWNLOAD_DATA_TABLE_MODAL_KEY)"
		/>
	</div>
</template>
