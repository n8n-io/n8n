<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import RcTextSoft from '../motion/RcTextSoft.vue';
import type { RecordsCardData } from '../ResultCard.types';
import { stagger } from '../utils';

/**
 * Records: a compact table of the rows that were written or read, with the
 * target and operation as a quiet line above it.
 */
const props = defineProps<{ card: RecordsCardData; animated: boolean }>();
const { t } = useI18n();

const MAX_ROWS = 3;
const shownRows = computed(() => props.card.rows.slice(0, MAX_ROWS));
const remaining = computed(() => Math.max(0, props.card.total - shownRows.value.length));
const summary = computed(() => `${props.card.operation} · ${props.card.target}`);
</script>

<template>
	<div :class="$style.records" data-test-id="result-card-records">
		<p :class="[$style.summary, $style.reveal]" style="--rc-delay: 0.05s">
			<RcTextSoft :text="summary" />
		</p>
		<div :class="[$style.sheet, $style.reveal]" style="--rc-delay: 0.15s">
			<table :class="$style.table">
				<thead>
					<tr>
						<th v-for="(column, index) in card.columns" :key="index" scope="col">{{ column }}</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(row, rowIndex) in shownRows"
						:key="rowIndex"
						:class="$style.row"
						:style="{ '--rc-delay': stagger(rowIndex, 0.3, 0.07) }"
					>
						<td v-for="(_, columnIndex) in card.columns" :key="columnIndex">
							{{ row[columnIndex] ?? '' }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p v-if="remaining > 0" :class="[$style.more, $style.chrome]" style="--rc-delay: 0.6s">
			{{ t('resultCard.more', { count: String(remaining) }) }}
		</p>
	</div>
</template>

<style lang="scss" module>
.records {
	display: flex;
	flex-direction: column;
	padding: 4px 24px 0;
}
.summary {
	margin: 0 0 8px;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	text-transform: capitalize;
}
.sheet {
	padding: 2px 10px 4px;
	border-radius: 12px;
	background: var(--rc-chip);
}
.table {
	width: 100%;
	table-layout: fixed;
	border-collapse: collapse;
	font-size: 12px;
	line-height: 16px;
	/* the leading column is usually a name; give it room before the others share the rest */
	th:first-child {
		width: 34%;
	}
	th,
	td {
		padding: 7px 2px;
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	th {
		font-weight: 400;
		color: var(--rc-muted);
		border-bottom: 1px solid var(--rc-divider);
	}
	td {
		color: var(--rc-fg);
		border-bottom: 1px solid var(--rc-divider);
	}
	tr:last-child td {
		border-bottom: 0;
	}
	td:first-child {
		font-weight: 500;
	}
}
.more {
	margin: 6px 0 0;
	text-align: right;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
}

/* entrance */
@keyframes rc-pop {
	from {
		opacity: 0;
		transform: translateY(8px);
		filter: blur(4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
		filter: blur(0);
	}
}
@keyframes rc-fade {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
.reveal,
.chrome,
.row {
	opacity: 1;
}
:global(.rc-animated) .reveal {
	animation: rc-pop var(--rc-enter-dur, 500ms) var(--rc-ease-smooth-out) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .row,
:global(.rc-animated) .chrome {
	animation: rc-fade var(--rc-enter-dur, 500ms) var(--rc-ease-smooth-out) both;
	animation-delay: var(--rc-delay, 0s);
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal,
	:global(.rc-animated) .row,
	:global(.rc-animated) .chrome {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
}
</style>
