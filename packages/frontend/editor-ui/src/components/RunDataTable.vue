<script setup lang="ts">
import { useExternalHooks } from '@/composables/useExternalHooks';
import type { INodeUi, IRunDataDisplayMode, ITableData } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getMappedExpression } from '@/utils/mappingUtils';
import { getPairedItemId } from '@/utils/pairedItemUtils';
import { shorten } from '@/utils/typesUtils';
import type { GenericValue, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { useTemplateRef, computed, onMounted, ref, watch } from 'vue';
import Draggable from '@/components/Draggable.vue';
import MappingPill from './MappingPill.vue';
import TextWithHighlights from './TextWithHighlights.vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { N8nIconButton, N8nInfoTip, N8nTooltip, N8nTree } from '@n8n/design-system';
import { storeToRefs } from 'pinia';
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import { I18nT } from 'vue-i18n';
import { useTelemetryContext } from '@/composables/useTelemetryContext';

const MAX_COLUMNS_LIMIT = 40;

type DraggableRef = InstanceType<typeof Draggable>;

type Props = {
	node: INodeUi;
	inputData: INodeExecutionData[];
	distanceFromActive: number;
	pageOffset: number;
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
}>();

const externalHooks = useExternalHooks();

const tableRef = useTemplateRef('tableRef');

const activeColumn = ref(-1);
const forceShowGrip = ref(false);
const draggedColumn = ref(false);
const draggingPath = ref<string | null>(null);
const hoveringPath = ref<string | null>(null);
const hoveringColumnIndex = ref<number>(-1);
const activeRow = ref<number | null>(null);
const columnLimit = ref(MAX_COLUMNS_LIMIT);
const columnLimitExceeded = ref(false);
const draggableRef = ref<DraggableRef>();
const fixedColumnWidths = ref<number[] | undefined>();

const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();

const i18n = useI18n();
const telemetry = useTelemetry();
const telemetryContext = useTelemetryContext();
const { trackOpeningRelatedExecution, resolveRelatedExecutionUrl } = useExecutionHelpers();

const {
	hoveringItem,
	focusedMappableInput,
	highlightDraggables: highlight,
} = storeToRefs(ndvStore);

const canDraggableDrop = computed(() => ndvStore.canDraggableDrop);
const draggableStickyPosition = computed(() => ndvStore.draggableStickyPos);
const pairedItemMappings = computed(() => workflowsStore.workflowExecutionPairedItemMappings);
const tableData = computed(() => convertToTable(props.inputData));
const collapsingColumnIndex = computed(() => {
	if (!props.collapsingColumnName) {
		return -1;
	}

	return tableData.value.columns.indexOf(props.collapsingColumnName);
});

onMounted(() => {
	if (tableData.value?.columns && draggableRef.value) {
		const tbody = draggableRef.value.$refs.wrapper as HTMLElement;
		if (tbody) {
			emit('mounted', {
				avgRowHeight: tbody.offsetHeight / tableData.value.data.length,
			});
		}
	}
});

function isHoveringRow(row: number): boolean {
	if (props.disableHoverHighlight) {
		return false;
	}

	if (row === activeRow.value) {
		return true;
	}

	const itemIndex = props.pageOffset + row;
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
	if (!hoveringItem.value || !pairedItemMappings.value[itemNodeId]) {
		return false;
	}

	const hoveringItemId = getPairedItemId(
		hoveringItem.value.nodeName,
		hoveringItem.value.runIndex,
		hoveringItem.value.outputIndex,
		hoveringItem.value.itemIndex,
	);
	return pairedItemMappings.value[itemNodeId].has(hoveringItemId);
}

function showExecutionLink(index: number) {
	if (index === activeRow.value) {
		return true;
	}

	if (activeRow.value === null) {
		return index === 0;
	}

	return false;
}

function onMouseEnterCell(e: MouseEvent) {
	const target = e.target;
	const col = (target as HTMLElement).dataset.col;
	const parsedCol = col ? parseInt(col, 10) : Number.NaN;

	if (!isNaN(parsedCol)) {
		hoveringColumnIndex.value = parsedCol;

		if (target && props.mappingEnabled) {
			activeColumn.value = parsedCol;
		}
	}

	if (target) {
		const row = (target as HTMLElement).dataset.row;
		if (row && !isNaN(parseInt(row, 10))) {
			activeRow.value = parseInt(row, 10);
			emit('activeRowChanged', props.pageOffset + activeRow.value);
		}
	}
}

function onMouseLeaveCell() {
	activeColumn.value = -1;
	activeRow.value = null;
	emit('activeRowChanged', null);
	hoveringColumnIndex.value = -1;
}

function onMouseEnterKey(path: Array<string | number>, colIndex: number) {
	hoveringPath.value = getCellExpression(path, colIndex);
}

function onMouseLeaveKey() {
	hoveringPath.value = null;
}

function isHovering(path: Array<string | number>, colIndex: number) {
	const expr = getCellExpression(path, colIndex);

	return hoveringPath.value === expr;
}

function getExpression(column: string) {
	if (!props.node) {
		return '';
	}

	return getMappedExpression({
		nodeName: props.node.name,
		distanceFromActive: props.distanceFromActive,
		path: [column],
	});
}

function getPathNameFromTarget(el?: HTMLElement) {
	if (!el) {
		return '';
	}
	return el.dataset.name;
}

function getCellPathName(path: Array<string | number>, colIndex: number) {
	const lastKey = path[path.length - 1];
	if (typeof lastKey === 'string') {
		return lastKey;
	}
	if (path.length > 1) {
		const prevKey = path[path.length - 2];
		return `${prevKey}[${lastKey}]`;
	}
	const column = tableData.value.columns[colIndex];
	return `${column}[${lastKey}]`;
}

function getCellExpression(path: Array<string | number>, colIndex: number) {
	if (!props.node) {
		return '';
	}
	const column = tableData.value.columns[colIndex];
	return getMappedExpression({
		nodeName: props.node.name,
		distanceFromActive: props.distanceFromActive,
		path: [column, ...path],
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
	if (value === '') {
		return i18n.baseText('runData.emptyString');
	}
	if (typeof value === 'string') {
		return value;
	}
	if (Array.isArray(value) && value.length === 0) {
		return i18n.baseText('runData.emptyArray');
	}
	if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
		return i18n.baseText('runData.emptyObject');
	}
	if (value === null || value === undefined) {
		return `${value}`;
	}
	if (value === true || value === false || typeof value === 'number') {
		return value.toString();
	}
	return JSON.stringify(value);
}

function onDragStart(el: HTMLElement, data?: string) {
	draggedColumn.value = true;
	ndvStore.draggableStartDragging({
		type: 'mapping',
		data: data ?? '',
		dimensions: el?.getBoundingClientRect() ?? null,
	});
	ndvStore.resetMappingTelemetry();
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

function isDraggingKey(path: Array<string | number>, colIndex: number) {
	if (!draggingPath.value) {
		return;
	}

	return draggingPath.value === getCellExpression(path, colIndex);
}

function onDragEnd(column: string, src: string, depth = '0') {
	ndvStore.draggableStopDragging();
	setTimeout(() => {
		const mappingTelemetry = ndvStore.mappingTelemetry;
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

function isSimple(data: GenericValue): data is string | number | boolean | null | undefined {
	return (
		typeof data !== 'object' ||
		data === null ||
		(Array.isArray(data) && data.length === 0) ||
		(typeof data === 'object' && Object.keys(data).length === 0)
	);
}

function isObject(data: GenericValue): data is Record<string, unknown> {
	return !isSimple(data);
}

function hasJsonInColumn(colIndex: number): boolean {
	return tableData.value.hasJson[tableData.value.columns[colIndex]];
}

function convertToTable(inputData: INodeExecutionData[]): ITableData {
	const resultTableData: GenericValue[][] = [];
	const tableColumns: string[] = [];
	let leftEntryColumns: string[], entryRows: GenericValue[];
	// Go over all entries
	let entry: IDataObject;

	const metadata: ITableData['metadata'] = {
		hasExecutionIds: false,
		data: [],
	};
	const hasJson: { [key: string]: boolean } = {};
	inputData.forEach((data) => {
		if (!data.hasOwnProperty('json')) {
			return;
		}
		entry = data.json;

		// Go over all keys of entry
		entryRows = [];
		const entryColumns = Object.keys(entry || {});

		if (entryColumns.length > MAX_COLUMNS_LIMIT) {
			columnLimitExceeded.value = true;
			leftEntryColumns = entryColumns.slice(0, MAX_COLUMNS_LIMIT);
		} else {
			leftEntryColumns = entryColumns;
		}

		if (data.metadata?.subExecution) {
			metadata.data.push(data.metadata);
			metadata.hasExecutionIds = true;
		} else {
			metadata.data.push(undefined);
		}

		// Go over all the already existing column-keys
		tableColumns.forEach((key) => {
			if (entry.hasOwnProperty(key)) {
				// Entry does have key so add its value
				entryRows.push(entry[key]);
				// Remove key so that we know that it got added
				leftEntryColumns.splice(leftEntryColumns.indexOf(key), 1);

				hasJson[key] =
					hasJson[key] ||
					(typeof entry[key] === 'object' && Object.keys(entry[key] ?? {}).length > 0) ||
					false;
			} else {
				// Entry does not have key so add undefined
				entryRows.push(undefined);
			}
		});

		// Go over all the columns the entry has but did not exist yet
		leftEntryColumns.forEach((key) => {
			// Add the key for all runs in the future
			tableColumns.push(key);
			// Add the value
			entryRows.push(entry[key]);
			hasJson[key] =
				hasJson[key] ||
				(typeof entry[key] === 'object' && Object.keys(entry[key] ?? {}).length > 0) ||
				false;
		});

		// Add the data of the entry
		resultTableData.push(entryRows);
	});

	// Make sure that all entry-rows have the same length
	resultTableData.forEach((rows) => {
		if (tableColumns.length > rows.length) {
			// Has fewer entries so add the missing ones
			rows.push(...new Array(tableColumns.length - rows.length));
		}
	});

	return {
		hasJson,
		columns: tableColumns,
		data: resultTableData,
		metadata,
	};
}

function switchToJsonView() {
	emit('displayModeChange', 'json');
}

function handleSetCollapsingColumn(columnIndex: number) {
	emit(
		'collapsingColumnChanged',
		collapsingColumnIndex.value === columnIndex
			? null
			: (tableData.value.columns[columnIndex] ?? null),
	);
}

watch(focusedMappableInput, (curr) => {
	setTimeout(
		() => {
			forceShowGrip.value = !!focusedMappableInput.value;
		},
		curr ? 300 : 150,
	);
});

watch(
	[collapsingColumnIndex, tableRef],
	([index, table]) => {
		if (index === -1) {
			fixedColumnWidths.value = undefined;
			return;
		}

		if (table === null) {
			return;
		}

		fixedColumnWidths.value = [...table.querySelectorAll('thead tr th')].map((el) =>
			el instanceof HTMLElement
				? el.getBoundingClientRect().width // using getBoundingClientRect for decimal accuracy
				: 0,
		);
	},
	{ immediate: true, flush: 'post' },
);
</script>

<template>
	<div
		:class="[
			$style.dataDisplay,
			{
				[$style.highlight]: highlight,
				[$style.lightHeader]: headerBgColor === 'light',
				[$style.compact]: props.compact,
				[$style.hasCollapsingColumn]: fixedColumnWidths !== undefined,
			},
		]"
	>
		<table v-if="tableData.columns && tableData.columns.length === 0" :class="$style.table">
			<thead>
				<tr>
					<th v-if="tableData.metadata.hasExecutionIds" :class="$style.executionLinkRowHeader">
						<!-- column for execution link -->
					</th>
					<th :class="$style.emptyCell"></th>
					<th :class="$style.tableRightMargin"></th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="(_, index1) in tableData.data"
					:key="index1"
					:class="{ [$style.hoveringRow]: isHoveringRow(index1) }"
				>
					<td
						v-if="tableData.metadata.hasExecutionIds"
						:data-row="index1"
						:class="$style.executionLinkCell"
						@mouseenter="onMouseEnterCell"
						@mouseleave="onMouseLeaveCell"
					>
						<N8nTooltip
							v-if="tableData.metadata.data[index1]"
							:content="
								i18n.baseText('runData.table.viewSubExecution', {
									interpolate: {
										id: `${tableData.metadata.data[index1]?.subExecution.executionId}`,
									},
								})
							"
							placement="left"
							:hide-after="0"
						>
							<N8nIconButton
								v-show="showExecutionLink(index1)"
								element="a"
								type="secondary"
								icon="external-link"
								data-test-id="debug-sub-execution"
								size="mini"
								target="_blank"
								:href="resolveRelatedExecutionUrl(tableData.metadata.data[index1])"
								@click="trackOpeningRelatedExecution(tableData.metadata.data[index1], 'table')"
							/>
						</N8nTooltip>
					</td>
					<td
						:data-row="index1"
						:data-col="0"
						@mouseenter="onMouseEnterCell"
						@mouseleave="onMouseLeaveCell"
					>
						<N8nInfoTip>{{ i18n.baseText('runData.emptyItemHint') }}</N8nInfoTip>
					</td>
					<td :class="$style.tableRightMargin"></td>
				</tr>
			</tbody>
		</table>
		<table v-else ref="tableRef" :class="$style.table">
			<colgroup v-if="fixedColumnWidths">
				<col v-for="(width, i) in fixedColumnWidths" :key="i" :width="width" />
			</colgroup>
			<thead>
				<tr>
					<th v-if="tableData.metadata.hasExecutionIds" :class="$style.executionLinkRowHeader">
						<!-- column for execution link -->
					</th>
					<th
						v-for="(column, i) in tableData.columns || []"
						:key="column"
						:class="{
							[$style.isCollapsingColumn]: collapsingColumnIndex === i,
							[$style.isHoveredColumn]: hoveringColumnIndex === i,
						}"
					>
						<N8nTooltip placement="bottom-start" :disabled="!mappingEnabled" :show-after="1000">
							<template #content>
								<div>
									<img src="/static/data-mapping-gif.gif" />
									{{ i18n.baseText('dataMapping.dragColumnToFieldHint') }}
								</div>
							</template>
							<Draggable
								type="mapping"
								:data="getExpression(column)"
								:disabled="!mappingEnabled"
								:can-drop="canDraggableDrop"
								:sticky-position="draggableStickyPosition"
								@dragstart="onDragStart"
								@dragend="(column) => onDragEnd(column?.textContent ?? '', 'column')"
							>
								<template #preview="{ canDrop }">
									<MappingPill :html="shorten(column, 16, 2)" :can-drop="canDrop" />
								</template>
								<template #default="{ isDragging }">
									<div
										:class="{
											[$style.header]: true,
											[$style.draggableHeader]: mappingEnabled,
											[$style.activeHeader]:
												(i === activeColumn || forceShowGrip) && mappingEnabled,
											[$style.draggingHeader]: isDragging,
										}"
									>
										<TextWithHighlights
											:content="getValueToRender(column || '')"
											:search="search"
										/>
										<N8nTooltip
											:content="i18n.baseText('dataMapping.tableView.columnCollapsing.tooltip')"
											:disabled="mappingEnabled || collapsingColumnIndex === i"
										>
											<N8nIconButton
												:class="$style.collapseColumnButton"
												type="tertiary"
												size="xmini"
												text
												:icon="
													collapsingColumnIndex === i ? 'chevrons-up-down' : 'chevrons-down-up'
												"
												:aria-label="i18n.baseText('dataMapping.tableView.columnCollapsing')"
												@click="handleSetCollapsingColumn(i)"
											/>
										</N8nTooltip>
										<div v-if="mappingEnabled" :class="$style.dragButton">
											<n8n-icon icon="grip-vertical" />
										</div>
									</div>
								</template>
							</Draggable>
						</N8nTooltip>
					</th>
					<th v-if="columnLimitExceeded" :class="$style.header">
						<N8nTooltip placement="bottom-end">
							<template #content>
								<div>
									<I18nT
										tag="span"
										keypath="dataMapping.tableView.tableColumnsExceeded.tooltip"
										scope="global"
									>
										<template #columnLimit>{{ columnLimit }}</template>
										<template #link>
											<a @click="switchToJsonView">{{
												i18n.baseText('dataMapping.tableView.tableColumnsExceeded.tooltip.link')
											}}</a>
										</template>
									</I18nT>
								</div>
							</template>
							<span>
								<n8n-icon :class="$style['warningTooltip']" icon="triangle-alert" />
								{{ i18n.baseText('dataMapping.tableView.tableColumnsExceeded') }}
							</span>
						</N8nTooltip>
					</th>
					<th :class="$style.tableRightMargin"></th>
				</tr>
			</thead>
			<Draggable
				ref="draggableRef"
				tag="tbody"
				type="mapping"
				target-data-key="mappable"
				:disabled="!mappingEnabled"
				@dragstart="onCellDragStart"
				@dragend="onCellDragEnd"
			>
				<template #preview="{ canDrop, el }">
					<MappingPill
						:html="shorten(getPathNameFromTarget(el) || '', 16, 2)"
						:can-drop="canDrop"
					/>
				</template>
				<tr
					v-for="(row, index1) in tableData.data"
					:key="index1"
					:class="{ [$style.hoveringRow]: isHoveringRow(index1) }"
					:data-test-id="isHoveringRow(index1) ? 'hovering-item' : undefined"
				>
					<td
						v-if="tableData.metadata.hasExecutionIds"
						:data-row="index1"
						:class="$style.executionLinkCell"
						@mouseenter="onMouseEnterCell"
						@mouseleave="onMouseLeaveCell"
					>
						<N8nTooltip
							v-if="tableData.metadata.data[index1]"
							:content="
								i18n.baseText('runData.table.viewSubExecution', {
									interpolate: {
										id: `${tableData.metadata.data[index1]?.subExecution.executionId}`,
									},
								})
							"
							placement="left"
							:hide-after="0"
						>
							<N8nIconButton
								v-show="showExecutionLink(index1)"
								element="a"
								type="secondary"
								icon="external-link"
								data-test-id="debug-sub-execution"
								size="mini"
								target="_blank"
								:href="resolveRelatedExecutionUrl(tableData.metadata.data[index1])"
								@click="trackOpeningRelatedExecution(tableData.metadata.data[index1], 'table')"
							/>
						</N8nTooltip>
					</td>
					<td
						v-for="(data, index2) in row"
						:key="index2"
						:data-row="index1"
						:data-col="index2"
						:class="[
							hasJsonInColumn(index2) ? $style.minColWidth : $style.limitColWidth,
							collapsingColumnIndex === index2 ? $style.isCollapsingColumn : '',
						]"
						@mouseenter="onMouseEnterCell"
						@mouseleave="onMouseLeaveCell"
					>
						<TextWithHighlights
							v-if="isSimple(data)"
							:content="getValueToRender(data)"
							:search="search"
							:class="{ [$style.value]: true, [$style.empty]: isEmpty(data) }"
						/>
						<N8nTree v-else-if="isObject(data)" :node-class="$style.nodeClass" :value="data">
							<template #label="{ label, path }">
								<TextWithHighlights
									data-target="mappable"
									:class="{
										[$style.hoveringKey]: mappingEnabled && isHovering(path, index2),
										[$style.draggingKey]: isDraggingKey(path, index2),
										[$style.dataKey]: true,
										[$style.mappable]: mappingEnabled,
									}"
									:content="label || i18n.baseText('runData.unnamedField')"
									:search="search"
									:data-name="getCellPathName(path, index2)"
									:data-value="getCellExpression(path, index2)"
									:data-depth="path.length"
									@mouseenter="() => onMouseEnterKey(path, index2)"
									@mouseleave="onMouseLeaveKey"
								/>
							</template>

							<template #value="{ value }">
								<TextWithHighlights
									:content="getValueToRender(value)"
									:search="search"
									:class="{ [$style.nestedValue]: true, [$style.empty]: isEmpty(value) }"
								/>
							</template>
						</N8nTree>
					</td>
					<td v-if="columnLimitExceeded"></td>
					<td :class="$style.tableRightMargin"></td>
				</tr>
			</Draggable>
		</table>
	</div>
</template>

<style lang="scss" module>
.dataDisplay {
	position: absolute;
	top: 0;
	left: 0;
	padding-left: var(--spacing-xs);
	right: 0;
	overflow-y: auto;
	line-height: 1.5;
	word-break: normal;
	height: 100%;
	padding-bottom: var(--spacing-3xl);

	&.compact {
		padding-left: var(--spacing-2xs);
	}
}

.table {
	border-collapse: separate;
	text-align: left;
	width: calc(100%);
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);

	th {
		background-color: var(--color-background-base);
		border-top: var(--border-base);
		border-bottom: var(--border-base);
		border-left: var(--border-base);
		position: sticky;
		top: 0;
		color: var(--color-text-dark);
		z-index: 1;

		.lightHeader & {
			background-color: var(--color-background-light);
		}

		&.tableRightMargin {
			background-color: transparent;
		}
	}

	td {
		vertical-align: top;
		padding: var(--spacing-4xs) var(--spacing-3xs);
		border-bottom: var(--border-base);
		border-left: var(--border-base);
		overflow-wrap: break-word;
		white-space: pre-wrap;
		vertical-align: top;
	}

	td:first-child,
	td:nth-last-child(2) {
		position: relative;
		z-index: 0;

		&:after {
			// add border without shifting content
			content: '';
			position: absolute;
			height: 100%;
			width: 2px;
			top: 0;
		}
	}

	td:nth-last-child(2):after {
		right: -1px;
	}

	td:first-child:after {
		left: -1px;
	}

	th:last-child,
	td:last-child {
		border-right: var(--border-base);
	}

	.hasCollapsingColumn & {
		table-layout: fixed;

		td:not(.isCollapsingColumn) {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;

			& :global(.n8n-tree) {
				height: 1.5em;
				overflow: hidden;
			}
		}
	}
}

