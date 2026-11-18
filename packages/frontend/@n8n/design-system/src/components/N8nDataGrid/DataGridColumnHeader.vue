<script setup lang="ts">
import type { IHeaderParams, SortDirection } from 'ag-grid-community';
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nActionDropdown from '../N8nActionDropdown';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nInlineTextEdit from '../N8nInlineTextEdit';
import type { DataGridColumnHeaderOptions } from './DataGrid.types';

const props = defineProps<{
	params: IHeaderParams & DataGridColumnHeaderOptions;
}>();

const CHAR_WIDTH_PX = 7;
const PADDING_PX = 16;
const MIN_LABEL_WIDTH_PX = 50;
const MAX_LABEL_WIDTH_PX = 250;

const { t } = useI18n();

const renameInput = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('renameInput');
const actionDropdown = useTemplateRef<{ close: () => void }>('actionDropdown');

const isHovered = ref(false);
const isDropdownOpen = ref(false);
const isFilterOpen = ref(false);
const hasActiveFilter = ref(false);
const currentSort = ref<SortDirection>(null);

const column = computed(() => props.params.dataGridColumn);
const HeaderLabel = () => props.params.renderLabel?.();
const columnId = computed(() => props.params.column.getColId());
const isColumnsEditable = computed(() => props.params.isColumnsEditable());
const isSortable = computed(() => props.params.column.getColDef().sortable === true);
const isFilterable = computed(() => props.params.column.getColDef().filter !== false);
const isRenameable = computed(() => column.value.renameable === true);
const actions = computed(() => column.value.actions ?? []);

const isActive = computed(
	() => isHovered.value || isDropdownOpen.value || isFilterOpen.value || hasActiveFilter.value,
);
const isFilterButtonVisible = computed(() => isFilterable.value && isActive.value);
const isMenuButtonVisible = computed(
	() => isColumnsEditable.value && actions.value.length > 0 && isActive.value,
);

const labelWidth = computed(() => {
	const width = props.params.displayName.length * CHAR_WIDTH_PX + PADDING_PX;
	return Math.min(Math.max(width, MIN_LABEL_WIDTH_PX), MAX_LABEL_WIDTH_PX);
});

watch(isColumnsEditable, (editable) => {
	if (!editable) {
		actionDropdown.value?.close();
		renameInput.value?.forceCancel();
	}
});

const onRename = (label: string) => {
	const trimmed = label.trim();
	if (!isColumnsEditable.value || !trimmed || trimmed === props.params.displayName) {
		renameInput.value?.forceCancel();
		return;
	}
	props.params.onRename(columnId.value, trimmed);
};

const onLabelClick = (event: Event) => {
	event.stopPropagation();
	if (isColumnsEditable.value) {
		renameInput.value?.forceFocus();
	}
};

const NEXT_SORT: Record<'asc' | 'desc' | 'none', SortDirection> = {
	none: 'asc',
	asc: 'desc',
	desc: null,
};

const onHeaderClick = () => {
	if (isSortable.value) {
		props.params.onSort(columnId.value, NEXT_SORT[currentSort.value ?? 'none']);
	}
};

const onShowFilter = (event: MouseEvent) => {
	event.stopPropagation();
	if (event.currentTarget instanceof HTMLElement) {
		isFilterOpen.value = true;
		props.params.showFilter(event.currentTarget);
	}
};

const checkFilterStatus = () => {
	hasActiveFilter.value =
		isFilterable.value && Boolean(props.params.api.getFilterModel()?.[columnId.value]);
};

const checkSortStatus = () => {
	currentSort.value = props.params.column.getSort() ?? null;
};

const onFilterClosed = () => {
	isFilterOpen.value = false;
};

onMounted(() => {
	checkFilterStatus();
	checkSortStatus();
	props.params.api.addEventListener('filterChanged', checkFilterStatus);
	props.params.api.addEventListener('sortChanged', checkSortStatus);
	// @ts-expect-error filterClosed is not a public AG Grid event
	props.params.api.addEventListener('filterClosed', onFilterClosed);
});

onUnmounted(() => {
	props.params.api.removeEventListener('filterChanged', checkFilterStatus);
	props.params.api.removeEventListener('sortChanged', checkSortStatus);
	// @ts-expect-error filterClosed is not a public AG Grid event
	props.params.api.removeEventListener('filterClosed', onFilterClosed);
});
</script>

<template>
	<div
		:class="['n8n-data-grid-header', { 'n8n-data-grid-header--sortable': isSortable }]"
		data-test-id="data-grid-column-header"
		@mouseenter="isHovered = true"
		@mouseleave="isHovered = false"
		@click="onHeaderClick"
	>
		<div class="n8n-data-grid-header-label">
			<N8nIcon v-if="column.icon" :icon="column.icon" class="n8n-data-grid-header-icon" />
			<div v-if="params.renderLabel" class="n8n-data-grid-header-custom">
				<HeaderLabel />
			</div>
			<N8nInlineTextEdit
				v-else-if="isRenameable"
				ref="renameInput"
				:model-value="params.displayName"
				:max-width="labelWidth"
				:read-only="!isColumnsEditable"
				:disabled="!isColumnsEditable"
				class="n8n-data-grid-header-text"
				data-test-id="data-grid-column-header-text"
				@update:model-value="onRename"
				@click="onLabelClick"
				@keydown.stop
			/>
			<span v-else class="n8n-data-grid-header-text" data-test-id="data-grid-column-header-text">
				{{ params.displayName }}
			</span>
			<N8nIcon
				v-if="isSortable && currentSort"
				:icon="currentSort === 'asc' ? 'arrow-up' : 'arrow-down'"
				class="n8n-data-grid-header-sort"
				data-test-id="data-grid-column-header-sort"
			/>
		</div>

		<N8nIconButton
			v-show="isFilterButtonVisible"
			variant="ghost"
			icon="funnel"
			:aria-label="t('dataGrid.filterColumn')"
			:class="{ 'n8n-data-grid-header-filter--active': hasActiveFilter }"
			data-test-id="data-grid-column-header-filter-button"
			@click="onShowFilter"
		/>

		<N8nActionDropdown
			v-show="isMenuButtonVisible"
			ref="actionDropdown"
			:items="actions"
			placement="bottom-start"
			activator-icon="ellipsis"
			data-test-id="data-grid-column-header-actions"
			@select="(actionId: string) => params.onAction(columnId, actionId)"
			@visible-change="(visible: boolean) => (isDropdownOpen = visible)"
			@click.stop
		/>
	</div>
</template>
