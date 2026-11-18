<script setup lang="ts">
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import type { INodeUi, IRunDataDisplayMode } from '@/Interface';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { getMappedExpression } from '@/app/utils/mappingUtils';
import { getPairedItemId } from '@/app/utils/pairedItemUtils';
import { shorten } from '@/app/utils/typesUtils';
import type { INodeExecutionData } from 'n8n-workflow';
import { computed, ref, useTemplateRef, watch } from 'vue';
import isEqual from 'lodash/isEqual';
import Draggable from '@/app/components/Draggable.vue';
import MappingPill from './MappingPill.vue';
import TextWithHighlights from './TextWithHighlights.vue';
import BinaryEntryDataTable from './BinaryEntryDataTable.vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useExecutionHelpers } from '@/features/execution/executions/composables/useExecutionHelpers';
import { I18nT } from 'vue-i18n';
import { useTelemetryContext } from '@/app/composables/useTelemetryContext';
import type { TableItem } from '../tableItems';

import {
	N8nDataGrid,
	N8nIcon,
	N8nIconButton,
	N8nInfoTip,
	N8nTooltip,
	N8nTree,
	type DataGridCellHover,
	type DataGridColumn,
	type DataGridColumnType,
	type DataGridFilter,
	type DataGridRow,
	type DataGridSort,
} from '@n8n/design-system';

const MAX_COLUMNS_LIMIT = 40;
const EXECUTION_LINK_COLUMN = '__n8n_execution_link__';
const EMPTY_ITEM_COLUMN = '__n8n_empty_item__';
const HOVERING_ROW_CLASS = 'hovering-item';
const COLLAPSED_CELL_CLASS = 'n8n-run-data-collapsed-cell';
const JSON_COLUMN_WIDTH = 300;
const VALUE_COLUMN_WIDTH = 200;
const EXECUTION_LINK_COLUMN_WIDTH = 48;

type Props = {
	node: INodeUi;
	items: TableItem[];
	columnTypes: Record<string, DataGridColumnType>;
	sort: DataGridSort;
	filters: DataGridFilter[];
	distanceFromActive: number;
	runIndex?: number;
	outputIndex?: number;
	totalRuns?: number;
	mappingEnabled?: boolean;
	hasDefaultHoverState?: boolean;
	search?: string;
	headerBgColor?: 'base' | 'light';
	compact?: boolean;
	disableHoverHighlight?: boolean;
	collapsingColumnName: string | null;
};

type RowInfo = { index: number; metadata: INodeExecutionData['metadata'] | undefined };

const props = withDefaults(defineProps<Props>(), {
	runIndex: 0,
	outputIndex: 0,
	totalRuns: 0,
	mappingEnabled: false,
	hasDefaultHoverState: false,
	search: '',
	headerBgColor: 'base',
	disableHoverHighlight: false,
	compact: false,
});

const emit = defineEmits<{
	activeRowChanged: [row: number | null];
	displayModeChange: [mode: IRunDataDisplayMode];
	mounted: [data: { avgRowHeight: number }];
	collapsingColumnChanged: [columnName: string | null];
	'update:sort': [sort: DataGridSort];
	'update:filters': [filters: DataGridFilter[]];
}>();

const externalHooks = useExternalHooks();
const wrapperRef = useTemplateRef<HTMLElement>('wrapper');

const forceShowGrip = ref(false);
const draggingPath = ref<string | null>(null);
const hoveringPath = ref<string | null>(null);
const hoveredColumnId = ref<string | null>(null);
const activeRowKey = ref<string | null>(null);

const ndvStore = injectNDVStore();
const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const i18n = useI18n();
const telemetry = useTelemetry();
const telemetryContext = useTelemetryContext();
const { trackOpeningRelatedExecution, resolveRelatedExecutionUrl } = useExecutionHelpers();

