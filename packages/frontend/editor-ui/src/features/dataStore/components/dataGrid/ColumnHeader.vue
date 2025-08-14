<script setup lang="ts">
import type { IHeaderParams } from 'ag-grid-community';

type HeaderParamsWithDelete = IHeaderParams & {
	onDelete: (columnId: string) => void;
};

const props = defineProps<{
	params: HeaderParamsWithDelete;
}>();

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
		<span class="ag-header-cell-text">{{ props.params.displayName }}</span>
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
	justify-content: space-between !important;
}

.data-store-column-header-action-item {
	justify-content: flex-start;
	gap: var(--spacing-xs);
}
</style>
