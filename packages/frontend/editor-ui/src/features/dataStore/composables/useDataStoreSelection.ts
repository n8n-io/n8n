import { computed, ref, type Ref } from 'vue';
import type { GridApi, RowSelectionOptions } from 'ag-grid-community';
import { ADD_ROW_ROW_ID } from '@/features/dataStore/constants';

export const useDataStoreSelection = ({
	gridApi,
}: {
	gridApi: Ref<GridApi>;
}) => {
	const selectedRowIds = ref<Set<number>>(new Set());
	const selectedCount = computed(() => selectedRowIds.value.size);

	const rowSelection: RowSelectionOptions | 'single' | 'multiple' = {
		mode: 'multiRow',
		enableClickSelection: false,
		checkboxes: (params) => params.data?.id !== ADD_ROW_ROW_ID,
		isRowSelectable: (params) => params.data?.id !== ADD_ROW_ROW_ID,
	};

	const onSelectionChanged = () => {
		const selectedNodes = gridApi.value.getSelectedNodes();
		const newSelectedIds = new Set<number>();

		selectedNodes.forEach((node) => {
			if (typeof node.data?.id === 'number') {
				newSelectedIds.add(node.data.id);
			}
		});

		selectedRowIds.value = newSelectedIds;
	};

	const handleClearSelection = () => {
		selectedRowIds.value = new Set();
		gridApi.value.deselectAll();
	};

	return {
		selectedRowIds,
		selectedCount,
		rowSelection,
		onSelectionChanged,
		handleClearSelection,
	};
};