const hoveringItem = computed(() => ndvStore.value.hoveringItem);
const focusedMappableInput = computed(() => ndvStore.value.focusedMappableInput);
const highlight = computed(() => ndvStore.value.highlightDraggables);
const canDraggableDrop = computed(() => ndvStore.value.canDraggableDrop);
const draggableStickyPosition = computed(() => ndvStore.value.draggableStickyPos);
const pairedItemMappings = computed(
	() => workflowExecutionStateStore.value.activeExecutionPairedItemMappings,
);

const rowInfo = new WeakMap<DataGridRow, RowInfo>();

const isNonEmptyObject = (value: unknown) =>
	typeof value === 'object' && value !== null && Object.keys(value).length > 0;

const tableData = computed(() => {
	const columns: string[] = [];
	const hasJson: Record<string, boolean> = {};
	let isColumnLimitExceeded = false;

	const rows = props.items.map(({ item, index }) => {
		const json = item.json ?? {};
		const keys = Object.keys(json);
		isColumnLimitExceeded ||= keys.length > MAX_COLUMNS_LIMIT;
		for (const key of keys.slice(0, MAX_COLUMNS_LIMIT)) {
			if (!columns.includes(key)) columns.push(key);
			hasJson[key] ||= isNonEmptyObject(json[key]);
		}
		const row: DataGridRow = { ...json };
		rowInfo.set(row, {
			index,
			metadata: item.metadata?.subExecution ? item.metadata : undefined,
		});
		return row;
	});

	return {
		rows,
		columns,
		hasJson,
		isColumnLimitExceeded,
		hasExecutionIds: rows.some((row) => rowInfo.get(row)?.metadata !== undefined),
	};
});

const getRowKey = (row: DataGridRow) => String(rowInfo.get(row)?.index ?? -1);
const getItemIndex = (row: DataGridRow) => rowInfo.get(row)?.index ?? -1;
const getMetadata = (row: DataGridRow) => rowInfo.get(row)?.metadata;

function getSubExecutionUrl(row: DataGridRow) {
	const metadata = getMetadata(row);
	return metadata ? resolveRelatedExecutionUrl(metadata) : undefined;
}

function openSubExecution(row: DataGridRow) {
	const metadata = getMetadata(row);
	if (metadata) trackOpeningRelatedExecution(metadata, 'table');
}

const isTreeValue = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const getTreeValue = (row: DataGridRow, field: string) =>
	isTreeValue(row[field]) ? row[field] : undefined;

const toDataColumn = (name: string): DataGridColumn => {
	const isCollapsed = props.collapsingColumnName !== null && props.collapsingColumnName !== name;
	return {
		id: name,
		field: name,
		label: name,
		type: props.columnTypes[name] ?? 'string',
		width: tableData.value.hasJson[name] ? JSON_COLUMN_WIDTH : VALUE_COLUMN_WIDTH,
		headerSlot: true,
		cellSlot: true,
		autoHeight: !isCollapsed,
		cellClass: isCollapsed ? COLLAPSED_CELL_CLASS : undefined,
	};
};

const slotOnlyColumn = (id: string, width?: number): DataGridColumn => ({
	id,
	field: id,
	label: '',
	type: 'string',
	width,
	flex: width ? undefined : 1,
	resizable: false,
	sortable: false,
	filterable: false,
	cellSlot: true,
	autoHeight: true,
});

const columnNames = computed(() => {
	const { rows, columns: pageColumns } = tableData.value;
	const runColumns = rows.length === 0 ? Object.keys(props.columnTypes) : [];
	const stateColumns = props.filters.map(({ field }) => field);
	if (props.sort) stateColumns.push(props.sort.field);
	return [...new Set([...pageColumns, ...runColumns, ...stateColumns])].slice(0, MAX_COLUMNS_LIMIT);
});

const columns = computed<DataGridColumn[]>((previous) => {
	const hasItemsWithoutFields = tableData.value.rows.length > 0 && columnNames.value.length === 0;
	const next = [
		...(tableData.value.hasExecutionIds
			? [slotOnlyColumn(EXECUTION_LINK_COLUMN, EXECUTION_LINK_COLUMN_WIDTH)]
			: []),
		...(hasItemsWithoutFields
			? [slotOnlyColumn(EMPTY_ITEM_COLUMN)]
			: columnNames.value.map(toDataColumn)),
	];
	return previous && isEqual(previous, next) ? previous : next;
});

