<script setup lang="ts">
import { N8nButton, N8nCheckbox, N8nIcon, N8nInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { ValueRow } from '../next-nodes-instance.config';

const props = defineProps<{
	rows: readonly ValueRow[];
	/** Whether a row can take its value from an input of the action. */
	withInput: boolean;
	addLabel: string;
	testId: string;
}>();

const emit = defineEmits<{ 'update:rows': [rows: ValueRow[]] }>();

const i18n = useI18n();

const update = (index: number, change: Partial<ValueRow>) =>
	emit(
		'update:rows',
		props.rows.map((row, at) => (at === index ? { ...row, ...change } : row)),
	);

const add = () => emit('update:rows', [...props.rows, { key: '', value: '', fromInput: false }]);

const remove = (index: number) =>
	emit(
		'update:rows',
		props.rows.filter((_, at) => at !== index),
	);
</script>

<template>
	<div :class="$style.rows" :data-test-id="testId">
		<div v-for="(row, index) in rows" :key="index" :class="$style.row">
			<N8nInput
				:model-value="row.key"
				:placeholder="i18n.baseText('settings.nodes.form.row.key')"
				:aria-label="i18n.baseText('settings.nodes.form.row.key')"
				size="small"
				@update:model-value="update(index, { key: $event })"
			/>
			<N8nInput
				:model-value="row.value"
				:placeholder="i18n.baseText('settings.nodes.form.row.value')"
				:aria-label="i18n.baseText('settings.nodes.form.row.value')"
				:disabled="row.fromInput"
				size="small"
				@update:model-value="update(index, { value: $event })"
			/>
			<N8nCheckbox
				v-if="withInput"
				:model-value="row.fromInput"
				:label="i18n.baseText('settings.nodes.form.row.fromInput')"
				@update:model-value="update(index, { fromInput: $event })"
			/>
			<N8nButton
				variant="ghost"
				size="small"
				icon-only
				:aria-label="i18n.baseText('settings.nodes.form.row.remove')"
				@click="remove(index)"
			>
				<template #icon><N8nIcon icon="trash-2" /></template>
			</N8nButton>
		</div>
		<div>
			<N8nButton variant="subtle" size="small" @click="add">
				<template #icon><N8nIcon icon="plus" /></template>
				{{ addLabel }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: grid;
	grid-template-columns: 1fr 1fr auto auto;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
