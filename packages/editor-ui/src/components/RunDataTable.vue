<template>
	<div :class="$style.dataDisplay">
		<table :class="$style.table" v-if="tableData.columns && tableData.columns.length === 0">
			<tr>
				<th :class="$style.emptyCell"></th>
				<th :class="$style.tableRightMargin"></th>
			</tr>
			<tr v-for="(row, index1) in tableData.data" :key="index1" :class="{[$style.hoveringRow]: isHoveringRow(index1)}">
				<td
					:data-row="index1"
					:data-col="0"
					@mouseenter="onMouseEnterCell"
					@mouseleave="onMouseLeaveCell"
				>
					<n8n-info-tip>{{ $locale.baseText('runData.emptyItemHint') }}</n8n-info-tip>
				</td>
				<td :class="$style.tableRightMargin"></td>
			</tr>
		</table>
		<table :class="$style.table" v-else>
			<thead>
				<tr>
					<th v-for="(column, i) in tableData.columns || []" :key="column">
						<n8n-tooltip
							placement="bottom-start"
							:disabled="!mappingEnabled"
							:open-delay="1000"
						>
							<template #content>
								<div>
									<img src='/static/data-mapping-gif.gif'/>
									{{ $locale.baseText('dataMapping.dragColumnToFieldHint') }}
								</div>
							</template>
							<draggable
								type="mapping"
								:data="getExpression(column)"
								:disabled="!mappingEnabled"
								@dragstart="onDragStart"
								@dragend="(column) => onDragEnd(column, 'column')"
							>
								<template #preview="{ canDrop }">
									<div
										:class="[$style.dragPill, canDrop ? $style.droppablePill : $style.defaultPill]"
									>
										{{
											$locale.baseText('dataMapping.mapKeyToField', {
												interpolate: { name: shorten(column, 16, 2) },
											})
										}}
									</div>
								</template>
								<template #default="{ isDragging }">
									<div
										:class="{
											[$style.header]: true,
											[$style.draggableHeader]: mappingEnabled,
											[$style.activeHeader]: (i === activeColumn || forceShowGrip) && mappingEnabled,
											[$style.draggingHeader]: isDragging,
										}"
									>
										<span>{{ column || '&nbsp;' }}</span>
										<div :class="$style.dragButton">
											<font-awesome-icon icon="grip-vertical" />
										</div>
									</div>
								</template>
							</draggable>
						</n8n-tooltip>
					</th>
					<th v-if="columnLimitExceeded" :class="$style.header">
						<n8n-tooltip placement="bottom-end">
							<template #content>
								<div>
									<i18n path="dataMapping.tableView.tableColumnsExceeded.tooltip">
										<template #columnLimit>{{ columnLimit }}</template>
										<template #link>
										  <a @click="switchToJsonView">{{ $locale.baseText('dataMapping.tableView.tableColumnsExceeded.tooltip.link') }}</a>
										</template>
									</i18n>
								</div>
							</template>
							<span>
								<font-awesome-icon :class="$style['warningTooltip']" icon="exclamation-triangle"></font-awesome-icon>
								{{ $locale.baseText('dataMapping.tableView.tableColumnsExceeded') }}
							</span>
						</n8n-tooltip>
					</th>
					<th :class="$style.tableRightMargin"></th>
				</tr>
			</thead>
			<draggable
				tag="tbody"
				type="mapping"
				targetDataKey="mappable"
				:disabled="!mappingEnabled"
				@dragstart="onCellDragStart"
				@dragend="onCellDragEnd"
				ref="draggable"
			>
				<template #preview="{ canDrop, el }">
					<div :class="[$style.dragPill, canDrop ? $style.droppablePill : $style.defaultPill]">
						{{
							$locale.baseText(
								tableData.data.length > 1
									? 'dataMapping.mapAllKeysToField'
									: 'dataMapping.mapKeyToField',
								{
									interpolate: { name: shorten(getPathNameFromTarget(el) || '', 16, 2) },
								},
							)
						}}
					</div>
				</template>
				<template>
					<tr v-for="(row, index1) in tableData.data" :key="index1" :class="{[$style.hoveringRow]: isHoveringRow(index1)}">
						<td
							v-for="(data, index2) in row"
							:key="index2"
							:data-row="index1"
							:data-col="index2"
							@mouseenter="onMouseEnterCell"
							@mouseleave="onMouseLeaveCell"
							:class="hasJsonInColumn(index2) ? $style.minColWidth : $style.limitColWidth"
						>
							<span v-if="isSimple(data)" :class="{[$style.value]: true, [$style.empty]: isEmpty(data)}">{{ getValueToRender(data) }}</span>
							<n8n-tree :nodeClass="$style.nodeClass" v-else :value="data">
								<template #label="{ label, path }">
									<span
										@mouseenter="() => onMouseEnterKey(path, index2)"
										@mouseleave="onMouseLeaveKey"
										:class="{
											[$style.hoveringKey]: mappingEnabled && isHovering(path, index2),
											[$style.draggingKey]: isDraggingKey(path, index2),
											[$style.dataKey]: true,
											[$style.mappable]: mappingEnabled,
										}"
										data-target="mappable"
										:data-name="getCellPathName(path, index2)"
										:data-value="getCellExpression(path, index2)"
										:data-depth="path.length"
										>{{ label || $locale.baseText('runData.unnamedField') }}</span
									>
								</template>
								<template #value="{ value }">
									<span :class="{ [$style.nestedValue]: true, [$style.empty]: isEmpty(value) }">{{
										getValueToRender(value)
									}}</span>
								</template>
							</n8n-tree>
						</td>
						<td v-if="columnLimitExceeded"></td>
						<td :class="$style.tableRightMargin"></td>
					</tr>
				</template>
			</draggable>
		</table>
	</div>