const firstRowKey = computed(() => {
	const [firstRow] = tableData.value.rows;
	return firstRow ? getRowKey(firstRow) : null;
});

function isHoveringRow(row: DataGridRow): boolean {
	if (props.disableHoverHighlight) return false;
	const rowKey = getRowKey(row);
	if (rowKey === activeRowKey.value) return true;

	const itemIndex = getItemIndex(row);
	if (
		itemIndex === 0 &&
		!hoveringItem.value &&
		props.hasDefaultHoverState &&
		props.distanceFromActive === 1
	) {
		return true;
	}
	const itemNodeId = getPairedItemId(
		props.node?.name ?? '',
		props.runIndex || 0,
		props.outputIndex || 0,
		itemIndex,
	);
	if (!hoveringItem.value || !pairedItemMappings.value[itemNodeId]) return false;

	const hoveringItemId = getPairedItemId(
		hoveringItem.value.nodeName,
		hoveringItem.value.runIndex,
		hoveringItem.value.outputIndex,
		hoveringItem.value.itemIndex,
	);
	return pairedItemMappings.value[itemNodeId].has(hoveringItemId);
}

const rowClassRules = { [HOVERING_ROW_CLASS]: isHoveringRow };

function showExecutionLink(row: DataGridRow) {
	const rowKey = getRowKey(row);
	return activeRowKey.value === null ? rowKey === firstRowKey.value : rowKey === activeRowKey.value;
}

function onCellHover(hover: DataGridCellHover | null) {
	hoveredColumnId.value = hover?.columnId ?? null;
	activeRowKey.value = hover?.rowKey ?? null;
	emit('activeRowChanged', hover ? Number(hover.rowKey) : null);
}

function isActiveHeader(columnName: string) {
	return props.mappingEnabled && (hoveredColumnId.value === columnName || forceShowGrip.value);
}

function onMouseEnterKey(path: Array<string | number>, columnName: string) {
	hoveringPath.value = getCellExpression(path, columnName);
}

function onMouseLeaveKey() {
	hoveringPath.value = null;
}

function isHovering(path: Array<string | number>, columnName: string) {
	return hoveringPath.value === getCellExpression(path, columnName);
}

function getExpression(column: string) {
	if (!props.node) return '';
	return getMappedExpression({
		nodeName: props.node.name,
		distanceFromActive: props.distanceFromActive,
		path: [column],
		binaryMode: workflowDocumentStore?.value?.settings?.binaryMode,
	});
}

function getPathNameFromTarget(el?: HTMLElement) {
	return el ? el.dataset.name : '';
}

function getCellPathName(path: Array<string | number>, columnName: string) {
	const lastKey = path[path.length - 1];
	if (typeof lastKey === 'string') return lastKey;
	if (path.length > 1) return `${path[path.length - 2]}[${lastKey}]`;
	return `${columnName}[${lastKey}]`;
}

function getCellExpression(path: Array<string | number>, columnName: string) {
	if (!props.node) return '';
	return getMappedExpression({
		nodeName: props.node.name,
		distanceFromActive: props.distanceFromActive,
		path: [columnName, ...path],
		binaryMode: workflowDocumentStore?.value?.settings?.binaryMode,
	});
}

function isEmpty(value: unknown): boolean {
	return (
		value === '' ||
		(Array.isArray(value) && value.length === 0) ||
		(typeof value === 'object' && value !== null && Object.keys(value).length === 0) ||
		value === null ||
		value === undefined
	);
}

