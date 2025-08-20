<script setup lang="ts">
import type { IHeaderParams } from 'ag-grid-community';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';
import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { isAGGridCellType } from '@/features/dataStore/typeGuards';

type HeaderParamsWithDelete = IHeaderParams & {
	onDelete: (columnId: string) => void;
};

const props = defineProps<{
	params: HeaderParamsWithDelete;
}>();

const { getIconForType, mapToDataStoreColumnType } = useDataStoreTypes();
const i18n = useI18n();

const isHovered = ref(false);
const isDropdownOpen = ref(false);

const enum ItemAction {
	Delete = 'delete',
}

const onItemClick = (action: string) => {
	if (action === (ItemAction.Delete as string)) {
		props.params.onDelete(props.params.column.getColId());
	}
};

const onMouseEnter = () => {
	isHovered.value = true;
};

const onMouseLeave = () => {
	isHovered.value = false;
};

const onDropdownVisibleChange = (visible: boolean) => {
	isDropdownOpen.value = visible;
};

const isDropdownVisible = computed(() => {
	return isHovered.value || isDropdownOpen.value;
});

const typeIcon = computed(() => {
	const cellDataType = props.params.column.getColDef().cellDataType;
	if (!isAGGridCellType(cellDataType)) {
		return null;
	}
	return getIconForType(mapToDataStoreColumnType(cellDataType));
});

const columnActionItems = [
	{
		id: ItemAction.Delete,
		label: i18n.baseText('dataStore.deleteColumn.confirm.title'),
		icon: 'trash-2',
		customClass: 'data-store-column-header-action-item',
	} as const,
];
</script>
<template>
	<div
		class="ag-header-cell-label data-store-column-header-wrapper"
		data-test-id="data-store-column-header"
		@mouseenter="onMouseEnter"
		@mouseleave="onMouseLeave"
	>
		<div class="data-store-column-header-icon-wrapper">
			<N8nIcon v-if="typeIcon" :icon="typeIcon" />
			<span class="ag-header-cell-text" data-test-id="data-store-column-header-text">{{
				props.params.displayName
			}}</span>
		</div>
		<N8nActionDropdown
			v-show="isDropdownVisible"
			data-test-id="data-store-column-header-actions"
			:items="columnActionItems"
			:placement="'bottom-start'"
			:activator-icon="'ellipsis'"
			@select="onItemClick"
			@visible-change="onDropdownVisibleChange"
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
	@include mixins.utils-ellipsis;
	min-width: 0;
	flex: 1;
}
</style>
