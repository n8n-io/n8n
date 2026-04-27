<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

type Row = Record<string, unknown>;

const props = defineProps<{
	modelValue: Row[];
}>();

const emit = defineEmits<{
	'update:modelValue': [value: Row[]];
}>();

const i18n = useI18n();

// Column headers are the union of keys across all rows.
const columns = computed(() => {
	const seen = new Set<string>();
	for (const row of props.modelValue) {
		for (const key of Object.keys(row)) seen.add(key);
	}
	return [...seen];
});

const rows = computed(() => props.modelValue);

function setCell(rowIndex: number, key: string, value: string) {
	const next = props.modelValue.map((row, idx) =>
		idx === rowIndex ? { ...row, [key]: value } : row,
	);
	emit('update:modelValue', next);
}

function addRow() {
	const blank: Row = Object.fromEntries(columns.value.map((c) => [c, '']));
	emit('update:modelValue', [...props.modelValue, blank]);
}

function removeRow(rowIndex: number) {
	emit(
		'update:modelValue',
		props.modelValue.filter((_, idx) => idx !== rowIndex),
	);
}

function cellValue(row: Row, key: string): string {
	const value = row[key];
	if (value === undefined || value === null) return '';
	return String(value);
}
</script>

<template>
	<div :class="$style.step">
		<N8nText size="large" tag="h3" bold>
			{{ i18n.baseText('evaluation.wizard.dataset.title') }}
		</N8nText>
		<N8nText size="small" color="text-base">
			{{ i18n.baseText('evaluation.wizard.dataset.description') }}
		</N8nText>
		<div :class="$style.tableWrap">
			<table :class="$style.table" data-test-id="eval-wizard-dataset-table">
				<thead>
					<tr>
						<th v-for="col in columns" :key="col">{{ col }}</th>
						<th />
					</tr>
				</thead>
				<tbody>
					<tr v-for="(row, rowIndex) in rows" :key="rowIndex">
						<td v-for="col in columns" :key="col">
							<N8nInput
								:model-value="cellValue(row, col)"
								size="small"
								@update:model-value="(value: string) => setCell(rowIndex, col, value)"
							/>
						</td>
						<td>
							<N8nIconButton
								variant="subtle"
								size="small"
								icon="trash-2"
								:aria-label="`Remove row ${rowIndex + 1}`"
								@click="removeRow(rowIndex)"
							/>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<N8nButton
			variant="ghost"
			size="small"
			icon="plus"
			:label="i18n.baseText('evaluation.wizard.dataset.addRow')"
			data-test-id="eval-wizard-add-row"
			@click="addRow"
		/>
	</div>
</template>

<style module lang="scss">
.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.tableWrap {
	max-height: 320px;
	overflow: auto;
	border: var(--border);
	border-radius: var(--radius);
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--xs);

	th,
	td {
		padding: var(--spacing--3xs);
		text-align: left;
		border-bottom: var(--border);
	}

	th {
		background-color: var(--color--background--shade-1);
		position: sticky;
		top: 0;
	}

	tr:last-child td {
		border-bottom: none;
	}
}
</style>