function getValueToRender(value: unknown): string {
	if (value === '') return i18n.baseText('runData.emptyString');
	if (typeof value === 'string') return value;
	if (Array.isArray(value) && value.length === 0) return i18n.baseText('runData.emptyArray');
	if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
		return i18n.baseText('runData.emptyObject');
	}
	if (value === null || value === undefined) return `${value}`;
	if (value === true || value === false || typeof value === 'number') return value.toString();
	return JSON.stringify(value);
}

function onDragStart(el: HTMLElement, data?: string) {
	ndvStore.value.draggableStartDragging({
		type: 'mapping',
		data: data ?? '',
		dimensions: el?.getBoundingClientRect() ?? null,
	});
	ndvStore.value.resetMappingTelemetry();
}

function onCellDragStart(el: HTMLElement, data?: string) {
	if (el?.dataset.value) {
		draggingPath.value = el.dataset.value;
	}
	onDragStart(el, data);
}

function onCellDragEnd(el: HTMLElement) {
	draggingPath.value = null;
	onDragEnd(el.dataset.name ?? '', 'tree', el.dataset.depth ?? '0');
}

function isDraggingKey(path: Array<string | number>, columnName: string) {
	return !!draggingPath.value && draggingPath.value === getCellExpression(path, columnName);
}

function onDragEnd(column: string, src: string, depth = '0') {
	ndvStore.value.draggableStopDragging();
	setTimeout(() => {
		const mappingTelemetry = ndvStore.value.mappingTelemetry;
		const telemetryPayload = {
			src_node_type: props.node.type,
			src_field_name: column,
			src_nodes_back: props.distanceFromActive,
			src_run_index: props.runIndex,
			src_runs_total: props.totalRuns,
			src_field_nest_level: parseInt(depth, 10),
			src_view: 'table',
			src_element: src,
			success: false,
			view_shown: telemetryContext.view_shown,
			...mappingTelemetry,
		};

		void externalHooks.run('runDataTable.onDragEnd', telemetryPayload);

		telemetry.track('User dragged data for mapping', telemetryPayload);
	}, 1000); // ensure dest data gets set if drop
}

function isSimple(data: unknown): data is string | number | boolean | null | undefined {
	return (
		typeof data !== 'object' ||
		data === null ||
		(Array.isArray(data) && data.length === 0) ||
		Object.keys(data).length === 0
	);
}

function switchToJsonView() {
	emit('displayModeChange', 'json');
}

function toggleCollapsingColumn(columnName: string) {
	emit('collapsingColumnChanged', props.collapsingColumnName === columnName ? null : columnName);
}

function onFirstDataRendered() {
	const body = wrapperRef.value?.querySelector<HTMLElement>('.ag-center-cols-container');
	if (body && tableData.value.rows.length > 0) {
		emit('mounted', { avgRowHeight: body.offsetHeight / tableData.value.rows.length });
	}
}

watch(focusedMappableInput, (curr) => {
	setTimeout(
		() => {
			forceShowGrip.value = !!focusedMappableInput.value;
		},
		curr ? 300 : 150,
	);
});
</script>