</template>

<script lang="ts">
/* eslint-disable prefer-spread */
import { INodeUi, ITableData, NDVState } from '@/Interface';
import { getPairedItemId } from '@/utils';
import Vue, { PropType } from 'vue';
import mixins from 'vue-typed-mixins';
import { GenericValue, IDataObject, INodeExecutionData } from 'n8n-workflow';
import Draggable from './Draggable.vue';
import { shorten } from '@/utils';
import { externalHooks } from '@/mixins/externalHooks';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNDVStore } from '@/stores/ndv';

const MAX_COLUMNS_LIMIT = 40;

export default mixins(externalHooks).extend({
	name: 'run-data-table',
	components: { Draggable },
	props: {
		node: {
			type: Object as PropType<INodeUi>,
		},
		inputData: {
			type: Array as PropType<INodeExecutionData[]>,
		},
		mappingEnabled: {
			type: Boolean,
		},
		distanceFromActive: {
			type: Number,
		},
		runIndex: {
			type: Number,
		},
		outputIndex: {
			type: Number,
		},
		totalRuns: {
			type: Number,
		},
		pageOffset: {
			type: Number,
		},
		hasDefaultHoverState: {
			type: Boolean,
		},
	},
	data() {
		return {
			activeColumn: -1,
			forceShowGrip: false,
			draggedColumn: false,
			draggingPath: null as null | string,
			hoveringPath: null as null | string,
			mappingHintVisible: false,
			activeRow: null as number | null,
			columnLimit: MAX_COLUMNS_LIMIT,
			columnLimitExceeded: false,
		};
	},
	mounted() {
		if (this.tableData && this.tableData.columns && this.$refs.draggable) {
			const tbody = (this.$refs.draggable as Vue).$refs.wrapper as HTMLElement;
			if (tbody) {
				this.$emit('mounted', {
					avgRowHeight: tbody.offsetHeight / this.tableData.data.length,
				});
			}
		}
	},
	computed: {
		...mapStores(
			useNDVStore,
			useWorkflowsStore,
		),
		hoveringItem(): NDVState['hoveringItem'] {
			return this.ndvStore.hoveringItem;
		},
		pairedItemMappings(): {[itemId: string]: Set<string>} {
			return this.workflowsStore.workflowExecutionPairedItemMappings;
		},
		tableData(): ITableData {
			return this.convertToTable(this.inputData);
		},
		focusedMappableInput(): string {
			return this.ndvStore.focusedMappableInput;
		},
	},
	methods: {
		shorten,
		isHoveringRow(row: number): boolean {
			if (row === this.activeRow) {
				return true;
			}

			const itemIndex = this.pageOffset + row;
			if (itemIndex === 0 && !this.hoveringItem && this.hasDefaultHoverState && this.distanceFromActive === 1) {
				return true;
			}
			const itemNodeId = getPairedItemId(this.node.name, this.runIndex || 0, this.outputIndex || 0, itemIndex);
			if (!this.hoveringItem || !this.pairedItemMappings[itemNodeId]) {
				return false;
			}

			const hoveringItemId = getPairedItemId(this.hoveringItem.nodeName, this.hoveringItem.runIndex, this.hoveringItem.outputIndex, this.hoveringItem.itemIndex);
			return this.pairedItemMappings[itemNodeId].has(hoveringItemId);
		},
		onMouseEnterCell(e: MouseEvent) {
			const target = e.target;
			if (target && this.mappingEnabled) {
				const col = (target as HTMLElement).dataset.col;
				if (col && !isNaN(parseInt(col, 10))) {
					this.activeColumn = parseInt(col, 10);
				}
			}

			if (target) {
				const row = (target as HTMLElement).dataset.row;
				if (row && !isNaN(parseInt(row, 10))) {
					this.activeRow = parseInt(row, 10);
					this.$emit('activeRowChanged', this.pageOffset + this.activeRow);
				}
			}
		},
		onMouseLeaveCell() {
			this.activeColumn = -1;
			this.activeRow = null;
			this.$emit('activeRowChanged', null);
		},
		onMouseEnterKey(path: string[], colIndex: number) {
			this.hoveringPath = this.getCellExpression(path, colIndex);
		},
		onMouseLeaveKey() {
			this.hoveringPath = null;
		},
		isHovering(path: string[], colIndex: number) {
			const expr = this.getCellExpression(path, colIndex);

			return this.hoveringPath === expr;
		},
		getExpression(column: string) {
			if (!this.node) {
				return '';
			}

			if (this.distanceFromActive === 1) {
				return `{{ $json["${column}"] }}`;
			}

			return `{{ $node["${this.node.name}"].json["${column}"] }}`;
		},
		getPathNameFromTarget(el: HTMLElement) {
			if (!el) {
				return '';
			}
			return el.dataset.name;
		},
		getCellPathName(path: Array<string | number>, colIndex: number) {
			const lastKey = path[path.length - 1];
			if (typeof lastKey === 'string') {
				return lastKey;
			}
			if (path.length > 1) {
				const prevKey = path[path.length - 2];
				return `${prevKey}[${lastKey}]`;
			}
			const column = this.tableData.columns[colIndex];
			return `${column}[${lastKey}]`;
		},
		getCellExpression(path: Array<string | number>, colIndex: number) {
			if (!this.node) {
				return '';
			}

			const expr = path.reduce((accu: string, key: string | number) => {
				if (typeof key === 'number') {
					return `${accu}[${key}]`;
				}

				return `${accu}["${key}"]`;
			}, '');
			const column = this.tableData.columns[colIndex];

			if (this.distanceFromActive === 1) {
				return `{{ $json["${column}"]${expr} }}`;
			}

			return `{{ $node["${this.node.name}"].json["${column}"]${expr} }}`;
		},
		isEmpty(value: unknown): boolean {
			return (
				value === '' ||
				(Array.isArray(value) && value.length === 0) ||
				(typeof value === 'object' && value !== null && Object.keys(value).length === 0) ||
				(value === null || value === undefined)
			);
		},
		getValueToRender(value: unknown) {
			if (value === '') {
				return this.$locale.baseText('runData.emptyString');
			}
			if (typeof value === 'string') {
				return value.replaceAll('\n', '\\n');
			}

			if (Array.isArray(value) && value.length === 0) {
				return this.$locale.baseText('runData.emptyArray');
			}

			if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
				return this.$locale.baseText('runData.emptyObject');
			}

			if (value === null || value === undefined) {
				return `[${value}]`;
			}

			return value;
		},
		onDragStart() {
			this.draggedColumn = true;
			this.ndvStore.resetMappingTelemetry();
		},
		onCellDragStart(el: HTMLElement) {
			if (el && el.dataset.value) {
				this.draggingPath = el.dataset.value;
			}

			this.onDragStart();
		},
		onCellDragEnd(el: HTMLElement) {
			this.draggingPath = null;

			this.onDragEnd(el.dataset.name || '', 'tree', el.dataset.depth || '0');
		},
		isDraggingKey(path: Array<string | number>, colIndex: number) {
			if (!this.draggingPath) {
				return;
			}

			return this.draggingPath === this.getCellExpression(path, colIndex);
		},
		onDragEnd(column: string, src: string, depth = '0') {
			setTimeout(() => {
				const mappingTelemetry = this.ndvStore.mappingTelemetry;
				const telemetryPayload = {
					src_node_type: this.node.type,
					src_field_name: column,
					src_nodes_back: this.distanceFromActive,
					src_run_index: this.runIndex,
					src_runs_total: this.totalRuns,
					src_field_nest_level: parseInt(depth, 10),
					src_view: 'table',
					src_element: src,
					success: false,
					...mappingTelemetry,
				};

				this.$externalHooks().run('runDataTable.onDragEnd', telemetryPayload);

				this.$telemetry.track('User dragged data for mapping', telemetryPayload);
			}, 1000); // ensure dest data gets set if drop
		},
		isSimple(data: unknown): boolean {
			return (typeof data !== 'object' || data === null) ||
				(Array.isArray(data) && data.length === 0) ||
				(typeof data === 'object' && Object.keys(data).length === 0);
		},
		hasJsonInColumn(colIndex: number): boolean {
			return this.tableData.hasJson[this.tableData.columns[colIndex]];
		},
		convertToTable(inputData: INodeExecutionData[]): ITableData {
			const tableData: GenericValue[][] = [];
			const tableColumns: string[] = [];
			let leftEntryColumns: string[], entryRows: GenericValue[];
			// Go over all entries
			let entry: IDataObject;
			const hasJson: { [key: string]: boolean } = {};
			inputData.forEach((data) => {
				if (!data.hasOwnProperty('json')) {
					return;
				}
				entry = data.json;

				// Go over all keys of entry
				entryRows = [];
				const entryColumns = Object.keys(entry || {});

				if(entryColumns.length > MAX_COLUMNS_LIMIT) {
					this.columnLimitExceeded = true;
					leftEntryColumns = entryColumns.slice(0, MAX_COLUMNS_LIMIT);
				} else {
					leftEntryColumns = entryColumns;
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
							(typeof entry[key] === 'object' && Object.keys(entry[key] || {}).length > 0) ||
							false;
					} else {
						// Entry does not have key so add null
						entryRows.push(null);
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
						(typeof entry[key] === 'object' && Object.keys(entry[key] || {}).length > 0) ||
						false;
				});

				// Add the data of the entry
				tableData.push(entryRows);
			});

			// Make sure that all entry-rows have the same length
			tableData.forEach((entryRows) => {
				if (tableColumns.length > entryRows.length) {
					// Has fewer entries so add the missing ones
					entryRows.push(...new Array(tableColumns.length - entryRows.length));
				}
			});

			return {
				hasJson,
				columns: tableColumns,
				data: tableData,
			};
		},
		switchToJsonView(){
			this.$emit('displayModeChange', 'json');
		},
	},
	watch: {
		focusedMappableInput(curr: boolean) {
			setTimeout(
				() => {
					this.forceShowGrip = !!this.focusedMappableInput;
				},
				curr ? 300 : 150,
			);
		},
	},
});
</script>

