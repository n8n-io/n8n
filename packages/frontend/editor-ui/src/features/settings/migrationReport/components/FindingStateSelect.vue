<script setup lang="ts">
import type { MigrationFindingTriageStatus } from '@n8n/api-types';
import { N8nSelect2, N8nText } from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

defineOptions({ name: 'FindingStateSelect' });

interface StateSelectItem extends SelectOptionBase<MigrationFindingTriageStatus> {
	description: string;
}

const modelValue = defineModel<MigrationFindingTriageStatus>({ required: true });

const { disabled = false } = defineProps<{ disabled?: boolean }>();

const i18n = useI18n();

const stateOptions = computed<StateSelectItem[]>(() => [
	{
		value: 'open',
		label: i18n.baseText('settings.migrationReport.detail.state.open'),
		description: i18n.baseText('settings.migrationReport.detail.state.open.description'),
	},
	{
		value: 'wont_fix',
		label: i18n.baseText('settings.migrationReport.detail.state.wontFix'),
		description: i18n.baseText('settings.migrationReport.detail.state.wontFix.description'),
	},
]);

function findOption(value: SelectValue | undefined) {
	return stateOptions.value.find((option) => option.value === value);
}

function onSelect(value: SelectValue | undefined) {
	const option = findOption(value);
	if (option) {
		modelValue.value = option.value;
	}
}
</script>

<template>
	<N8nSelect2
		:items="stateOptions"
		:model-value="modelValue"
		:disabled="disabled"
		size="small"
		:aria-label="i18n.baseText('settings.migrationReport.detail.table.state')"
		data-test-id="migration-finding-state-select"
		@update:model-value="onSelect"
	>
		<template #item-label="{ item }">
			<span :class="$style.itemStack">
				<N8nText tag="span" size="medium">{{ item.label }}</N8nText>
				<N8nText tag="span" size="small" color="text-base">
					{{ findOption(item.value)?.description }}
				</N8nText>
			</span>
		</template>
	</N8nSelect2>
</template>

<style module lang="scss">
.itemStack {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}
</style>