th.isCollapsingColumn {
	border-top-color: var(--color-foreground-xdark);
	border-left-color: var(--color-foreground-xdark);
	border-right-color: var(--color-foreground-xdark);
}

td.isCollapsingColumn {
	border-left-color: var(--color-foreground-xdark);
	border-right-color: var(--color-foreground-xdark);

	tr:last-child & {
		border-bottom-color: var(--color-foreground-xdark);
	}
}

td.isCollapsingColumn + td,
th.isCollapsingColumn + th {
	border-left-color: var(--color-foreground-xdark);
}

.nodeClass {
	margin-bottom: var(--spacing-5xs);
}

.emptyCell {
	height: 32px;
}

.header {
	display: flex;
	align-items: center;
	padding: var(--spacing-4xs) var(--spacing-3xs);

	span {
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		flex-grow: 1;
	}
}

.draggableHeader {
	&:hover {
		cursor: grab;
		background-color: var(--color-foreground-base);

		.dragButton {
			opacity: 1;
		}
	}
}

.highlight .draggableHeader {
	color: var(--color-primary);
}

.draggingHeader {
	color: var(--color-primary);
	background-color: var(--color-primary-tint-2);
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
	color: var(--color-text-dark);
	line-height: 1.7;
	font-weight: var(--font-weight-bold);
	border-radius: var(--border-radius-base);
	padding: 0 var(--spacing-5xs) 0 var(--spacing-5xs);
	margin-right: var(--spacing-5xs);
}

