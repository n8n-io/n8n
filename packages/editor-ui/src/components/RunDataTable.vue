<template>
	<div>
		<table :class="$style.table" v-if="tableData.columns && tableData.columns.length === 0">
			<tr>
				<th :class="$style.emptyCell"></th>
				<th :class="$style.tableRightMargin"></th>
			</tr>
			<tr v-for="(row, index1) in tableData.data" :key="index1">
				<td>
					<n8n-text>{{ $locale.baseText('runData.emptyItemHint') }}</n8n-text>
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
							:disabled="!mappingEnabled || showHintWithDelay"
							:open-delay="1000"
						>
							<div slot="content">{{ $locale.baseText('dataMapping.dragColumnToFieldHint') }}</div>
							<Draggable
								type="mapping"
								:data="getExpression(column)"
								:disabled="!mappingEnabled"
								@dragstart="onDragStart"
								@dragend="() => onDragEnd(column, 'column')"
							>
								<template v-slot:preview="{ canDrop }">
									<div
										:class="[$style.dragPill, canDrop ? $style.droppablePill : $style.defaultPill]"
									>
										{{
											$locale.baseText('dataMapping.mapSpecificColumnToField', {
												interpolate: { name: shorten(column, 16, 2) },
											})
										}}
									</div>
								</template>
								<template v-slot="{ isDragging }">
									<div
										:class="{
											[$style.header]: true,
											[$style.draggableHeader]: mappingEnabled,
											[$style.activeHeader]:
												(i === activeColumn || forceShowGrip) && mappingEnabled,
											[$style.draggingHeader]: isDragging,
										}"
									>
										<span>{{ column || '&nbsp;' }}</span>
										<n8n-tooltip
											v-if="mappingEnabled"
											placement="bottom-start"
											:manual="true"
											:value="i === 0 && showHintWithDelay"
										>
											<div
												v-if="focusedMappableInput"
												slot="content"
												v-html="
													$locale.baseText('dataMapping.tableHint', {
														interpolate: { name: focusedMappableInput },
													})
												"
											></div>
											<div
												v-else
												slot="content"
												v-html="$locale.baseText('dataMapping.dragColumnToFieldHint')"
											></div>
											<div :class="$style.dragButton">
												<font-awesome-icon icon="grip-vertical" />
											</div>
										</n8n-tooltip>
									</div>
								</template>
							</Draggable>
						</n8n-tooltip>
					</th>
					<th :class="$style.tableRightMargin"></th>
				</tr>
			</thead>
			<Draggable
				tag="tbody"
				type="mapping"
				targetDataKey="mappable"
				:disabled="!mappingEnabled"
				@dragstart="onCellDragStart"
				@dragend="onCellDragEnd"
				ref="draggable"
			>
				<template v-slot:preview="{ canDrop, el }">
					<div :class="[$style.dragPill, canDrop ? $style.droppablePill : $style.defaultPill]">
						{{
							$locale.baseText(tableData.data.length > 1? 'dataMapping.mapAllKeysToField': 'dataMapping.mapSpecificColumnToField', {
								interpolate: { name: shorten(getPathNameFromTarget(el) || '', 16, 2) },
							})
						}}
					</div>
				</template>
				<template>
					<tr v-for="(row, index1) in tableData.data" :key="index1" :class="$style.hoverableRow">
						<td
							v-for="(data, index2) in row"
							:key="index2"
							:data-col="index2"
							@mouseenter="onMouseEnterCell"
							@mouseleave="onMouseLeaveCell"
							:class="{ [$style.limitWidth]: !hasJsonInColumn(index2) }"
						>
							<span v-if="isSimple(data)" :class="$style.value">{{
								[null, undefined].includes(data) ? '&nbsp;' : data
							}}</span>
							<n8n-tree :nodeClass="$style.nodeClass" v-else :input="data">
								<template v-slot:label="{ label, path }">
									<span
										@mouseenter="() => onMouseEnterKey(path)"
										@mouseleave="onMouseLeaveKey"
										:class="{
											[$style.hoveringKey]: mappingEnabled && isHovering(path),
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
								<template v-slot:value="{ value }">
									<span :class="{ [$style.value]: true, [$style.empty]: isEmpty(value) }">{{
										getValueToRender(value)
									}}</span>
								</template>
							</n8n-tree>
						</td>
						<td :class="$style.tableRightMargin"></td>
					</tr>
				</template>
			</Draggable>
		</table>
	</div>
</template>

<script lang="ts">
import { LOCAL_STORAGE_MAPPING_FLAG } from '@/constants';
import { INodeUi, ITableData } from '@/Interface';
import Vue from 'vue';
import Draggable from './Draggable.vue';
import { shorten } from './helpers';

