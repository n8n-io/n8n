<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import type { RecordsCardData, ResultCardSkin } from '../ResultCard.types';

const props = defineProps<{ card: RecordsCardData; skin: ResultCardSkin }>();
const { t } = useI18n();

const MAX_ROWS = 5;
const isGrid = computed(() => props.skin.grammar === 'grid');
const shownRows = computed(() => props.card.rows.slice(0, MAX_ROWS));
const remaining = computed(() => Math.max(0, props.card.total - shownRows.value.length));
</script>

<template>
	<div :class="[$style.records, { [$style.grid]: isGrid }]">
		<table :class="$style.table">
			<thead>
				<tr>
					<th v-if="isGrid" :class="$style.corner" scope="col"></th>
					<th v-for="(column, index) in card.columns" :key="index" scope="col">
						<span v-if="isGrid" :class="$style.letter">{{ String.fromCharCode(65 + index) }}</span>
						{{ column }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, rowIndex) in shownRows" :key="rowIndex">
					<th v-if="isGrid" :class="$style.rowNumber" scope="row">{{ rowIndex + 1 }}</th>
					<td v-for="(_, columnIndex) in card.columns" :key="columnIndex">
						{{ row[columnIndex] ?? '' }}
					</td>
				</tr>
			</tbody>
		</table>
		<p v-if="remaining > 0" :class="$style.more">
			{{ t('resultCard.more', { count: String(remaining) }) }}
		</p>
	</div>
</template>

<style lang="scss" module>
.records {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	overflow: hidden;
}

.table {
	width: 100%;
	table-layout: fixed;
	border-collapse: collapse;
	font-size: var(--font-size--2xs);

	th,
	td {
		padding: var(--spacing--5xs) var(--spacing--3xs);
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	th {
		font-weight: var(--font-weight--medium);
		color: var(--text-color--subtle);
		border-bottom: 1px solid var(--border-color);
	}

	td {
		border-bottom: 1px solid var(--border-color--subtle);
	}
}

.grid .table {
	th {
		background: var(--result-card--accent-soft);
		color: var(--text-color);
	}

	th,
	td {
		border: 1px solid var(--border-color--subtle);
	}

	// Row numbers are `<th scope="row">` for a11y but stay visually quiet like the corner cell.
	.rowNumber {
		font-weight: var(--font-weight--regular);
		color: var(--text-color--subtler);
	}
}

.letter {
	display: inline-block;
	margin-right: var(--spacing--4xs);
	font-size: var(--font-size--4xs);
	font-weight: var(--font-weight--regular);
	color: var(--text-color--subtler);
}

.corner,
.rowNumber {
	width: 1.6em;
	text-align: center;
	color: var(--text-color--subtler);
	font-size: var(--font-size--4xs);
}

.more {
	margin: 0;
	font-size: var(--font-size--3xs);
	color: var(--text-color--subtler);
}
</style>
