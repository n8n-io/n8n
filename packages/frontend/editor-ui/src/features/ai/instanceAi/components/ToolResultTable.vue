<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	rows: Array<Record<string, unknown>>;
}>();

const i18n = useI18n();
const MAX_ROWS = 20;

const headers = computed(() => {
	if (props.rows.length === 0) return [];
	return Object.keys(props.rows[0]);
});

const displayRows = computed(() => props.rows.slice(0, MAX_ROWS));
const hasMore = computed(() => props.rows.length > MAX_ROWS);

function formatCell(value: unknown): string {
	if (value === null || value === undefined) return '\u2014';
	if (typeof value === 'boolean') return value ? 'Yes' : 'No';
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}
</script>

<template>
	<div :class="$style.wrapper">
		<table :class="$style.table">
			<thead>
				<tr>
					<th v-for="header in headers" :key="header" :class="$style.th">
						{{ header }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, idx) in displayRows" :key="idx" :class="$style.tr">
					<td v-for="header in headers" :key="header" :class="$style.td">
						{{ formatCell(row[header]) }}
					</td>
				</tr>
			</tbody>
		</table>
		<div v-if="hasMore" :class="$style.more">
			{{
				i18n.baseText('instanceAi.toolResult.moreRows', {
					interpolate: { count: String(props.rows.length - MAX_ROWS) },
				})
			}}
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	overflow-x: auto;
	max-height: 300px;
	overflow-y: auto;
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--3xs);
	font-family: monospace;
}

.th {
	text-align: left;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	border-bottom: var(--border);
	white-space: nowrap;
	position: sticky;
	top: 0;
	background: var(--color--background);
}

.tr {
	&:nth-child(even) {
		background: var(--color--background--shade-1);
	}
}

.td {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	color: var(--color--text--tint-1);
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.more {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	font-style: italic;
	text-align: center;
	border-top: var(--border);
}
</style>
