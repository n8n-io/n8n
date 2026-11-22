<script setup lang="ts">
import { N8nButton, N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { createEntry } from '../draftMapping';
import type { EditableEntry } from '../wizard.types';

defineProps<{ label: string; testId: string }>();

const entries = defineModel<EditableEntry[]>({ required: true });

const i18n = useI18n();

function patch(id: string, change: Partial<Omit<EditableEntry, 'id'>>) {
	entries.value = entries.value.map((entry) => (entry.id === id ? { ...entry, ...change } : entry));
}

function remove(id: string) {
	entries.value = entries.value.filter((entry) => entry.id !== id);
}

function add() {
	entries.value = [...entries.value, createEntry()];
}
</script>

<template>
	<N8nInputLabel :label="label" color="text-dark">
		<div :class="$style.list" :data-test-id="testId">
			<div v-for="entry in entries" :key="entry.id" :class="$style.row">
				<N8nInput
					:model-value="entry.key"
					:placeholder="i18n.baseText('customNodes.wizard.request.entry.key')"
					:aria-label="i18n.baseText('customNodes.wizard.request.entry.key')"
					:data-test-id="`${testId}-key`"
					@update:model-value="patch(entry.id, { key: $event })"
				/>
				<N8nInput
					:model-value="entry.value"
					:placeholder="i18n.baseText('customNodes.wizard.request.entry.value')"
					:aria-label="i18n.baseText('customNodes.wizard.request.entry.value')"
					:data-test-id="`${testId}-value`"
					@update:model-value="patch(entry.id, { value: $event })"
				/>
				<N8nButton
					variant="ghost"
					icon="trash-2"
					icon-only
					:aria-label="i18n.baseText('customNodes.wizard.request.entry.remove')"
					:data-test-id="`${testId}-remove`"
					@click="remove(entry.id)"
				/>
			</div>
			<div>
				<N8nButton
					variant="ghost"
					icon="plus"
					size="small"
					:label="i18n.baseText('customNodes.wizard.request.entry.add')"
					:data-test-id="`${testId}-add`"
					@click="add"
				/>
			</div>
		</div>
	</N8nInputLabel>
</template>

<style module lang="scss">
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: grid;
	grid-template-columns: 1fr 1fr auto;
	gap: var(--spacing--2xs);
	align-items: center;
}
</style>
