<script setup lang="ts">
import type { IHeaderParams, SortDirection } from 'ag-grid-community';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { isAGGridCellType } from '@/features/dataStore/typeGuards';
import { N8nActionDropdown } from '@n8n/design-system';

type HeaderParamsWithDelete = IHeaderParams & {
	onDelete: (columnId: string) => void;
	allowMenuActions: boolean;
};

const props = defineProps<{
	params: HeaderParamsWithDelete;
}>();

const { getIconForType, mapToDataStoreColumnType } = useDataStoreTypes();
const i18n = useI18n();

const isHovered = ref(false);
const isDropdownOpen = ref(false);
const dropdownRef = ref<InstanceType<typeof N8nActionDropdown>>();
const isFilterOpen = ref(false);
const hasActiveFilter = ref(false);

const enum ItemAction {
	Delete = 'delete',
}

const onItemClick = (action: ItemAction) => {
	if (action === ItemAction.Delete) {
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

const checkFilterStatus = () => {
	const gridApi = props.params.api;
	const columnId = props.params.column.getColId();
	const filterModel = gridApi.getFilterModel();
	hasActiveFilter.value = filterModel && Boolean(filterModel[columnId]);
};

const isDropdownVisible = computed(() => {
	return (
		props.params.allowMenuActions &&
		(isHovered.value || isDropdownOpen.value || isFilterOpen.value || hasActiveFilter.value)
	);
});

const isFilterVisible = computed(() => {
	return (
		props.params.column.getColDef().filter &&
		(isHovered.value || isFilterOpen.value || isDropdownOpen.value || hasActiveFilter.value)
	);
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

const currentSort = computed(() => {
	return props.params.column.getSort();
});

const isSortable = computed(() => {
	return props.params.column.getColDef().sortable;
});

const showSortIndicator = computed(() => {
	return isSortable.value && Boolean(currentSort.value);
});

const onHeaderClick = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	if (dropdownRef.value?.$el?.contains(target)) {
		return;
	}

	if (isSortable.value) {
		const currentSortDirection = currentSort.value;
		let nextSort: SortDirection = null;

		if (!currentSortDirection) {
			nextSort = 'asc';
		} else if (currentSortDirection === 'asc') {
			nextSort = 'desc';
		}

		props.params.setSort(nextSort, false);
	}
};
const onShowFilter = (e: MouseEvent) => {
	isFilterOpen.value = true;
	props.params.showFilter(e.target as HTMLElement);
};

const onFilterClosed = () => {
	isFilterOpen.value = false;
};

onMounted(() => {
	props.params.api.addEventListener('filterChanged', checkFilterStatus);
	// TODO: this event is marked as internal. What can we use instead?
	props.params.api.addEventListener('filterClosed', onFilterClosed);
});

onUnmounted(() => {
	props.params.api.removeEventListener('filterChanged', checkFilterStatus);
	props.params.api.removeEventListener('filterClosed', onFilterClosed);
});
</script>

<template>
	<div
		:class="['ag-header-cell-label', 'data-store-column-header-wrapper', { sortable: isSortable }]"
		data-test-id="data-store-column-header"
		@mouseenter="onMouseEnter"
		@mouseleave="onMouseLeave"
	>
		<div class="data-store-column-header-icon-wrapper">
			<N8nIcon v-if="typeIcon" :icon="typeIcon" />
			<span class="ag-header-cell-text" data-test-id="data-store-column-header-text">{{
				props.params.displayName
			}}</span>

			<div v-if="showSortIndicator" class="sort-indicator">
				<N8nIcon v-if="currentSort === 'asc'" icon="arrow-up" class="sort-icon-active" />
				<N8nIcon v-else-if="currentSort === 'desc'" icon="arrow-down" class="sort-icon-active" />
			</div>
		</div>

		<N8nIconButton
			v-show="isFilterVisible"
			icon="filter"
			type="tertiary"
			text
			:class="{ 'filter-highlighted': hasActiveFilter }"
			@click="onShowFilter"
		/>

		<N8nActionDropdown
			v-show="isDropdownVisible"
			ref="dropdownRef"
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
	width: 100%;
	cursor: default;

	&.sortable {
		cursor: pointer;
	}
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
}

.sort-indicator {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex-shrink: 0;

	.sort-icon-active {
		font-size: var(--font-size-2xs);
		line-height: 1;
		color: var(--color-text-base);
		font-weight: var(--font-weight-bold);
	}
}

.filter-highlighted {
	color: var(--color-primary);
	&:hover {
		color: var(--color-primary);
	}
}
</style>