<style lang="scss" module>
.dataDisplay {
	position: absolute;
	top: 0;
	left: 0;
	padding-left: var(--spacing-s);
	right: 0;
	overflow-y: auto;
	line-height: 1.5;
	word-break: normal;
	height: 100%;
	padding-bottom: var(--spacing-3xl);
}

.table {
	border-collapse: separate;
	text-align: left;
	width: calc(100%);
	font-size: var(--font-size-s);

	th {
		background-color: var(--color-background-base);
		border-top: var(--border-base);
		border-bottom: var(--border-base);
		border-left: var(--border-base);
		position: sticky;
		top: 0;
		color: var(--color-text-dark);
		z-index: 1;
	}

	td {
		vertical-align: top;
		padding: var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs) var(--spacing-3xs);
		border-bottom: var(--border-base);
		border-left: var(--border-base);
		overflow-wrap: break-word;
		white-space: pre-wrap;
	}

	td:first-child, td:nth-last-child(2) {
		position: relative;
		z-index: 0;

		&:after { // add border without shifting content
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
	padding: var(--spacing-2xs);

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

.draggingHeader {
	background-color: var(--color-primary-tint-2);
}

.activeHeader {
	.dragButton {
		opacity: 1;
	}
}

.dragButton {
	opacity: 0;
	margin-left: var(--spacing-2xs);
}

.dragPill {
	display: flex;
	height: 24px;
	align-items: center;
	padding: 0 var(--spacing-4xs);
	color: var(--color-text-xlight);
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	border-radius: var(--border-radius-base);
	white-space: nowrap;
}

.droppablePill {
	background-color: var(--color-success);
}

.defaultPill {
	background-color: var(--color-primary);
	transform: translate(-50%, -100%);
	box-shadow: 0px 2px 6px rgba(68, 28, 23, 0.2);
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
	background-color: var(--color-background-base) !important;
	width: var(--spacing-s);
	border-right: none !important;
	border-top: none !important;
	border-bottom: none !important;
}

.hoveringRow {
	td:first-child:after, td:nth-last-child(2):after {
		background-color: var(--color-secondary);
	}
}

.warningTooltip {
	color: var(--color-warning);
}

</style>
