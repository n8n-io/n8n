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
					<n8n-tooltip placement="bottom-start" :open-delay="1000" :disabled="!mappingEnabled">
						<div slot="content">{{ $locale.baseText('runData.dragHint') }}</div>
						<div :class="{[$style.header]: true, [$style.draggableHeader]: mappingEnabled, [$style.activeHeader]: i === activeColumn && mappingEnabled}">
							<span>{{ column }}</span>
							<div v-if="mappingEnabled" :class="$style.dragButton">
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
						</div>
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
import { ITableData } from '@/Interface';
import Vue from 'vue';

export default Vue.extend({
	name: 'RunDataTable',
	props: {
		tableData: {
			type: Object as () => ITableData,
		},
		mappingEnabled: {
			type: Boolean,
		},
	},
	data() {
		return {
			activeColumn: -1,
		};
	},
	methods: {
		onMouseEnterCell(e: MouseEvent) {
			const target = e.target;
			if (target && this.mappingEnabled) {
				const col = (target as HTMLElement).dataset.col;
				if (col && !isNaN(parseInt(col))) {
					this.activeColumn = parseInt(col);
				}
			}
		},
		onMouseLeaveCell() {
			this.activeColumn = -1;
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
</style>