<template>
	<div
		ref="wrapper"
		:class="[
			$style.dataDisplay,
			{
				[$style.highlight]: highlight,
				[$style.lightHeader]: headerBgColor === 'light',
				[$style.compact]: props.compact,
			},
		]"
	>
		<Draggable
			type="mapping"
			target-data-key="mappable"
			:disabled="!mappingEnabled"
			@dragstart="onCellDragStart"
			@dragend="onCellDragEnd"
		>
			<template #preview="{ canDrop, el }">
				<MappingPill :html="shorten(getPathNameFromTarget(el) || '', 16, 2)" :can-drop="canDrop" />
			</template>
			<N8nDataGrid
				:rows="tableData.rows"
				:columns="columns"
				:row-key="getRowKey"
				:row-class-rules="rowClassRules"
				pagination-mode="none"
				sticky-header
				sort-mode="server"
				:sort="sort"
				filter-mode="server"
				:filters="filters"
				@update:sort="emit('update:sort', $event)"
				@update:filters="emit('update:filters', $event)"
				@cell-hover="onCellHover"
				@first-data-rendered="onFirstDataRendered"
			>
				<template #header="{ column }">
					<N8nTooltip placement="bottom-start" :disabled="!mappingEnabled" :show-after="1000">
						<template #content>
							<div>
								<img src="/static/data-mapping-gif.gif" />
								{{ i18n.baseText('dataMapping.dragColumnToFieldHint') }}
							</div>
						</template>
						<Draggable
							type="mapping"
							:data="getExpression(column.field)"
							:disabled="!mappingEnabled"
							:can-drop="canDraggableDrop"
							:sticky-position="draggableStickyPosition"
							@dragstart="onDragStart"
							@dragend="(el) => onDragEnd(el?.textContent ?? '', 'column')"
						>
							<template #preview="{ canDrop }">
								<MappingPill :html="shorten(column.field, 16, 2)" :can-drop="canDrop" />
							</template>
							<template #default="{ isDragging }">
								<div
									:class="{
										[$style.header]: true,
										[$style.draggableHeader]: mappingEnabled,
										[$style.activeHeader]: isActiveHeader(column.field),
										[$style.draggingHeader]: isDragging,
										[$style.isCollapsingColumn]: collapsingColumnName === column.field,
									}"
									data-test-id="run-data-table-header"
								>
									<TextWithHighlights :content="getValueToRender(column.field)" :search="search" />
									<N8nTooltip
										:content="i18n.baseText('dataMapping.tableView.columnCollapsing.tooltip')"
										:disabled="mappingEnabled || collapsingColumnName === column.field"
									>
										<N8nIconButton
											variant="ghost"
											:class="$style.collapseColumnButton"
											size="xsmall"
											:icon="
												collapsingColumnName === column.field
													? 'chevrons-up-down'
													: 'chevrons-down-up'
											"
											:aria-label="i18n.baseText('dataMapping.tableView.columnCollapsing')"
											@click.stop="toggleCollapsingColumn(column.field)"
										/>
									</N8nTooltip>
									<div v-if="mappingEnabled" :class="$style.dragButton">
										<N8nIcon icon="grip-vertical" />
									</div>
								</div>
							</template>
						</Draggable>
					</N8nTooltip>
				</template>

				<template #cell="{ row, column }">
					<template v-if="column.id === EXECUTION_LINK_COLUMN">
						<N8nTooltip
							v-if="getMetadata(row)"
							:content="
								i18n.baseText('runData.table.viewSubExecution', {
									interpolate: { id: `${getMetadata(row)?.subExecution?.executionId}` },
								})
							"
							placement="left"
							:hide-after="0"
						>
							<N8nIconButton
								v-show="showExecutionLink(row)"
								variant="outline"
								icon="external-link"
								data-test-id="debug-sub-execution"
								size="xsmall"
								target="_blank"
								:href="getSubExecutionUrl(row)"
								@click="openSubExecution(row)"
							/>
						</N8nTooltip>
					</template>
					<N8nInfoTip v-else-if="column.id === EMPTY_ITEM_COLUMN">
						{{ i18n.baseText('runData.emptyItemHint') }}
					</N8nInfoTip>
					<TextWithHighlights
						v-else-if="isSimple(row[column.field])"
						:content="getValueToRender(row[column.field])"
						:search="search"
						:class="{ [$style.value]: true, [$style.empty]: isEmpty(row[column.field]) }"
					/>
					<N8nTree v-else :node-class="$style.nodeClass" :value="getTreeValue(row, column.field)">
						<template #label="{ label, path }">
							<TextWithHighlights
								data-target="mappable"
								:class="{
									[$style.hoveringKey]: mappingEnabled && isHovering(path, column.field),
									[$style.draggingKey]: isDraggingKey(path, column.field),
									[$style.dataKey]: true,
									[$style.mappable]: mappingEnabled,
								}"
								:content="label || i18n.baseText('runData.unnamedField')"
								:search="search"
								:data-name="getCellPathName(path, column.field)"
								:data-value="getCellExpression(path, column.field)"
								:data-depth="path.length"
								@mouseenter="() => onMouseEnterKey(path, column.field)"
								@mouseleave="onMouseLeaveKey"
							/>
						</template>

						<template #binary="{ value }">
							<BinaryEntryDataTable :value="value" />
						</template>

						<template #value="{ value }">
							<TextWithHighlights
								:content="getValueToRender(value)"
								:search="search"
								:class="{ [$style.nestedValue]: true, [$style.empty]: isEmpty(value) }"
							/>
						</template>
					</N8nTree>
				</template>

				<template #header-append>
					<N8nTooltip v-if="tableData.isColumnLimitExceeded" placement="bottom-end">
						<template #content>
							<div>
								<I18nT
									tag="span"
									keypath="dataMapping.tableView.tableColumnsExceeded.tooltip"
									scope="global"
								>
									<template #columnLimit>{{ MAX_COLUMNS_LIMIT }}</template>
									<template #link>
										<a @click="switchToJsonView">{{
											i18n.baseText('dataMapping.tableView.tableColumnsExceeded.tooltip.link')
										}}</a>
									</template>
								</I18nT>
							</div>
						</template>
						<span>
							<N8nIcon :class="$style.warningTooltip" icon="triangle-alert" />
							{{ i18n.baseText('dataMapping.tableView.tableColumnsExceeded') }}
						</span>
					</N8nTooltip>
				</template>
			</N8nDataGrid>
		</Draggable>
	</div>
