<script setup lang="ts">
import type { IHeaderParams } from 'ag-grid-community';
import {
	mapToDataStoreColumnType,
	useDataStoreTypes,
} from '@/features/dataStore/composables/useDataStoreTypes';
import type { AGGridCellType } from '@/features/dataStore/datastore.types';

type HeaderParamsWithDelete = IHeaderParams & {
	onDelete: (columnId: string) => void;
};

const props = defineProps<{
	params: HeaderParamsWithDelete;
}>();

const { getIconForType } = useDataStoreTypes();

const enum ItemAction {
	Delete = 'delete',
}

const onItemClick = (action: string) => {
	if (action === ItemAction.Delete) {
		props.params.onDelete(props.params.column.getColId());
	}
};
</script>
<template>
	<div class="ag-header-cell-label data-store-column-header-wrapper">
		<div class="data-store-column-header-icon-wrapper">
			<N8nIcon
				:icon="
					getIconForType(
						mapToDataStoreColumnType(
							props.params.column.getColDef().cellDataType as AGGridCellType,
						),
					)
				"
			/>
			<span class="ag-header-cell-text">{{ props.params.displayName }}</span>
		</div>
		<N8nActionDropdown
			:items="[
				{
					id: ItemAction.Delete,
					label: 'Delete column',
					icon: 'trash-2',
					customClass: 'data-store-column-header-action-item',
				},
			]"
			:placement="'bottom-start'"
			:activator-icon="'ellipsis'"
			@select="onItemClick"
		/>
	</div>
</template>

<style lang="scss">
// TODO: neither scoped nor module works here. Is there a way to resolve this?
.data-store-column-header-wrapper {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.data-store-column-header-action-item {
	justify-content: flex-start;
	gap: var(--spacing-xs);
}

.data-store-column-header-icon-wrapper {
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	min-width: 0;
}

.data-store-column-header-icon-wrapper .n8n-icon {
	flex-shrink: 0;
}

.ag-header-cell-text {
	// TODO: use the mixin from the design system
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	min-width: 0;
	flex: 1;
}
</style>
