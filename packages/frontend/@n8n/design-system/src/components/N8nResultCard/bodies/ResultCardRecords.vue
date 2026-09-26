<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import type { RecordsCardData } from '../ResultCard.types';
import { stagger } from '../utils';

const props = defineProps<{ card: RecordsCardData; light: boolean; animated: boolean }>();
const { t } = useI18n();

const MAX_ROWS = 3;
const shownRows = computed(() => props.card.rows.slice(0, MAX_ROWS));
const remaining = computed(() => Math.max(0, props.card.total - shownRows.value.length));
</script>

<template>
	<div :class="[$style.sheet, $style.reveal]" style="--rc-delay: 0.25s">
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
					:style="{ '--rc-delay': stagger(rowIndex, 0.4, 0.09) }"
				>
					<td v-for="(_, columnIndex) in card.columns" :key="columnIndex">
						{{ row[columnIndex] ?? '' }}
					</td>
				</tr>
			</tbody>
		</table>
		<p v-if="remaining > 0" :class="[$style.more, $style.chrome]" style="--rc-delay: 0.8s">
			{{ t('resultCard.more', { count: String(remaining) }) }}
		</p>
	</div>
</template>

<style lang="scss" module>
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

.sheet {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--2xs);
	border-radius: var(--rc-radius-inner);
	background: var(--rc-panel);
}
.table {
	width: 100%;
	table-layout: fixed;
	border-collapse: collapse;
	font-size: var(--font-size--2xs);
	/* the leading column is usually a name; give it room before the others share the rest */
	th:first-child {
		width: 32%;
	}
	th,
	td {
		padding: 7px var(--spacing--3xs);
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	th {
		font-size: var(--font-size--4xs);
		font-weight: var(--font-weight--medium);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--rc-ink-muted);
		border-bottom: 1px solid var(--rc-hairline);
	}
	td {
		color: var(--rc-ink);
		border-bottom: 1px solid var(--rc-hairline);
	}
	tr:last-child td {
		border-bottom: 0;
	}
	td:first-child {
		font-weight: var(--font-weight--medium);
	}
}
.more {
	margin: var(--spacing--3xs) 0 0;
	text-align: right;
	font-size: var(--font-size--3xs);
	color: var(--rc-ink-muted);
}

.reveal,
.chrome,
.row {
	opacity: 1;
}
:global(.rc-animated) .reveal {
	animation: rc-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .row {
	animation: rc-fade 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .chrome {
	animation: rc-fade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
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
