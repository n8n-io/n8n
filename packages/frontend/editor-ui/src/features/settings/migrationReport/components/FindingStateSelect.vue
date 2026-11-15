<script setup lang="ts">
import type { MigrationFindingListedStatus, MigrationFindingTriageStatus } from '@n8n/api-types';
import { N8nSelect2, N8nText } from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

defineOptions({ name: 'FindingStateSelect' });

interface StateSelectItem extends SelectOptionBase<MigrationFindingListedStatus> {
	description: string;
}

// The value can be any listed state, but a user picks only a triage state. A
// notification sets the notified state and the scan sets the fixed unpublished
// state, so each shows, disabled, only while it is current.
const props = defineProps<{ modelValue: MigrationFindingListedStatus; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: MigrationFindingTriageStatus] }>();

const i18n = useI18n();

const stateOptions = computed<StateSelectItem[]>(() => [
	{
		value: 'open',
		label: i18n.baseText('settings.migrationReport.detail.state.open'),
		description: i18n.baseText('settings.migrationReport.detail.state.open.description'),
	},
	...(props.modelValue === 'notified'
		? [
				{
					value: 'notified' as const,
					label: i18n.baseText('settings.migrationReport.detail.state.notified'),
					description: i18n.baseText('settings.migrationReport.detail.state.notified.description'),
					disabled: true,
				},
			]
		: []),
	...(props.modelValue === 'fixed_unpublished'
		? [
				{
					value: 'fixed_unpublished' as const,
					label: i18n.baseText('settings.migrationReport.detail.state.fixedUnpublished'),
					description: i18n.baseText(
						'settings.migrationReport.detail.state.fixedUnpublished.description',
					),
					disabled: true,
				},
			]
		: []),
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
	if (option && (option.value === 'open' || option.value === 'wont_fix')) {
		emit('update:modelValue', option.value);
	}
}
</script>

<template>
	<N8nSelect2
		:items="stateOptions"
		:model-value="modelValue"
		:disabled="disabled ?? false"
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
