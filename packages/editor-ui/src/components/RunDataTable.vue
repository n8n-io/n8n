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
			<tr>
				<th v-for="(column, i) in tableData.columns || []" :key="column">
					<n8n-tooltip placement="bottom-start" :disabled="!mappingEnabled || (showDraggables && actuallyShowDraggables)" :open-delay="1000">
						<div slot="content">{{ $locale.baseText('runData.dragHint') }}</div>
						<Draggable type="mapping" :data="getExpression(column)" :disabled="!mappingEnabled">
							<template v-slot:preview="{ canDrop }">
								<div :class="[$style.dragPill, canDrop ? $style.droppablePill: $style.defaultPill]">
									{{ $locale.baseText('runData.dragColumn', { interpolate: { name: shorten(column) } }) }}
								</div>
							</template>
							<template v-slot="{ isDragging }">
								<div
									:class="{
										[$style.header]: true,
										[$style.draggableHeader]: mappingEnabled,
										[$style.activeHeader]: (i === activeColumn || focusedMappableInput) && mappingEnabled,
										[$style.draggingHeader]: isDragging,
									}"
								>
									<span>{{ column || "&nbsp;" }}</span>
									<n8n-tooltip v-if="mappingEnabled" placement="bottom-start" :manual="true" :value="i === 0 && showDraggables && actuallyShowDraggables">
										<div slot="content" v-html="$locale.baseText('dataMapping.tableHint', { interpolate: { name: focusedMappableInput } })"></div>
										<div :class="$style.dragButton">
											<div>
												<div></div>
												<div></div>
											</div>
											<div>
												<div></div>
												<div></div>
											</div>
											<div>
												<div></div>
												<div></div>
											</div>
										</div>
									</n8n-tooltip>
								</div>
							</template>
						</Draggable>
					</n8n-tooltip>
				</th>
			</tr>
			<tr v-for="(row, index1) in tableData.data" :key="index1">
				<td
					v-for="(data, index2) in row"
					:key="index2"
					:data-col="index2"
					@mouseenter="onMouseEnterCell"
					@mouseleave="onMouseLeaveCell"
				>
					{{ [null, undefined].includes(data) ? '&nbsp;' : data }}
				</td>
			</tr>
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
			type: Object as () => INodeUi | null,
		},
		tableData: {
			type: Object as () => ITableData,
		},
		mappingEnabled: {
			type: Boolean,
		},
		isParentNode: {
			type: Boolean,
		},
	},
	data() {
		return {
			activeColumn: -1,
			actuallyShowDraggables: false,
		};
	},
	computed: {
		focusedMappableInput(): string {
			return this.$store.getters['ui/focusedMappableInput'];
		},
		showDraggables(): boolean {
			return !!this.focusedMappableInput && window.localStorage.getItem(LOCAL_STORAGE_MAPPING_FLAG) !== 'true';
		},
	},
	methods: {
		shorten(s: string) {
			return shorten(s, 16, 2);
		},
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

			if (this.isParentNode) {
				return `{{ $json["${column}"] }}`;
			}

			return `{{ $node["${this.node.name}"].json["${column}"] }}`;
		},
	},
	watch: {
		showDraggables(curr: boolean, prev: boolean) {
			if (curr) {
				setTimeout(() => {
					this.actuallyShowDraggables = this.showDraggables;
				}, 1000);
			}
			else {
				this.actuallyShowDraggables = false;
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

	> div {
		display: flex;
		&:not(:last-child) {
			margin-bottom: 2px;
		}

		> div {
			height: 3px;
			width: 3px;
			border-radius: 1px;
			background-color: var(--color-foreground-xdark);
			margin-right: 1px;

			&:last-child {
				margin-right: 0;
			}
		}
	}
}

.dragPill {
	padding: var(--spacing-4xs) var(--spacing-4xs) var(--spacing-3xs) var(--spacing-4xs);
	color: var(--color-text-xlight);
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	box-shadow: 0px 2px 6px rgba(68, 28, 23, 0.2);
	border-radius: var(--border-radius-base);
	transform: translate(-50%, -100%);
	white-space: nowrap;
}

.droppablePill {
	background-color: var(--color-success);
}

.defaultPill {
	background-color: var(--color-primary);
}
</style>
