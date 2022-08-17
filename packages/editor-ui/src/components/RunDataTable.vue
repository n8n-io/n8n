<template>
	<div>
		<table :class="$style.table" v-if="tableData.columns && tableData.columns.length === 0">
			<tr>
				<th :class="$style.emptyCell"></th>
			</tr>
			<tr v-for="(row, index1) in tableData.data" :key="index1">
				<td>
					<n8n-text>{{ $locale.baseText('runData.emptyItemHint') }}</n8n-text>
				</td>
			</tr>
		</table>
		<table :class="$style.table" v-else>
			<thead>
				<tr>
					<th v-for="(column, i) in tableData.columns || []" :key="column">
						<n8n-tooltip placement="bottom-start" :disabled="!mappingEnabled || showHintWithDelay" :open-delay="1000">
							<div slot="content" v-html="$locale.baseText('dataMapping.dragColumnToFieldHint')"></div>
							<Draggable type="mapping" :data="getExpression(column)" :disabled="!mappingEnabled" @dragstart="onDragStart" @dragend="(column) => onDragEnd(column)">
								<template v-slot:preview="{ canDrop }">
									<div :class="[$style.dragPill, canDrop ? $style.droppablePill: $style.defaultPill]">
										{{ $locale.baseText('dataMapping.mapSpecificColumnToField', { interpolate: { name: shorten(column, 16, 2) } }) }}
									</div>
								</template>
								<template v-slot="{ isDragging }">
									<div
										:class="{
											[$style.header]: true,
											[$style.draggableHeader]: mappingEnabled,
											[$style.activeHeader]: (i === activeColumn || forceShowGrip) && mappingEnabled,
											[$style.draggingHeader]: isDragging,
										}"
									>
										<span>{{ column || "&nbsp;" }}</span>
										<n8n-tooltip v-if="mappingEnabled" placement="bottom-start" :manual="true" :value="i === 0 && showHintWithDelay">
											<div v-if="focusedMappableInput" slot="content" v-html="$locale.baseText('dataMapping.tableHint', { interpolate: { name: focusedMappableInput } })"></div>
											<div v-else slot="content" v-html="$locale.baseText('dataMapping.dragColumnToFieldHint')"></div>
											<div :class="$style.dragButton">
												<font-awesome-icon icon="grip-vertical" />
											</div>
										</n8n-tooltip>
									</div>
								</template>
							</Draggable>
						</n8n-tooltip>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, index1) in tableData.data" :key="index1">
					<td
						v-for="(data, index2) in row"
						:key="index2"
						:data-col="index2"
						@mouseenter="onMouseEnterCell"
						@mouseleave="onMouseLeaveCell"
					>{{ [null, undefined].includes(data) ? '&nbsp;' : data }}</td>
				</tr>
			</tbody>
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
		};
	},
	mounted() {
		if (this.showMappingHint && this.showHint) {
			setTimeout(() => {
				this.showHintWithDelay = this.showHint;
				this.$telemetry.track('User viewed data mapping tooltip', { type: 'param focus' });
			}, 500);
		}
	},
	computed: {
		focusedMappableInput (): string {
			return this.$store.getters['ui/focusedMappableInput'];
		},
		showHint (): boolean {
			return !this.draggedColumn && (this.showMappingHint || (!!this.focusedMappableInput && window.localStorage.getItem(LOCAL_STORAGE_MAPPING_FLAG) !== 'true'));
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
		getExpression(column: string) {
			if (!this.node) {
				return '';
			}

			if (this.distanceFromActive === 1) {
				return `{{ $json["${column}"] }}`;
			}

			return `{{ $node["${this.node.name}"].json["${column}"] }}`;
		},
		onDragStart() {
			this.draggedColumn = true;

			this.$store.commit('ui/resetMappingTelemetry');
		},
		onDragEnd(column: string) {
			setTimeout(() => {
				const mappingTelemetry = this.$store.getters['ui/mappingTelemetry'];
				this.$telemetry.track('User dragged data for mapping', {
					src_node_type: this.node.type,
					src_field_name: column,
					src_nodes_back: this.distanceFromActive,
					src_run_index: this.runIndex,
					src_runs_total: this.totalRuns,
					src_view: 'table',
					src_element: 'column',
					success: false,
					...mappingTelemetry,
				});
			}, 1000); // ensure dest data gets set if drop
		},
	},
	watch: {
		focusedMappableInput (curr: boolean) {
			setTimeout(() => {
				this.forceShowGrip = !!this.focusedMappableInput;
			}, curr? 300: 150);
		},
		showHint (curr: boolean, prev: boolean) {
			if (curr) {
				setTimeout(() => {
					this.showHintWithDelay = this.showHint;
					if (this.showHintWithDelay) {
						this.$telemetry.track('User viewed data mapping tooltip', { type: 'param focus' });
					}
				}, 1000);
			}
			else {
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
	width: calc(100% - var(--spacing-s));
	margin-right: var(--spacing-s);
	font-size: var(--font-size-s);

	th {
		background-color: var(--color-background-base);
		border-top: var(--border-base);
		border-bottom: var(--border-base);
		border-left: var(--border-base);
		position: sticky;
		top: 0;
		max-width: 300px;
	}

	td {
		padding: var(--spacing-2xs);
		border-bottom: var(--border-base);
		border-left: var(--border-base);
		overflow-wrap: break-word;
		max-width: 300px;
		white-space: pre-wrap;
	}

	th:last-child,
	td:last-child {
		border-right: var(--border-base);
	}
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
</style>