export default Vue.extend({
	name: 'RunDataTable',
	components: { Draggable },
	props: {
		node: {
			type: Object as () => INodeUi,
		},
		tableData: {
			type: Object as () => ITableData,
		},
		mappingEnabled: {
			type: Boolean,
		},
		distanceFromActive: {
			type: Number,
		},
		showMappingHint: {
			type: Boolean,
		},
		runIndex: {
			type: Number,
		},
		totalRuns: {
			type: Number,
		},
	},
	data() {
		return {
			activeColumn: -1,
			showHintWithDelay: false,
			forceShowGrip: false,
			draggedColumn: false,
			draggingPath: null as null | string,
			hoveringPath: null as null | string,
		};
	},
	mounted() {
		if (this.showMappingHint && this.showHint) {
			setTimeout(() => {
				this.showHintWithDelay = this.showHint;
				this.$telemetry.track('User viewed data mapping tooltip', { type: 'param focus' });
			}, 500);
		}

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
		focusedMappableInput(): string {
			return this.$store.getters['ui/focusedMappableInput'];
		},
		showHint(): boolean {
			return (
				!this.draggedColumn &&
				(this.showMappingHint ||
					(!!this.focusedMappableInput &&
						window.localStorage.getItem(LOCAL_STORAGE_MAPPING_FLAG) !== 'true'))
			);
		},
	},
	methods: {
		shorten,
		onMouseEnterCell(e: MouseEvent) {
			const target = e.target;
			if (target && this.mappingEnabled) {
				const col = (target as HTMLElement).dataset.col;
				if (col && !isNaN(parseInt(col, 10))) {
					this.activeColumn = parseInt(col, 10);
				}
			}
		},
		onMouseLeaveCell() {
			this.activeColumn = -1;
		},
		onMouseEnterKey(path: string[]) {
			this.hoveringPath = path.join('|');
		},
		onMouseLeaveKey() {
			this.hoveringPath = null;
		},
		isHovering(path: string[]) {
			return this.hoveringPath === path.join('|');
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
		getCellPathName(path: (string | number)[], colIndex: number) {
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
		getCellExpression(path: (string | number)[], colIndex: number) {
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
		isEmpty(value: unknown) {
			return (
				value === '' ||
				(Array.isArray(value) && value.length === 0) ||
				(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
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

			return value;
		},
		onDragStart() {
			this.draggedColumn = true;

			this.$store.commit('ui/resetMappingTelemetry');
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
		isDraggingKey(path: (string | number)[], colIndex: number) {
			if (!this.draggingPath) {
				return;
			}

			return this.draggingPath === this.getCellExpression(path, colIndex);
		},
		onDragEnd(column: string, src: string, depth = '0') {
			setTimeout(() => {
				const mappingTelemetry = this.$store.getters['ui/mappingTelemetry'];
				this.$telemetry.track('User dragged data for mapping', {
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
				});
			}, 1000); // ensure dest data gets set if drop
		},
		isSimple(data: unknown): boolean {
			return typeof data !== 'object';
		},
		hasJsonInColumn(colIndex: number): boolean {
			return this.tableData.hasJson[this.tableData.columns[colIndex]];
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
		showHint(curr: boolean, prev: boolean) {
			if (curr) {
				setTimeout(() => {
					this.showHintWithDelay = this.showHint;
					if (this.showHintWithDelay) {
						this.$telemetry.track('User viewed data mapping tooltip', { type: 'param focus' });
					}
				}, 1000);
			} else {
				this.showHintWithDelay = false;
			}
		},
	},
});
</script>

<style lang="scss" module>
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
	}

	td {
		vertical-align: top;
		padding: var(--spacing-2xs);
		border-bottom: var(--border-base);
		border-left: var(--border-base);
		overflow-wrap: break-word;
		white-space: pre-wrap;
	}

	th:last-child,
	td:last-child {
		border-right: var(--border-base);
	}
}

.nodeClass {
	margin-bottom: 2px;
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
	padding: var(--spacing-4xs) var(--spacing-4xs) var(--spacing-3xs) var(--spacing-4xs);
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
	white-space: nowrap;
	color: var(--color-text-dark);
	line-height: 1.7;
}

.value {
	line-height: var(--font-line-height-loose);
}

.hoverableRow {
	&:hover {
		.dataKey {
			color: var(--color-table-highlight);
		}
	}
}

.mappable {
	cursor: grab;
}

.empty {
	color: var(--color-danger);
}

.limitWidth {
	max-width: 300px;
}

.hoveringKey {
	background-color: var(--color-foreground-base);
}

.draggingKey {
	background-color: var(--color-primary-tint-2);
}

.tableRightMargin{
	// becomes necessary with large tables
	width: var(--spacing-s);
	border-right: none !important;
	border-top: none !important;
	border-bottom: none !important;
}
</style>