</template>

<style lang="scss" module>
.dataDisplay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 100%;
	padding-left: var(--spacing--xs);
	padding-right: var(--ndv--spacing);
	padding-bottom: var(--spacing--3xl);
	overflow-y: auto;
	line-height: 1.5;
	word-break: normal;

	&.compact {
		padding-left: var(--spacing--2xs);
		padding-right: var(--spacing--2xs);
	}

	&.lightHeader {
		--ag-header-background-color: var(--color--background--light-2);
	}

	:global(.ag-row.hovering-item) {
		background-color: var(--ag-row-hover-color);
	}

	:global(.ag-cell) {
		align-items: flex-start;
		white-space: pre-wrap;
		overflow-wrap: break-word;
	}

	:global(.n8n-run-data-collapsed-cell) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;

		:global(.n8n-tree) {
			height: 1.5em;
			overflow: hidden;
		}
	}
}

.nodeClass {
	margin-bottom: var(--spacing--5xs);
}

.header {
	display: flex;
	align-items: center;
	width: 100%;
	min-width: 0;

	> :first-child {
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		flex-grow: 1;
	}
}

.draggableHeader {
	&:hover {
		cursor: grab;

		.dragButton {
			opacity: 1;
		}
	}
}

.highlight .draggableHeader {
	color: var(--color--primary);
}

.draggingHeader {
	color: var(--color--primary);
	background-color: var(--color--primary--tint-2);
}

.activeHeader {
	.dragButton {
		opacity: 1;
	}
}

.dragButton {
	opacity: 0;

	& > svg {
		vertical-align: middle;
	}
}

.dataKey {
	color: var(--color--text--shade-1);
	line-height: 1.7;
	font-weight: var(--font-weight--medium);
	border-radius: var(--radius);
	padding: 0 var(--spacing--5xs) 0 var(--spacing--5xs);
	margin-right: var(--spacing--5xs);
}

.value {
	line-height: var(--line-height--md);
}

.nestedValue {
	composes: value;
	margin-left: var(--spacing--4xs);
}

.mappable {
	cursor: grab;
}

.empty {
	color: var(--color--danger);
	font-style: italic;
}

.hoveringKey {
	background-color: var(--color--foreground);
}

.draggingKey {
	background-color: var(--color--primary--tint-2);
}

.warningTooltip {
	color: var(--color--warning);
}

.collapseColumnButton {
	opacity: 0;

	span {
		flex-shrink: 0;
	}

	.isCollapsingColumn &,
	.header:hover & {
		opacity: 1;
	}
}
</style>