.value {
	line-height: var(--font-line-height-regular);
}

.nestedValue {
	composes: value;
	margin-left: var(--spacing-4xs);
}

.mappable {
	cursor: grab;
}

.empty {
	color: var(--color-danger);
	font-style: italic;
}

.limitColWidth {
	max-width: 300px;
}

.minColWidth {
	min-width: 240px;
}

.hoveringKey {
	background-color: var(--color-foreground-base);
}

.draggingKey {
	background-color: var(--color-primary-tint-2);
}

.tableRightMargin {
	// becomes necessary with large tables
	width: var(--ndv-spacing);
	border-right: none !important;
	border-top: none !important;
	border-bottom: none !important;

	.compact & {
		padding: 0;
		min-width: var(--spacing-2xs);
		max-width: var(--spacing-2xs);
	}
}

.hoveringRow {
	td:first-child:after,
	td:nth-last-child(2):after {
		background-color: var(--color-secondary);
	}
}

.warningTooltip {
	color: var(--color-warning);
}

.executionLinkCell {
	padding: var(--spacing-3xs) !important;
}

.executionLinkRowHeader {
	width: var(--spacing-m);
}

.collapseColumnButton {
	span {
		flex-shrink: 0;
	}

	opacity: 0;
	margin-block: calc(-2 * var(--spacing-2xs));

	.isCollapsingColumn &,
	th.isHoveredColumn &,
	th:hover & {
		opacity: 1;
	}
}
</style>
