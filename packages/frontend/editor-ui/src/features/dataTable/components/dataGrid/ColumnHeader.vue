<script setup lang="ts">
import type { IHeaderParams, SortDirection } from 'ag-grid-community';
import { useDataTableTypes } from '@/features/dataTable/composables/useDataTableTypes';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { isAGGridCellType } from '@/features/dataTable/typeGuards';
import { N8nActionDropdown, N8nIcon, N8nIconButton } from '@n8n/design-system';

export type HeaderParamsWithDelete = IHeaderParams & {
	onDelete?: (columnId: string) => void;
	allowMenuActions: boolean;
	showTypeIcon?: boolean;
};

const props = defineProps<{
	params: HeaderParamsWithDelete;
}>();

const { getIconForType, mapToDataTableColumnType } = useDataTableTypes();
const i18n = useI18n();

const isHovered = ref(false);
const isDropdownOpen = ref(false);
const isFilterOpen = ref(false);
const hasActiveFilter = ref(false);
const currentSort = ref<SortDirection>(null);
const shouldShowTypeIcon = computed(() => props.params.showTypeIcon !== false);
const isFilterable = computed(() => props.params.column.getColDef().filter !== false);

const enum ItemAction {
	Delete = 'delete',
}

const onItemClick = (action: string) => {
	const actionEnum = action as ItemAction;
	if (actionEnum === ItemAction.Delete) {
		props.params.onDelete?.(props.params.column.getColId());
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
	if (!isFilterable.value) {
		hasActiveFilter.value = false;
		return;
	}
	const columnId = props.params.column.getColId();
	const filterModel = props.params.api.getFilterModel();
	hasActiveFilter.value = filterModel && Boolean(filterModel[columnId]);
};

const checkSortStatus = () => {
	currentSort.value = props.params.column.getSort() ?? null;
};

const isMenuButtonVisible = computed(() => {
	return (
		props.params.allowMenuActions &&
		(isHovered.value || isDropdownOpen.value || isFilterOpen.value || hasActiveFilter.value)
	);
});

const isFilterButtonVisible = computed(() => {
	if (!isFilterable.value) return false;
	return isHovered.value || isDropdownOpen.value || isFilterOpen.value || hasActiveFilter.value;
});

const typeIcon = computed(() => {
	if (!shouldShowTypeIcon.value) {
		return null;
	}
	const cellDataType = props.params.column.getColDef().cellDataType;
	if (!isAGGridCellType(cellDataType)) {
		return null;
	}
	return getIconForType(mapToDataTableColumnType(cellDataType));
});

const columnActionItems = [
	{
		id: ItemAction.Delete,
		label: i18n.baseText('dataTable.deleteColumn.confirm.title'),
		icon: 'trash-2',
		customClass: 'data-table-column-header-action-item',
	} as const,
];

const isSortable = computed(() => {
	return props.params.column.getColDef().sortable;
});

const showSortIndicator = computed(() => {
	return isSortable.value && Boolean(currentSort.value);
});

const onHeaderClick = () => {
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
	e.stopPropagation();
	isFilterOpen.value = true;
	props.params.showFilter(e.currentTarget as HTMLElement);
};

const onFilterClosed = () => {
	isFilterOpen.value = false;
};

onMounted(() => {
	// Check initial states
	checkFilterStatus();
	checkSortStatus();

	props.params.api.addEventListener('filterChanged', checkFilterStatus);
	props.params.api.addEventListener('sortChanged', checkSortStatus);
	// TODO: this event is marked as internal. What can we use instead?
	// @ts-expect-error - filterClosed is not a public event
	props.params.api.addEventListener('filterClosed', onFilterClosed);
});

onUnmounted(() => {
	props.params.api.removeEventListener('filterChanged', checkFilterStatus);
	props.params.api.removeEventListener('sortChanged', checkSortStatus);
	// @ts-expect-error - filterClosed is not a public event
	props.params.api.removeEventListener('filterClosed', onFilterClosed);
});
</script>

<template>
	<div
		:class="['ag-header-cell-label', 'data-table-column-header-wrapper', { sortable: isSortable }]"
		data-test-id="data-table-column-header"
		@mouseenter="onMouseEnter"
		@mouseleave="onMouseLeave"
		@click="onHeaderClick"
	>
		<div class="data-table-column-header-icon-wrapper">
			<N8nIcon v-if="typeIcon" :icon="typeIcon" />
			<span class="ag-header-cell-text" data-test-id="data-table-column-header-text">{{
				props.params.displayName
			}}</span>

			<div v-if="showSortIndicator" class="sort-indicator">
				<N8nIcon v-if="currentSort === 'asc'" icon="arrow-up" class="sort-icon-active" />
				<N8nIcon v-else-if="currentSort === 'desc'" icon="arrow-down" class="sort-icon-active" />
			</div>
		</div>

		<N8nIconButton
			v-show="isFilterButtonVisible"
			data-test-id="data-table-column-header-filter-button"
			icon="funnel"
			type="tertiary"
			text
			:class="{ 'filter-highlighted': hasActiveFilter }"
			@click="onShowFilter"
		/>

		<N8nActionDropdown
			v-show="isMenuButtonVisible"
			data-test-id="data-table-column-header-actions"
			:items="columnActionItems"
			:placement="'bottom-start'"
			:activator-icon="'ellipsis'"
			@select="onItemClick"
			@visible-change="onDropdownVisibleChange"
			@click.stop
		/>
	</div>
</template>

<style lang="scss">
// TODO: neither scoped nor module works here. Is there a way to resolve this?
.data-table-column-header-wrapper {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	cursor: default;

	&.sortable {
		cursor: pointer;
	}
}

.data-table-column-header-action-item {
	justify-content: flex-start;
	gap: var(--spacing--xs);
}

.data-table-column-header-icon-wrapper {
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.data-table-column-header-icon-wrapper .n8n-icon {
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
		font-size: var(--font-size--2xs);
		line-height: 1;
		color: var(--color--text);
		font-weight: var(--font-weight--bold);
	}
}

.filter-highlighted {
	color: var(--color--primary);
	&:hover {
		color: var(--color--primary);
	}
}
</style>
